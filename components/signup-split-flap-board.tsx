"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { FlapDisplay } from "react-split-flap-effect";
import { createClient } from "@/lib/supabase/client";

type SignupSplitFlapBoardProps = {
  count: number;
};

export function SignupSplitFlapBoard({ count }: SignupSplitFlapBoardProps) {
  const [liveCount, setLiveCount] = useState(count);
  const confettiFrameRef = useRef<number | null>(null);
  const confettiRunningRef = useRef(false);
  const emojiRotationRef = useRef(0);
  const signupSoundRef = useRef<HTMLAudioElement | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const value = String(liveCount);
  const length = Math.max(7, value.length);
  const title = "SIGNUPS";
  const footer = "LIVE USER COUNT";
  const textChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
    <div className="relative h-full w-full overflow-x-auto rounded-xl bg-[#0A0A0A] p-4 shadow-sm md:p-6">
      <div className="flex h-full w-max min-w-full flex-col items-center justify-center gap-3 text-center">
        <FlapDisplay
          className="demoFlapper L"
          chars={textChars}
          length={title.length}
          padChar=" "
          value={title}
        />
        <div className="flex items-center justify-center">
          <FlapDisplay
            className="demoFlapper XL"
            chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            length={length}
            padChar="0"
            padMode="start"
            timing={12}
            value={value}
          />
        </div>
        <FlapDisplay
          className="demoFlapper L"
          chars={textChars}
          length={footer.length}
          padChar=" "
          value={footer}
        />
      </div>
    </div>
  );
}
