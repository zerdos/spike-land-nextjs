"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { Check, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import Confetti from "./Confetti";
import CountdownDigit from "./CountdownDigit";
import Fireworks from "./Fireworks";
import Starfield from "./Starfield";

/**
 * Main client-side orchestrator for the NYE Countdown experience.
 * Manages the countdown state, interactive effects, and midnight transition.
 */
export default function NYECountdownClient() {
  const targetDate = new Date("2026-01-01T00:00:00");
  const { days, hours, minutes, seconds, isComplete } = useCountdown(targetDate);

  const [hasStarted, setHasStarted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setHasStarted(true);
  }, []);

  useEffect(() => {
    if (isComplete) {
      setShowCelebration(true);
    }
  }, [isComplete]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EPIC NYE Countdown 2026",
          text: "Join me in the most epic countdown to 2026!",
          url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!hasStarted) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      {/* Background Layer */}
      <Starfield />

      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted
            ? <VolumeX className="h-5 w-5 text-cyan-400" />
            : <Volume2 className="h-5 w-5 text-cyan-400" />}
        </button>
        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
          title="Share"
        >
          {isCopied
            ? <Check className="h-5 w-5 text-green-400" />
            : <Share2 className="h-5 w-5 text-cyan-400" />}
        </button>
      </div>

      {/* Content Layer */}
      <div className="z-10 flex flex-col items-center gap-12 text-center">
        {!isComplete
          ? (
            <>
              <h1 className="animate-glow-pulse text-2xl font-bold tracking-[0.4em] text-cyan-500/80 sm:text-3xl md:text-4xl">
                EPIC NYE COUNTDOWN 2026
              </h1>

              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-12">
                <CountdownDigit value={days} label="DAYS" />
                <CountdownDigit value={hours} label="HOURS" />
                <CountdownDigit value={minutes} label="MINUTES" />
                <CountdownDigit value={seconds} label="SECONDS" />
              </div>

              <p className="mt-8 max-w-lg text-sm leading-relaxed text-cyan-300/40 sm:text-base">
                Preparing for the most spectacular transition in history.
                <br />
                Click anywhere for a spark of joy.
              </p>
            </>
          )
          : (
            <div className="animate-banner-appear flex flex-col items-center gap-8">
              <div className="rounded-full border-4 border-yellow-500/50 bg-gradient-to-b from-yellow-400 to-yellow-600 px-8 py-4 shadow-[0_0_50px_rgba(234,179,8,0.4)] sm:px-12 sm:py-6">
                <h1 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg sm:text-6xl md:text-8xl">
                  HAPPY NEW YEAR 2026!
                </h1>
              </div>

              <p className="max-w-md animate-pulse text-lg font-bold text-yellow-400 sm:text-xl">
                THE FUTURE IS HERE. THE FUTURE IS BRIGHT.
              </p>

              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
              >
                Relive the Magic
              </button>
            </div>
          )}
      </div>

      {/* Interactive Layers */}
      <Confetti />
      <Fireworks isActive={showCelebration} />
    </div>
  );
}
