"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { Check, Share2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const QUOTES = [
  "New year, new possibilities ✨",
  "Every moment is a fresh beginning 🌟",
  "The best is yet to come 🚀",
  "Make it a year to remember 💫",
  "Dream big, start now 🎯",
  "Your story continues... 📖",
  "Cheers to new adventures! 🥂",
];
import Confetti from "./Confetti";
import CountdownDigit from "./CountdownDigit";
import Fireworks from "./Fireworks";
import ShootingStar from "./ShootingStar";
import Starfield from "./Starfield";

/**
 * Main client-side orchestrator for the NYE Countdown experience.
 * The most EPIC countdown ever created - CPU efficient!
 */
export default function NYECountdownClient() {
  const targetDate = useMemo(() => new Date("2026-01-01T00:00:00"), []);
  const { days, hours, minutes, seconds, isComplete } = useCountdown(targetDate);

  const [hasStarted, setHasStarted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate if we're in the final countdown (last 60 seconds)
  const isFinalCountdown = days === 0 && hours === 0 && minutes === 0 && seconds <= 60;
  const isLastTenSeconds = isFinalCountdown && seconds <= 10 && seconds > 0;

  // Calculate year progress (how much of 2025 has passed)
  const yearProgress = useMemo(() => {
    const startOf2025 = new Date("2025-01-01T00:00:00").getTime();
    const endOf2025 = new Date("2026-01-01T00:00:00").getTime();
    const now = Date.now();
    const progress = ((now - startOf2025) / (endOf2025 - startOf2025)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [seconds]); // Update when seconds change

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
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Layer */}
      <Starfield />
      <ShootingStar />

      {/* Ambient glow orbs - GPU accelerated, very subtle */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-float-slow-reverse" />
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 hover:scale-110"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted
            ? <VolumeX className="h-5 w-5 text-cyan-400" />
            : <Volume2 className="h-5 w-5 text-cyan-400" />}
        </button>
        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 hover:scale-110"
          title="Share"
        >
          {isCopied
            ? <Check className="h-5 w-5 text-green-400" />
            : <Share2 className="h-5 w-5 text-cyan-400" />}
        </button>
      </div>

      {/* Content Layer */}
      <div className="z-10 flex flex-col items-center gap-8 text-center">
        {!isComplete
          ? (
            <>
              {/* Epic animated title */}
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
                <h1 className="text-2xl font-black tracking-[0.3em] bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent sm:text-3xl md:text-5xl animate-gradient-x">
                  2026 COUNTDOWN
                </h1>
                <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
              </div>

              {/* Subtitle with heartbeat indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    hours < 1
                      ? "bg-red-500 animate-ping"
                      : hours < 3
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-cyan-500 animate-pulse"
                  }`}
                />
                <p className="text-cyan-300/60 tracking-[0.2em] text-xs sm:text-sm uppercase">
                  The Most Epic New Year&apos;s Eve Ever
                </p>
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    hours < 1
                      ? "bg-red-500 animate-ping"
                      : hours < 3
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-cyan-500 animate-pulse"
                  }`}
                />
              </div>

              {/* Countdown digits with glow container */}
              <div
                className={`relative p-8 rounded-3xl transition-all duration-500 ${
                  isLastTenSeconds ? "bg-red-500/10 border border-red-500/30" : ""
                }`}
              >
                {/* Glow effect behind digits */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 rounded-3xl blur-xl" />

                <div className="relative flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10">
                  <CountdownDigit value={days} label="DAYS" />
                  <div className="flex items-center text-cyan-400/40 text-4xl font-thin self-start mt-8">
                    :
                  </div>
                  <CountdownDigit value={hours} label="HOURS" />
                  <div className="flex items-center text-cyan-400/40 text-4xl font-thin self-start mt-8">
                    :
                  </div>
                  <CountdownDigit value={minutes} label="MINUTES" />
                  <div className="flex items-center text-cyan-400/40 text-4xl font-thin self-start mt-8">
                    :
                  </div>
                  <CountdownDigit value={seconds} label="SECONDS" highlight={isLastTenSeconds} />
                </div>
              </div>

              {/* Year Progress Bar */}
              <div className="w-full max-w-md mt-4">
                <div className="flex justify-between text-xs text-cyan-300/50 mb-2">
                  <span>2025</span>
                  <span
                    className={`font-bold ${
                      yearProgress > 99.9 ? "text-yellow-400 animate-pulse" : "text-cyan-400"
                    }`}
                  >
                    {yearProgress.toFixed(4)}% complete
                  </span>
                  <span>2026</span>
                </div>
                <div
                  className={`h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm ${
                    yearProgress > 99.9 ? "shadow-[0_0_20px_rgba(234,179,8,0.4)]" : ""
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      yearProgress > 99.9
                        ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse"
                        : "bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
                    }`}
                    style={{ width: `${yearProgress}%` }}
                  />
                </div>
                {yearProgress > 99.9 && (
                  <p className="text-center text-yellow-400/80 text-xs mt-2 animate-pulse">
                    🔥 FINAL STRETCH! 🔥
                  </p>
                )}
              </div>

              {/* Final countdown message */}
              {isLastTenSeconds && (
                <p className="text-2xl font-bold text-red-400 animate-pulse tracking-wider">
                  🎆 GET READY! 🎆
                </p>
              )}

              {/* Dynamic message based on time */}
              {!isFinalCountdown && (
                <p className="mt-4 max-w-md text-sm leading-relaxed text-cyan-300/50 sm:text-base">
                  {hours < 1
                    ? "🔥 Less than an hour! The excitement is building! 🔥"
                    : hours < 3
                    ? "⚡ Almost there! 2026 is just hours away! ⚡"
                    : "✨ Click anywhere for a spark of magic ✨"}
                </p>
              )}

              {/* Rotating inspirational quote */}
              <p className="text-white/30 text-xs italic transition-opacity duration-500">
                &ldquo;{QUOTES[quoteIndex]}&rdquo;
              </p>
            </>
          )
          : (
            <div className="animate-banner-appear flex flex-col items-center gap-8">
              {/* Epic celebration banner */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 blur-2xl opacity-50 animate-pulse" />
                <div className="relative rounded-2xl border-4 border-yellow-400/50 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 px-8 py-6 shadow-[0_0_80px_rgba(234,179,8,0.5)] sm:px-16 sm:py-8">
                  <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:text-6xl md:text-8xl">
                    🎉 2026 🎉
                  </h1>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-yellow-400 tracking-widest sm:text-4xl animate-bounce">
                HAPPY NEW YEAR!
              </h2>

              <p className="max-w-md text-lg text-white/80 sm:text-xl">
                🌟 The future is NOW! Welcome to 2026! 🌟
              </p>

              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border-2 border-yellow-400/50 bg-yellow-400/20 px-8 py-3 text-sm font-bold text-yellow-400 backdrop-blur-md transition-all hover:bg-yellow-400/30 hover:scale-105"
              >
                🔄 Relive the Magic
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
