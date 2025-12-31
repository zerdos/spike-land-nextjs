"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { Check, Eye, Share2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const QUOTES = [
  "New year, new possibilities ✨",
  "Every moment is a fresh beginning 🌟",
  "The best is yet to come 🚀",
  "Make it a year to remember 💫",
  "Dream big, start now 🎯",
  "Your story continues... 📖",
  "Cheers to new adventures! 🥂",
  "2026: Year of infinite potential 🌈",
  "Leave the past, embrace the future 🦋",
  "New chapter loading... 📚",
];

const FUN_FACTS = [
  "🌍 Over 7 billion people will celebrate tonight!",
  "🎆 Sydney's fireworks use 8.5 tons of explosives!",
  "🔔 Times Square ball has 2,688 crystals!",
  "🌐 Tonga celebrates first, Baker Island last!",
  "🥂 500 million bottles of champagne tonight!",
  "⏰ The first NYE was celebrated 4,000 years ago!",
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
  const [factIndex, setFactIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  // Calculate countdown phases - moved here to avoid initialization order issues
  const isFinalCountdown = days === 0 && hours === 0 && minutes === 0 && seconds <= 60;
  const isLastThirtySeconds = isFinalCountdown && seconds <= 30 && seconds > 0;
  const isLastTenSeconds = isFinalCountdown && seconds <= 10 && seconds > 0;

  // Simulate viewer count (fun atmospheric effect) - surges during final countdown
  useEffect(() => {
    // Start with a random base
    const baseViewers = 1247 + Math.floor(Math.random() * 500);
    setViewerCount(baseViewers);

    // Fluctuate viewers - faster and bigger increases during final countdown
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        // Bigger surges during final moments
        if (isFinalCountdown) {
          return prev + Math.floor(Math.random() * 100) + 50; // +50 to +150
        } else if (hours === 0 && minutes < 10) {
          return prev + Math.floor(Math.random() * 30) + 10; // +10 to +40
        }
        const change = Math.floor(Math.random() * 20) - 8; // -8 to +11
        return Math.max(1000, prev + change);
      });
    }, isFinalCountdown ? 500 : 3000);

    return () => clearInterval(interval);
  }, [isFinalCountdown, hours, minutes]);

  // Rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Rotate fun facts every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update current time display and get timezone
  useEffect(() => {
    // Get timezone name
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz.replace(/_/g, " "));

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate year progress (how much of 2025 has passed)
  const yearProgress = useMemo(() => {
    const startOf2025 = new Date("2025-01-01T00:00:00").getTime();
    const endOf2025 = new Date("2026-01-01T00:00:00").getTime();
    const now = Date.now();
    const progress = ((now - startOf2025) / (endOf2025 - startOf2025)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [seconds]); // Update when seconds change

  // Calculate total seconds remaining
  const totalSecondsRemaining = useMemo(() => {
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }, [days, hours, minutes, seconds]);

  // Milestone messages for special moments
  const milestoneMessage = useMemo(() => {
    if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) return null;
    if (days === 0 && hours === 1 && minutes === 0 && seconds <= 5) return "🎯 ONE HOUR TO GO! 🎯";
    if (days === 0 && hours === 0 && minutes === 30 && seconds <= 5) return "⏰ 30 MINUTES! ⏰";
    if (days === 0 && hours === 0 && minutes === 10 && seconds <= 5) return "🔥 10 MINUTES! 🔥";
    if (days === 0 && hours === 0 && minutes === 5 && seconds <= 5) return "⚡ 5 MINUTES! ⚡";
    if (days === 0 && hours === 0 && minutes === 1 && seconds <= 5) return "🚀 ONE MINUTE! 🚀";
    return null;
  }, [days, hours, minutes, seconds]);

  // Mood emoji based on time remaining
  const moodEmoji = useMemo(() => {
    if (isComplete) return "🎉";
    if (isLastTenSeconds) return "🤯";
    if (isLastThirtySeconds) return "😱";
    if (isFinalCountdown) return "🔥";
    if (hours === 0 && minutes < 10) return "⚡";
    if (hours === 0) return "😮";
    if (hours < 3) return "😃";
    if (hours < 12) return "🙂";
    return "😊";
  }, [isComplete, isLastTenSeconds, isLastThirtySeconds, isFinalCountdown, hours, minutes]);

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
      {/* Intensifying border glow for final countdown */}
      {isLastThirtySeconds && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 border-4 ${
            isLastTenSeconds
              ? "border-red-500/60 shadow-[inset_0_0_100px_rgba(239,68,68,0.3)]"
              : "border-orange-500/40 shadow-[inset_0_0_60px_rgba(249,115,22,0.2)]"
          } animate-pulse`}
        />
      )}

      {/* Background Layer */}
      <Starfield />
      <ShootingStar />

      {/* Aurora effect at top - GPU accelerated */}
      <div className="fixed inset-x-0 top-0 h-64 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-x-0 -top-20 h-48 bg-gradient-to-b from-cyan-500/20 via-purple-500/10 to-transparent blur-3xl animate-aurora" />
        <div
          className="absolute inset-x-0 -top-10 h-32 bg-gradient-to-b from-pink-500/15 via-cyan-500/10 to-transparent blur-2xl animate-aurora"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      {/* Ambient glow orbs - GPU accelerated, very subtle */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-float-slow-reverse" />
      </div>

      {/* Giant 2026 watermark - glows more as we approach midnight */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <span
          className={`text-[20vw] font-black tracking-tighter transition-opacity duration-1000 ${
            isLastThirtySeconds
              ? "text-white/10"
              : hours === 0
              ? "text-white/5"
              : "text-white/[0.02]"
          }`}
          style={{
            textShadow: isLastThirtySeconds ? "0 0 100px rgba(255,255,255,0.2)" : "none",
          }}
        >
          2026
        </span>
      </div>

      {/* Viewer count badge with mood */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2">
        <span className="text-lg">{moodEmoji}</span>
        <Eye className="h-4 w-4 text-cyan-400" />
        <span className="text-cyan-400 text-sm font-mono">
          {viewerCount.toLocaleString()}
        </span>
        <span className="text-cyan-300/50 text-xs hidden sm:inline">watching</span>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
                <Sparkles
                  className={`h-6 w-6 animate-pulse ${
                    isLastThirtySeconds ? "text-red-400" : "text-yellow-400"
                  }`}
                />
                <h1
                  className={`text-2xl font-black tracking-[0.3em] bg-clip-text text-transparent sm:text-3xl md:text-5xl animate-gradient-x transition-all duration-500 ${
                    isLastTenSeconds
                      ? "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"
                      : isLastThirtySeconds
                      ? "bg-gradient-to-r from-orange-400 via-red-400 to-pink-400"
                      : "bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
                  }`}
                >
                  {isLastTenSeconds ? `${seconds}...` : "2026 COUNTDOWN"}
                </h1>
                <Sparkles
                  className={`h-6 w-6 animate-pulse ${
                    isLastThirtySeconds ? "text-red-400" : "text-yellow-400"
                  }`}
                />
              </div>

              {/* Current local time display */}
              <div className="flex flex-col items-center">
                <div className="text-cyan-400 font-mono text-lg sm:text-xl tracking-widest text-glow-cyan">
                  {currentTime}
                </div>
                <div className="text-cyan-300/40 text-xs mt-1">
                  {timezone}
                </div>
              </div>

              {/* Milestone alert */}
              {milestoneMessage && (
                <div className="animate-bounce bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-400/50 rounded-full px-6 py-2">
                  <span className="text-yellow-400 font-bold text-lg sm:text-xl tracking-wider">
                    {milestoneMessage}
                  </span>
                </div>
              )}

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
                } ${isLastThirtySeconds ? "animate-heartbeat" : ""}`}
              >
                {/* Pulse ring effect */}
                <div className="absolute inset-0 rounded-3xl border border-cyan-500/20 animate-pulse-ring" />

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

              {/* Total seconds remaining - dramatic counter */}
              {totalSecondsRemaining > 0 && totalSecondsRemaining < 86400 && (
                <div className="text-center">
                  <span className="text-cyan-300/40 text-xs uppercase tracking-widest">Only</span>
                  <span className="mx-2 font-mono text-2xl sm:text-3xl font-bold text-cyan-400 text-glow-cyan">
                    {totalSecondsRemaining.toLocaleString()}
                  </span>
                  <span className="text-cyan-300/40 text-xs uppercase tracking-widest">
                    seconds to 2026
                  </span>
                </div>
              )}

              {/* Final countdown message */}
              {isLastTenSeconds && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-2xl font-bold text-red-400 animate-pulse tracking-wider">
                    🎆 GET READY! 🎆
                  </p>
                  <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 animate-heartbeat drop-shadow-[0_0_30px_rgba(255,100,0,0.8)]">
                    {seconds}
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white/80 tracking-widest animate-bounce">
                    {seconds === 10 && "TEN!"}
                    {seconds === 9 && "NINE!"}
                    {seconds === 8 && "EIGHT!"}
                    {seconds === 7 && "SEVEN!"}
                    {seconds === 6 && "SIX!"}
                    {seconds === 5 && "FIVE!"}
                    {seconds === 4 && "FOUR!"}
                    {seconds === 3 && "THREE!"}
                    {seconds === 2 && "TWO!"}
                    {seconds === 1 && "ONE!"}
                  </p>
                </div>
              )}

              {/* Dynamic message based on time */}
              {!isFinalCountdown && (
                <p className="mt-4 max-w-md text-sm leading-relaxed text-cyan-300/50 sm:text-base">
                  {hours < 1
                    ? "🔥 Less than an hour! The excitement is building! 🔥"
                    : hours < 3
                    ? "⚡ Almost there! 2026 is just hours away! ⚡"
                    : days > 0
                    ? `🗓️ ${days} day${
                      days > 1 ? "s" : ""
                    } until the new year! Click or press SPACE for magic ✨`
                    : "✨ Click or press SPACE for magic ✨"}
                </p>
              )}

              {/* Fun fact */}
              <p className="text-purple-300/50 text-xs transition-opacity duration-500 max-w-sm">
                {FUN_FACTS[factIndex]}
              </p>

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
                {/* Multiple glow layers for epic effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 blur-3xl opacity-40 animate-pulse scale-150" />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 blur-2xl opacity-30 animate-pulse scale-125"
                  style={{ animationDelay: "-0.5s" }}
                />

                <div className="relative rounded-2xl border-4 border-yellow-400/50 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 px-8 py-6 shadow-[0_0_100px_rgba(234,179,8,0.6)] sm:px-16 sm:py-8">
                  <div className="flex items-center gap-4">
                    <Sparkles
                      className="h-8 w-8 text-white animate-spin"
                      style={{ animationDuration: "3s" }}
                    />
                    <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:text-6xl md:text-8xl">
                      2026
                    </h1>
                    <Sparkles
                      className="h-8 w-8 text-white animate-spin"
                      style={{ animationDuration: "3s", animationDirection: "reverse" }}
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-yellow-400 tracking-widest sm:text-4xl animate-bounce">
                HAPPY NEW YEAR!
              </h2>

              <div className="flex gap-2 text-4xl">
                <span className="animate-bounce" style={{ animationDelay: "0s" }}>🎆</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>🎊</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>🥳</span>
                <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>🎉</span>
                <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>✨</span>
                <span className="animate-bounce" style={{ animationDelay: "0.5s" }}>🍾</span>
                <span className="animate-bounce" style={{ animationDelay: "0.6s" }}>🌟</span>
              </div>

              {/* Celebration message */}
              <div className="text-center space-y-2">
                <p className="text-white/60 text-sm">
                  You made it! Welcome to a brand new year of possibilities!
                </p>
                <p className="text-yellow-300/80 text-xs">
                  🌍 Joining billions around the world in celebration 🌍
                </p>
              </div>

              <p className="max-w-md text-lg text-white/80 sm:text-xl">
                The future is NOW! Welcome to 2026!
              </p>

              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border-2 border-yellow-400/50 bg-yellow-400/20 px-8 py-3 text-sm font-bold text-yellow-400 backdrop-blur-md transition-all hover:bg-yellow-400/30 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]"
              >
                🔄 Relive the Magic
              </button>
            </div>
          )}
      </div>

      {/* Screen pulse for final 30 seconds */}
      {isLastThirtySeconds && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-red-500/10 animate-screen-pulse" />
      )}

      {/* Vignette effect for dramatic atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Cosmic dust at bottom - GPU accelerated */}
      <div className="fixed inset-x-0 bottom-0 h-32 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-purple-900/20 via-cyan-900/10 to-transparent blur-2xl animate-float-slow" />
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-white/20 text-xs">
          Made with 💜 for the most epic NYE ever • spike.land
        </p>
      </div>

      {/* Interactive Layers */}
      <Confetti />
      <Fireworks isActive={showCelebration} />
    </div>
  );
}
