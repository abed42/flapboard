/**
 * Split-flap click audio.
 *
 * Reuses the sound sprite from Aceternity's `keyboard` component: a single
 * .ogg containing every keystroke recorded back to back, sliced into
 * [startMs, durationMs] windows. The keyboard maps one slice per key code; the
 * flap board instead picks a slice at random so repeated flips don't sound
 * mechanically identical.
 *
 * Playback goes through the Web Audio API rather than <audio> elements because
 * a board flip storm fires thousands of clicks — buffer sources are cheap and
 * can overlap, whereas <audio> cannot play concurrently with itself.
 */

const SOUND_URL = "/sounds/sound.ogg";
const SOUND_MUTED_KEY = "signup_sound_muted";

/** [startMs, durationMs] slices lifted from the keyboard component's sprite map. */
const SPRITES: ReadonlyArray<readonly [number, number]> = [
  [2894, 113], [3610, 98], [4210, 90], [4758, 90], [5250, 100], [5831, 105],
  [6396, 105], [6900, 105], [7443, 111], [7955, 91], [8504, 105], [9046, 94],
  [9582, 96], [12476, 100], [12946, 96], [13470, 95], [13963, 100], [14481, 102],
  [14994, 94], [15505, 109], [15990, 97], [16529, 92], [17012, 103], [17550, 87],
  [18052, 93], [18553, 89], [19065, 110], [21734, 119], [22245, 95], [22790, 89],
  [23317, 83], [23817, 92], [24297, 92], [24811, 93], [25313, 95], [25795, 91],
  [26309, 84], [26804, 83], [27330, 85], [27883, 99], [28393, 100], [31011, 126],
  [31542, 85], [32031, 88], [32492, 85], [32973, 87], [33453, 94], [33986, 93],
  [34425, 88], [34932, 90], [35410, 95], [35914, 95], [36428, 87], [36902, 117],
  [38136, 133], [38694, 80], [39148, 76], [39632, 95], [40136, 94], [40621, 107],
  [41103, 90], [41610, 93], [42110, 92], [42594, 90], [43105, 95], [43565, 137],
  [44251, 110], [45327, 83], [45750, 82], [46199, 100], [51541, 144], [47929, 75],
  [49329, 82], [49837, 88], [50333, 90], [50783, 111],
];

/**
 * A full board repaint flips ~130 cells x ~30 scramble steps in about a second.
 * Playing every one is both unlistenable and enough concurrent buffer sources
 * to stutter the audio thread, so clicks are dropped below this spacing. The
 * result still reads as a dense mechanical clatter.
 */
const MIN_INTERVAL_MS = 22;
const GAIN = 0.28;

let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<void> | null = null;
let lastPlayedAt = 0;

function isMuted() {
  return read(SOUND_MUTED_KEY) === "true";
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Storage throws in some privacy modes; treat as "nothing stored".
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference simply won't persist; not worth failing the interaction over.
  }
}

/** Fired when the entry gate opens, so boards can start their cascade. */
export const GATE_DISMISSED_EVENT = "flap-gate-dismissed";

let gateOpen = false;

/** True once boards are cleared to run. Checked on mount to avoid a race with the event. */
export function isGateOpen() {
  return gateOpen;
}

export function openGate() {
  if (gateOpen) return;
  gateOpen = true;
  window.dispatchEvent(new Event(GATE_DISMISSED_EVENT));
}

/**
 * Try to start audio without a gesture and report whether it worked.
 *
 * Chrome grants this once a site earns enough Media Engagement, and it is
 * always granted under --autoplay-policy=no-user-gesture-required. When it is
 * refused, resume() neither throws nor settles — the promise simply stays
 * pending — so poll the state and give up rather than await it.
 */
export async function tryAutoUnlock(timeoutMs = 400): Promise<boolean> {
  const ctx = ensureContext();
  if (!ctx) return false;

  void ctx.resume();

  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    if (ctx.state === "running") return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return (ctx.state as AudioContextState) === "running";
}

/** Whether sound is currently allowed to play (the SoundToggle drives this). */
export function isSoundEnabled() {
  return !isMuted();
}

/**
 * Record the visitor's answer. Must be called from inside a real user gesture
 * when enabling, so the AudioContext can actually be resumed — browsers ignore
 * resume() outside one.
 */
export function setSoundPreference(enabled: boolean) {
  write(SOUND_MUTED_KEY, String(!enabled));
  if (!enabled) return;

  // Both of these must happen synchronously, while the gesture is still on the
  // stack — awaiting the 2.5MB download first would forfeit the activation.
  ensureContext();
  void context?.resume();
  void preloadFlapSound();
}

/**
 * Create the AudioContext without waiting on the audio download. Kept separate
 * from preloadFlapSound so a click handler can construct and resume it inline;
 * a context created during a gesture starts unlocked.
 */
function ensureContext(): AudioContext | null {
  if (context) return context;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  context = new AudioCtx();
  armGestureUnlock();
  return context;
}

/**
 * A context created outside a user gesture starts suspended, and resume() does
 * not lift that on its own. Listen for the first real interaction and unlock
 * there — this is the path for returning visitors, who never see the gate.
 */
function armGestureUnlock() {
  const events = ["pointerdown", "keydown", "touchstart"] as const;

  const unlock = () => {
    void context?.resume().then(() => {
      if (context?.state === "running") {
        events.forEach((event) => window.removeEventListener(event, unlock));
      }
    });
  };

  events.forEach((event) =>
    window.addEventListener(event, unlock, { passive: true }),
  );
}

/**
 * Fetch and decode the sprite once. Safe to call repeatedly — concurrent
 * callers share the same in-flight promise. Resolves when the board is
 * genuinely able to make noise, so callers can hold the cascade until then.
 */
export function preloadFlapSound(): Promise<void> {
  if (loading) return loading;

  loading = (async () => {
    try {
      const ctx = ensureContext();
      if (!ctx) return;

      const response = await fetch(SOUND_URL);
      if (!response.ok) {
        console.warn(`Flap sound not available (${response.status})`);
        return;
      }

      buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      console.warn("Failed to load flap sound:", error);
    }
  })();

  return loading;
}

/** Play one flap click. No-ops when muted, not yet loaded, or rate limited. */
export function playFlapClick() {
  if (!context || !buffer || isMuted()) return;

  // Chromium starts the context suspended and ignores resume() outside a user
  // gesture, so bail rather than queue sources — a suspended context does not
  // advance currentTime, and everything scheduled while suspended would fire at
  // once the moment it unlocks.
  if (context.state !== "running") return;

  const now = performance.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  const [startMs, durationMs] = SPRITES[
    Math.floor(Math.random() * SPRITES.length)
  ];

  const gain = context.createGain();
  gain.gain.value = GAIN;
  gain.connect(context.destination);

  const source = context.createBufferSource();
  source.buffer = buffer;
  // Slight detune per click so the loop doesn't sound like one repeated sample.
  source.playbackRate.value = 0.92 + Math.random() * 0.16;
  source.connect(gain);
  source.start(0, startMs / 1000, durationMs / 1000);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}

export function releaseFlapSound() {
  void context?.close();
  context = null;
  buffer = null;
  loading = null;
}
