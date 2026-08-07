"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";
import {
  GATE_DISMISSED_EVENT,
  isGateOpen,
  isSoundEnabled,
  preloadFlapSound,
} from "@/lib/flap-sound";
import { createClient } from "@/lib/supabase/client";

/** How long the board sits on the count before the quote flips in. */
const QUOTE_DELAY_MS = 12_000;

/**
 * Row layout is fixed at 8 lines so grid rows never shift when the quote
 * appears: gap, title, gap, count, gap, footer, gap, quote. Only the count is
 * enlarged — much past this and the glyphs outgrow their cells.
 */
const ROW_FONT_SCALES = [1, 1, 1, 1.5, 1, 1, 1, 1];

type SignupSplitFlapBoardProps = {
  count: number;
};

export function SignupSplitFlapBoard({ count }: SignupSplitFlapBoardProps) {
  const [liveCount, setLiveCount] = useState(count);
  const [showQuote, setShowQuote] = useState(false);
  const [ready, setReady] = useState(false);
  const confettiFrameRef = useRef<number | null>(null);
  const confettiRunningRef = useRef(false);
  const emojiRotationRef = useRef(0);
  const signupSoundRef = useRef<HTMLAudioElement | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const value = String(liveCount).padStart(7, "0");
  const title = "SIGNUPS";
  const footer = "LIVE USER COUNT";
  // 24 chars — the longest line, and what the 26-col board is sized around
  // so it lands on one row with a blank column either side.
  const quote = "STAY HUNGRY STAY FOOLISH";
  const emojiSet = ["🦞", "💃", "🍆", "🍑", "🍒"] as const;
  const launchConfetti = () => {
    if (confettiRunningRef.current) {
      return;
    }

    confettiRunningRef.current = true;
    const end = Date.now() + 3 * 1000;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) {
        confettiRunningRef.current = false;
        confettiFrameRef.current = null;
        return;
      }

      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });

      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });

      confettiFrameRef.current = requestAnimationFrame(frame);
    };

    frame();
  };

  const playSignupSound = () => {
    if (window.localStorage.getItem("signup_sound_muted") === "true") {
      return;
    }

    const audio = signupSoundRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Playback can be blocked by browser autoplay policy until first user interaction.
    });
  };

  const launchEmojiConfetti = () => {
    const scalar = 2;
    const start = emojiRotationRef.current;
    const rotated = emojiSet.map(
      (_, index) => emojiSet[(start + index) % emojiSet.length],
    );
    emojiRotationRef.current = (start + 1) % emojiSet.length;

    const shapes = rotated.map((emoji) => {
      const shapeFromText = (confetti as any).shapeFromText;
      return typeof shapeFromText === "function"
        ? shapeFromText({ text: emoji, scalar })
        : "circle";
    });

    const defaults = {
      spread: 360,
      ticks: 60,
      gravity: 0,
      decay: 0.96,
      startVelocity: 20,
      shapes,
      scalar,
    };

    const shoot = () => {
      confetti({
        ...defaults,
        particleCount: 30,
      });

      confetti({
        ...defaults,
        particleCount: 5,
      });

      confetti({
        ...defaults,
        particleCount: 15,
        scalar: scalar / 2,
        shapes: ["circle"],
      });
    };

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  };

  useEffect(() => {
    setLiveCount(count);
  }, [count]);

  // Hold the cascade until the sprite is decoded, otherwise the board finishes
  // flipping long before a 2.5MB download can make a sound. Returning visitors
  // start as soon as it loads; first-timers wait for the gate as well.
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      // Muted visitors have nothing to wait for — don't stall the board on a
      // download they will never hear.
      if (isSoundEnabled()) await preloadFlapSound();
      if (!cancelled) setReady(true);
    };

    // The gate may have opened before this effect ran, so check state as well
    // as subscribing — the event alone would be missed.
    if (isGateOpen()) {
      void start();
      return () => {
        cancelled = true;
      };
    }

    const onGate = () => void start();
    window.addEventListener(GATE_DISMISSED_EVENT, onGate);

    return () => {
      cancelled = true;
      window.removeEventListener(GATE_DISMISSED_EVENT, onGate);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setShowQuote(true), QUOTE_DELAY_MS);
    return () => clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    const audio = new Audio("/signup-sound.mp3");
    audio.preload = "auto";
    signupSoundRef.current = audio;

    return () => {
      audio.pause();
      signupSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const refreshCount = async () => {
      const { data, error } = await supabase.rpc("get_signup_count");
      if (error) return;

      const next = Number(data ?? 0);
      setLiveCount((prev) => {
        if (next > prev) {
          launchConfetti();
          launchEmojiConfetti();
          playSignupSound();
        }
        return next;
      });
    };

    const channel = supabase
      .channel("signup-events-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signup_events",
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    return () => {
      if (confettiFrameRef.current) {
        cancelAnimationFrame(confettiFrameRef.current);
        confettiFrameRef.current = null;
      }
      confettiRunningRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="dark relative flex h-full w-full items-center justify-center rounded-xl bg-[#0A0A0A] p-4 shadow-sm md:p-6">
      <TextFlippingBoard
        fill
        sound
        rowCount={8}
        colCount={26}
        rowFontScales={ROW_FONT_SCALES}
        text={
          ready
            ? `\n${title}\n\n${value}\n\n${footer}\n\n${showQuote ? quote : ""}`
            : ""
        }
      />
    </div>
  );
}
