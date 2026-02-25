"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const SOUND_MUTED_KEY = "signup_sound_muted";

export function SoundToggle() {
  const [isMuted, setIsMuted] = useState(false);

  const setMuted = (next: boolean) => {
    setIsMuted(next);
    window.localStorage.setItem(SOUND_MUTED_KEY, String(next));
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(SOUND_MUTED_KEY);
    setIsMuted(stored === "true");

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const isMuteShortcut =
        event.code === "KeyM" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey;

      if (!isMuteShortcut || isTypingContext) return;

      event.preventDefault();
      setMuted(!(window.localStorage.getItem(SOUND_MUTED_KEY) === "true"));
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const toggleMuted = () => {
    setMuted(!isMuted);
  };

  return (
    <button
      type="button"
      onClick={toggleMuted}
      className="fixed bottom-5 right-20 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur transition hover:bg-black/90"
      aria-label={isMuted ? "Unmute signup sound" : "Mute signup sound"}
      title={isMuted ? "Unmute signup sound" : "Mute signup sound"}
    >
      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
