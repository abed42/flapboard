"use client";

import { useEffect, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import {
  hasSoundPreference,
  isSoundEnabled,
  openGate,
  setSoundPreference,
  tryAutoUnlock,
} from "@/lib/flap-sound";

/**
 * Boards wait for this gate before running their cascade.
 *
 * Audio cannot start without a user gesture in the current page load, and no
 * API persists that permission across a refresh — so rather than asking every
 * time, try to start silently first and only fall back to a click when the
 * browser actually refuses. Chrome stops refusing once the site accumulates
 * enough Media Engagement, and never refuses under
 * --autoplay-policy=no-user-gesture-required, so on a kiosk this screen
 * disappears for good.
 */
type Phase = "deciding" | "prompt" | "open";

export function BoardGate() {
  // Starts covered — deciding whether audio can autostart takes a moment, and
  // rendering nothing until then lets the board flash behind the gate. Matches
  // the server render, so hydration stays clean.
  const [phase, setPhase] = useState<Phase>("deciding");

  useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      // Never asked, or explicitly muted: nothing to unlock, so don't block.
      if (!hasSoundPreference()) {
        if (!cancelled) setPhase("prompt");
        return;
      }
      if (!isSoundEnabled()) {
        if (!cancelled) setPhase("open");
        openGate();
        return;
      }

      const unlocked = await tryAutoUnlock();
      if (cancelled) return;

      if (unlocked) {
        setPhase("open");
        openGate();
        return;
      }
      setPhase("prompt");
    };

    void decide();

    return () => {
      cancelled = true;
    };
  }, []);

  const enter = (withSound: boolean) => {
    setSoundPreference(withSound);
    setPhase("open");
    openGate();
  };

  // A keydown counts as a user gesture just like a click, so this unlocks audio
  // the same way. Bound to the window rather than relying on button focus so it
  // works no matter where focus happens to sit.
  useEffect(() => {
    if (phase !== "prompt") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      enter(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  if (phase === "open") return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[#0A0A0A]">
      {phase === "prompt" && (
        <>
          <button
            type="button"
            onClick={() => enter(true)}
            className="rounded-md border-2 border-white/25 bg-neutral-900 px-14 py-5 font-mono text-2xl font-bold tracking-[0.35em] text-white shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] transition hover:border-white/50 hover:bg-neutral-800"
          >
            ENTER
          </button>
          <button
            type="button"
            onClick={() => enter(false)}
            className="font-mono text-xs tracking-widest text-white/40 transition hover:text-white/70"
          >
            ENTER WITHOUT SOUND
          </button>
          <kbd
            aria-label="Press Enter"
            className="inline-flex h-9 min-w-[3.25rem] items-center justify-center gap-1 rounded-md border border-white/20 border-b-2 border-b-white/30 bg-neutral-900 px-2 text-white/40 shadow-[0_2px_0_rgba(0,0,0,0.6)]"
          >
            <CornerDownLeft size={16} strokeWidth={2.25} />
          </kbd>
        </>
      )}
    </div>
  );
}
