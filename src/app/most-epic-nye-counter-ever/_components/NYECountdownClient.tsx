"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { Check, Eye, Share2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

const NEW_YEAR_WISHES = [
  "May 2026 bring you joy and success!",
  "Wishing you health, wealth, and happiness!",
  "May all your dreams come true this year!",
  "Here's to new beginnings and adventures!",
  "May your year be filled with love and laughter!",
  "Cheers to making 2026 your best year yet!",
];

// Major cities and their UTC offsets for world celebration tracker
const WORLD_CITIES = [
  { city: "Samoa", offset: 14, emoji: "🏝️" },
  { city: "Auckland", offset: 13, emoji: "🇳🇿" },
  { city: "Sydney", offset: 11, emoji: "🇦🇺" },
  { city: "Tokyo", offset: 9, emoji: "🇯🇵" },
  { city: "Singapore", offset: 8, emoji: "🇸🇬" },
  { city: "Dubai", offset: 4, emoji: "🇦🇪" },
  { city: "Moscow", offset: 3, emoji: "🇷🇺" },
  { city: "Paris", offset: 1, emoji: "🇫🇷" },
  { city: "London", offset: 0, emoji: "🇬🇧" },
  { city: "New York", offset: -5, emoji: "🇺🇸" },
  { city: "Los Angeles", offset: -8, emoji: "🎬" },
  { city: "Honolulu", offset: -10, emoji: "🌺" },
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
  const [wishIndex, setWishIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  // Calculate countdown phases
  const isFinalCountdown = days === 0 && hours === 0 && minutes === 0 && seconds <= 60;
  const isLastThirtySeconds = isFinalCountdown && seconds <= 30 && seconds > 0;
  const isLastTenSeconds = isFinalCountdown && seconds <= 10 && seconds > 0;
  const isLastFiveSeconds = isFinalCountdown && seconds <= 5 && seconds > 0;

  // Simulate viewer count (fun atmospheric effect) - surges during final countdown
  useEffect(() => {
    const baseViewers = 1247 + Math.floor(Math.random() * 500);
    setViewerCount(baseViewers);

    const interval = setInterval(() => {
      setViewerCount((prev) => {
        if (isFinalCountdown) {
          return prev + Math.floor(Math.random() * 100) + 50;
        } else if (hours === 0 && minutes < 10) {
          return prev + Math.floor(Math.random() * 30) + 10;
        }
        const change = Math.floor(Math.random() * 20) - 8;
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

  // Rotate wishes every 4 seconds (for celebration mode)
  useEffect(() => {
    if (!isComplete) return;
    const interval = setInterval(() => {
      setWishIndex((prev) => (prev + 1) % NEW_YEAR_WISHES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isComplete]);

  // Update current time display and get timezone
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

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

  // Calculate which cities have already celebrated
  const worldCelebrationStatus = useMemo(() => {
    const utcMidnight2026 = new Date("2026-01-01T00:00:00Z").getTime();
    const currentUtc = Date.now();

    return WORLD_CITIES.map((city) => {
      const cityMidnight = utcMidnight2026 - city.offset * 60 * 60 * 1000;
      const hasCelebrated = currentUtc >= cityMidnight;
      return { ...city, hasCelebrated };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const celebratedCount = worldCelebrationStatus.filter((c) => c.hasCelebrated).length;

  // Find the next city to celebrate
  const nextCityToCelebrate = useMemo(() => {
    const utcMidnight2026 = new Date("2026-01-01T00:00:00Z").getTime();
    const currentUtc = Date.now();

    // Find the first city that hasn't celebrated yet
    for (const city of WORLD_CITIES) {
      const cityMidnight = utcMidnight2026 - city.offset * 60 * 60 * 1000;
      if (currentUtc < cityMidnight) {
        const timeUntil = cityMidnight - currentUtc;
        const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
        return {
          ...city,
          timeUntil: hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}m` : `${minutesUntil}m`,
        };
      }
    }
    return null; // All cities have celebrated!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  // Hype meter - increases as we get closer
  const hypeLevel = useMemo(() => {
    if (isComplete) {
      return { level: 100, label: "MAXIMUM HYPE!", color: "from-yellow-400 to-orange-500" };
    }
    if (isLastTenSeconds) {
      return { level: 99, label: "LEGENDARY", color: "from-red-500 to-orange-500" };
    }
    if (isLastThirtySeconds) {
      return { level: 95, label: "INSANE", color: "from-orange-500 to-yellow-500" };
    }
    if (isFinalCountdown) return { level: 85, label: "EPIC", color: "from-pink-500 to-purple-500" };
    if (hours === 0 && minutes < 10) {
      return { level: 75, label: "EXTREME", color: "from-purple-500 to-cyan-500" };
    }
    if (hours === 0) return { level: 60, label: "HIGH", color: "from-cyan-500 to-blue-500" };
    if (hours < 3) return { level: 45, label: "BUILDING", color: "from-blue-500 to-indigo-500" };
    if (hours < 12) {
      return { level: 30, label: "WARMING UP", color: "from-indigo-500 to-purple-500" };
    }
    if (days === 0) return { level: 20, label: "RISING", color: "from-purple-500 to-pink-500" };
    return { level: 10, label: "CALM", color: "from-gray-500 to-gray-600" };
  }, [isComplete, isLastTenSeconds, isLastThirtySeconds, isFinalCountdown, hours, minutes, days]);

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
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center p-2 sm:p-4 pt-[100px] sm:pt-[168px] pb-16 sm:pb-12 overflow-hidden ${
        isLastFiveSeconds ? "animate-screen-shake" : ""
      }`}
    >
      {/* Lightning flash effect during final 10 seconds */}
      {isLastTenSeconds && (
        <>
          <div
            key={`lightning-${seconds}`}
            className="fixed inset-0 pointer-events-none z-70 animate-lightning-flash"
            style={{ background: "white" }}
          />
          {seconds <= 5 && (
            <div
              className="fixed inset-0 pointer-events-none z-70 animate-lightning-flash"
              style={{ background: "white", animationDelay: "0.3s" }}
            />
          )}
        </>
      )}

      {/* Bass drop visual at midnight - massive pulse */}
      {isComplete && (
        <div className="fixed inset-0 pointer-events-none z-80">
          <div className="absolute inset-0 bg-white animate-bass-drop" />
          <div
            className="absolute inset-0 bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600 animate-bass-drop"
            style={{ animationDelay: "0.1s" }}
          />
        </div>
      )}

      {/* Dramatic background shift - intensifying as countdown approaches */}
      {isFinalCountdown && (
        <div
          className="fixed inset-0 pointer-events-none z-5 transition-all duration-1000"
          style={{
            background: isLastTenSeconds
              ? "linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(234,88,12,0.1) 50%, rgba(0,0,0,0) 100%)"
              : isLastThirtySeconds
              ? "linear-gradient(180deg, rgba(249,115,22,0.1) 0%, rgba(217,70,239,0.05) 50%, rgba(0,0,0,0) 100%)"
              : "linear-gradient(180deg, rgba(234,179,8,0.05) 0%, rgba(34,211,238,0.03) 50%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}

      {/* Visual beat pulse - flashes on each second during final countdown */}
      {isFinalCountdown && seconds > 0 && (
        <div
          key={seconds}
          className="fixed inset-0 pointer-events-none z-40 animate-beat-flash"
          style={{
            background: isLastTenSeconds
              ? "radial-gradient(circle at center, rgba(239,68,68,0.2) 0%, transparent 60%)"
              : isLastThirtySeconds
              ? "radial-gradient(circle at center, rgba(249,115,22,0.15) 0%, transparent 65%)"
              : "radial-gradient(circle at center, rgba(234,179,8,0.08) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Celebration explosion bursts */}
      {isComplete && (
        <>
          <div className="fixed top-1/4 left-1/4 w-32 h-32 pointer-events-none z-20 animate-celebration-burst">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400/40 to-orange-500/40 blur-xl" />
          </div>
          <div
            className="fixed top-1/3 right-1/4 w-24 h-24 pointer-events-none z-20 animate-celebration-burst"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-400/40 to-purple-500/40 blur-xl" />
          </div>
          <div
            className="fixed bottom-1/3 left-1/3 w-28 h-28 pointer-events-none z-20 animate-celebration-burst"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-500/40 blur-xl" />
          </div>
          <div
            className="fixed bottom-1/4 right-1/3 w-20 h-20 pointer-events-none z-20 animate-celebration-burst"
            style={{ animationDelay: "0.9s" }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400/40 to-teal-500/40 blur-xl" />
          </div>

          {/* Shockwave effect at midnight - multiple expanding rings */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-60">
            <div className="w-4 h-4 rounded-full border-4 border-yellow-400 animate-shockwave" />
            <div
              className="absolute w-4 h-4 rounded-full border-4 border-orange-400 animate-shockwave"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="absolute w-4 h-4 rounded-full border-4 border-red-400 animate-shockwave"
              style={{ animationDelay: "0.4s" }}
            />
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-pink-400 animate-shockwave"
              style={{ animationDelay: "0.6s" }}
            />
          </div>

          {/* Floating celebration emojis - GPU accelerated */}
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {["🎉", "🎊", "🥳", "✨", "🎆", "🍾", "🌟", "💫", "🎇", "🥂"].map((emoji, i) => (
              <div
                key={i}
                className="absolute text-4xl animate-float-up"
                style={{
                  left: `${10 + i * 9}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${4 + (i % 3)}s`,
                }}
              >
                {emoji}
              </div>
            ))}
          </div>

          {/* Golden rain effect at midnight */}
          <div className="fixed inset-0 pointer-events-none z-45 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`gold-${i}`}
                className="absolute w-1 animate-golden-rain"
                style={{
                  left: `${(i * 3.5) % 100}%`,
                  height: `${15 + (i % 4) * 10}px`,
                  background: `linear-gradient(180deg, transparent, ${
                    i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#FFA500" : "#FF6B6B"
                  })`,
                  animationDelay: `${(i * 0.1) % 2}s`,
                  animationDuration: `${1.5 + (i % 3) * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Sparkle rain - tiny glitter particles */}
          <div className="fixed inset-0 pointer-events-none z-55 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className="absolute w-1 h-1 rounded-full animate-sparkle-fall"
                style={{
                  left: `${(i * 5) % 100}%`,
                  background: ["#FFD700", "#FFFFFF", "#00E5FF", "#FF69B4", "#9D4EDD"][i % 5],
                  boxShadow: `0 0 6px ${
                    ["#FFD700", "#FFFFFF", "#00E5FF", "#FF69B4", "#9D4EDD"][i % 5]
                  }`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Time warp portal effect during final 10 seconds */}
      {isLastTenSeconds && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-25">
          <div className="relative">
            {/* Rotating portal rings */}
            <div className="absolute inset-0 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-purple-500/30 animate-portal-spin" />
            <div
              className="absolute inset-0 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-500/40 animate-portal-spin"
              style={{ animationDirection: "reverse", animationDuration: "4s" }}
            />
            <div
              className="absolute inset-0 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pink-500/50 animate-portal-spin"
              style={{ animationDuration: "2s" }}
            />
            {/* Portal center glow */}
            <div className="absolute w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-white/20 via-purple-500/10 to-transparent blur-xl animate-pulse" />
          </div>
        </div>
      )}

      {/* Times Square Ball Drop Animation */}
      {isLastTenSeconds && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none z-35">
          <div
            className="relative animate-ball-drop"
            style={{
              animationDuration: `${seconds}s`,
              animationPlayState: seconds > 0 ? "running" : "paused",
            }}
          >
            {/* The Ball */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 shadow-[0_0_60px_rgba(255,215,0,0.8),inset_0_0_20px_rgba(255,255,255,0.5)] animate-pulse">
              {/* Crystal facets */}
              <div className="absolute inset-2 rounded-full border border-white/30" />
              <div className="absolute inset-4 rounded-full border border-white/20" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
            </div>
            {/* Trail */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-32 bg-gradient-to-b from-yellow-400/60 to-transparent -z-10" />
          </div>
        </div>
      )}

      {/* Sound Bar Visualization */}
      {isFinalCountdown && !isComplete && (
        <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-30 flex items-end justify-center gap-1 px-4">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={`bar-${i}`}
              className="w-2 sm:w-3 rounded-t-full animate-sound-bar"
              style={{
                height: `${20 + Math.sin(i * 0.5) * 30}%`,
                background: `linear-gradient(to top, ${
                  isLastTenSeconds
                    ? "#ef4444"
                    : isLastThirtySeconds
                    ? "#f97316"
                    : "#06b6d4"
                }, transparent)`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.3 + (i % 4) * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Supernova explosion at midnight */}
      {isComplete && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-75">
          {/* Core explosion */}
          <div className="absolute w-4 h-4 rounded-full bg-white animate-supernova" />
          {/* Secondary ring */}
          <div
            className="absolute w-8 h-8 rounded-full border-4 border-yellow-300 animate-supernova"
            style={{ animationDelay: "0.1s" }}
          />
          {/* Outer ring */}
          <div
            className="absolute w-12 h-12 rounded-full border-2 border-orange-400 animate-supernova"
            style={{ animationDelay: "0.2s" }}
          />
          {/* Light rays */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`ray-${i}`}
              className="absolute w-1 h-32 bg-gradient-to-t from-yellow-400 via-white to-transparent animate-supernova-ray"
              style={{
                transform: `rotate(${i * 30}deg)`,
                transformOrigin: "bottom center",
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Lens flare effect at midnight */}
      {isComplete && (
        <div className="fixed inset-0 pointer-events-none z-85 overflow-hidden">
          {/* Main flare */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-radial from-white via-yellow-200/50 to-transparent blur-md animate-lens-flare" />
          {/* Secondary flares */}
          <div
            className="absolute top-[40%] left-[60%] w-8 h-8 rounded-full bg-cyan-400/40 blur-sm animate-lens-flare"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="absolute top-[60%] left-[35%] w-12 h-12 rounded-full bg-pink-400/30 blur-md animate-lens-flare"
            style={{ animationDelay: "0.3s" }}
          />
          <div
            className="absolute top-[30%] left-[45%] w-6 h-6 rounded-full bg-orange-400/40 blur-sm animate-lens-flare"
            style={{ animationDelay: "0.4s" }}
          />
          {/* Anamorphic streak */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent -translate-y-1/2 animate-lens-streak" />
        </div>
      )}

      {/* Confetti cannons at corners */}
      {isComplete && (
        <div className="fixed inset-0 pointer-events-none z-65 overflow-hidden">
          {/* Left cannon burst */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`cannon-l-${i}`}
              className="absolute bottom-0 left-0 animate-confetti-cannon-left"
              style={{
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  background: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#EC4899"][i % 5],
                  transform: `rotate(${i * 25}deg)`,
                }}
              />
            </div>
          ))}
          {/* Right cannon burst */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`cannon-r-${i}`}
              className="absolute bottom-0 right-0 animate-confetti-cannon-right"
              style={{
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  background: ["#FFD700", "#00E5FF", "#FF00FF", "#00FF00", "#FF4500"][i % 5],
                  transform: `rotate(${i * 25}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Electric surge during final 5 seconds */}
      {isLastFiveSeconds && (
        <div className="fixed inset-0 pointer-events-none z-55">
          {/* Electric arcs */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="electric-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {Array.from({ length: 6 }).map((_, i) => (
              <path
                key={`arc-${i}`}
                className="animate-electric-arc"
                d={`M ${10 + i * 15}% 0 Q ${20 + i * 10}% 50% ${50}% 50% T ${90 - i * 10}% 100%`}
                stroke={i % 2 === 0 ? "#00E5FF" : "#A855F7"}
                strokeWidth="2"
                fill="none"
                filter="url(#electric-glow)"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.7,
                }}
              />
            ))}
          </svg>
          {/* Spark particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`spark-${i}`}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-spark"
              style={{
                top: `${20 + (i * 10) % 60}%`,
                left: `${10 + (i * 12) % 80}%`,
                animationDelay: `${i * 0.15}s`,
                boxShadow: "0 0 10px #00E5FF, 0 0 20px #00E5FF",
              }}
            />
          ))}
        </div>
      )}

      {/* Disco ball with reflecting lights */}
      {isComplete && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 pointer-events-none z-95">
          {/* The disco ball */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 via-white to-gray-400 shadow-[0_0_40px_rgba(255,255,255,0.5)] animate-spin-slow">
            {/* Facets */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              {Array.from({ length: 6 }).map((_, row) =>
                Array.from({ length: 8 }).map((_, col) => (
                  <div
                    key={`facet-${row}-${col}`}
                    className="absolute w-3 h-3 bg-gradient-to-br from-white/80 to-gray-300/60 border border-white/20"
                    style={{
                      top: `${10 + row * 14}%`,
                      left: `${5 + col * 12}%`,
                      transform: `rotate(${(row + col) * 15}deg)`,
                    }}
                  />
                ))
              )}
            </div>
          </div>
          {/* Reflecting light beams */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`beam-${i}`}
              className="absolute top-10 left-10 w-1 h-[50vh] origin-top animate-disco-beam"
              style={{
                background: `linear-gradient(to bottom, ${
                  ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"][i % 6]
                }40, transparent)`,
                transform: `rotate(${i * 30}deg)`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Spotlight sweep during final countdown */}
      {isFinalCountdown && !isComplete && (
        <div className="fixed inset-0 pointer-events-none z-35 overflow-hidden">
          <div
            className="absolute w-[200px] h-[400px] bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-2xl animate-spotlight-sweep"
            style={{ transformOrigin: "top center" }}
          />
          <div
            className="absolute w-[150px] h-[350px] bg-gradient-to-b from-cyan-400/15 via-cyan-400/5 to-transparent blur-xl animate-spotlight-sweep"
            style={{ transformOrigin: "top center", animationDelay: "-3s" }}
          />
        </div>
      )}

      {/* Firework trails shooting up */}
      {isComplete && (
        <div className="fixed inset-0 pointer-events-none z-45 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`trail-${i}`}
              className="absolute bottom-0 animate-firework-trail"
              style={{
                left: `${10 + i * 15}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              {/* Trail */}
              <div
                className="w-1 h-24 rounded-full"
                style={{
                  background: `linear-gradient(to top, ${
                    ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7", "#EC4899", "#06B6D4"][i]
                  }, transparent)`,
                  boxShadow: `0 0 10px ${
                    ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7", "#EC4899", "#06B6D4"][i]
                  }`,
                }}
              />
              {/* Explosion at top */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-firework-explode">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="absolute w-1 h-4 origin-bottom"
                    style={{
                      background:
                        ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7", "#EC4899", "#06B6D4"][
                          i
                        ],
                      transform: `rotate(${j * 45}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Energy building effect - particles converging during final minute */}
      {isFinalCountdown && !isComplete && (
        <div className="fixed inset-0 pointer-events-none z-15 overflow-hidden">
          {/* Energy orbs converging toward center */}
          <div
            className="absolute w-3 h-3 rounded-full bg-cyan-400/60 blur-sm animate-energy-converge"
            style={{ top: "10%", left: "5%" }}
          />
          <div
            className="absolute w-2 h-2 rounded-full bg-purple-400/60 blur-sm animate-energy-converge"
            style={{ top: "20%", right: "10%", animationDelay: "0.5s" }}
          />
          <div
            className="absolute w-4 h-4 rounded-full bg-pink-400/50 blur-sm animate-energy-converge"
            style={{ bottom: "15%", left: "15%", animationDelay: "1s" }}
          />
          <div
            className="absolute w-2 h-2 rounded-full bg-yellow-400/60 blur-sm animate-energy-converge"
            style={{ bottom: "25%", right: "5%", animationDelay: "1.5s" }}
          />
          <div
            className="absolute w-3 h-3 rounded-full bg-orange-400/50 blur-sm animate-energy-converge"
            style={{ top: "50%", left: "2%", animationDelay: "2s" }}
          />
          <div
            className="absolute w-2 h-2 rounded-full bg-red-400/60 blur-sm animate-energy-converge"
            style={{ top: "40%", right: "3%", animationDelay: "2.5s" }}
          />
        </div>
      )}

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

      {/* Corner decorations - elegant and subtle */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Top left corner */}
        <div className="absolute top-8 left-8 opacity-30">
          <div className="w-32 h-32 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-3xl" />
          <div className="absolute top-0 left-0 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        </div>
        {/* Top right corner */}
        <div className="absolute top-8 right-8 opacity-30">
          <div className="w-32 h-32 border-r-2 border-t-2 border-purple-400/50 rounded-tr-3xl" />
          <div
            className="absolute top-0 right-0 w-2 h-2 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
        </div>
        {/* Bottom left corner */}
        <div className="absolute bottom-8 left-8 opacity-30">
          <div className="w-32 h-32 border-l-2 border-b-2 border-pink-400/50 rounded-bl-3xl" />
          <div
            className="absolute bottom-0 left-0 w-2 h-2 bg-pink-400 rounded-full animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
        {/* Bottom right corner */}
        <div className="absolute bottom-8 right-8 opacity-30">
          <div className="w-32 h-32 border-r-2 border-b-2 border-yellow-400/50 rounded-br-3xl" />
          <div
            className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
        </div>
      </div>

      {/* Viewer count badge with mood - hidden on mobile, shown on sm+ */}
      <div className="absolute top-[168px] left-4 z-50 hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2">
        <span className="text-lg">{moodEmoji}</span>
        <Eye className="h-4 w-4 text-cyan-400" />
        <span className="text-cyan-400 text-sm font-mono">
          {viewerCount.toLocaleString()}
        </span>
        <span className="text-cyan-300/50 text-xs hidden sm:inline">watching</span>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      </div>

      {/* Controls - moved lower on mobile */}
      <div className="absolute top-[168px] right-4 z-50 hidden sm:flex gap-2">
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
      <div className="z-10 flex flex-col items-center gap-4 sm:gap-8 text-center px-2 sm:px-4">
        {!isComplete
          ? (
            <>
              {/* Epic animated title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Sparkles
                  className={`h-4 w-4 sm:h-6 sm:w-6 animate-pulse flex-shrink-0 ${
                    isLastThirtySeconds ? "text-red-400" : "text-yellow-400"
                  }`}
                />
                <h1
                  className={`text-lg font-black tracking-[0.15em] sm:tracking-[0.3em] bg-clip-text text-transparent sm:text-3xl md:text-5xl animate-gradient-x transition-all duration-500 ${
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
                  className={`h-4 w-4 sm:h-6 sm:w-6 animate-pulse flex-shrink-0 ${
                    isLastThirtySeconds ? "text-red-400" : "text-yellow-400"
                  }`}
                />
              </div>

              {/* Mobile: inline viewer count and controls */}
              <div className="flex sm:hidden items-center justify-center gap-3 w-full">
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-2 py-1">
                  <span className="text-sm">{moodEmoji}</span>
                  <Eye className="h-3 w-3 text-cyan-400" />
                  <span className="text-cyan-400 text-xs font-mono">
                    {viewerCount.toLocaleString()}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted
                    ? <VolumeX className="h-4 w-4 text-cyan-400" />
                    : <Volume2 className="h-4 w-4 text-cyan-400" />}
                </button>
                <button
                  onClick={handleShare}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
                  title="Share"
                >
                  {isCopied
                    ? <Check className="h-4 w-4 text-green-400" />
                    : <Share2 className="h-4 w-4 text-cyan-400" />}
                </button>
              </div>

              {/* Current local time display */}
              <div className="flex flex-col items-center">
                <div className="text-cyan-400 font-mono text-base sm:text-lg md:text-xl tracking-widest text-glow-cyan">
                  {currentTime}
                </div>
                <div className="text-cyan-300/40 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
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
              <div className="flex items-center gap-1 sm:gap-2">
                <span
                  className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    hours < 1
                      ? "bg-red-500 animate-ping"
                      : hours < 3
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-cyan-500 animate-pulse"
                  }`}
                />
                <p className="text-cyan-300/60 tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-xs uppercase">
                  The Most Epic New Year&apos;s Eve Ever
                </p>
                <span
                  className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
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
                className={`relative p-4 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-500 ${
                  isLastTenSeconds ? "bg-red-500/10 border border-red-500/30" : ""
                } ${isLastThirtySeconds ? "animate-heartbeat" : ""}`}
              >
                {/* Animated countdown rings - very subtle, GPU accelerated */}
                <div className="absolute inset-[-20px] pointer-events-none">
                  <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-countdown-ring" />
                  <div className="absolute inset-[10px] rounded-full border border-purple-500/10 animate-countdown-ring-reverse" />
                  <div
                    className="absolute inset-[20px] rounded-full border border-pink-500/10 animate-countdown-ring"
                    style={{ animationDuration: "15s" }}
                  />
                </div>

                {/* Pulse ring effect */}
                <div className="absolute inset-0 rounded-3xl border border-cyan-500/20 animate-pulse-ring" />

                {/* Glow effect behind digits */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 rounded-3xl blur-xl" />

                {/* Mobile: 2x2 grid layout */}
                <div className="relative grid grid-cols-2 gap-3 sm:hidden">
                  <CountdownDigit value={days} label="DAYS" />
                  <CountdownDigit value={hours} label="HOURS" />
                  <CountdownDigit value={minutes} label="MINUTES" />
                  <CountdownDigit value={seconds} label="SECONDS" highlight={isLastTenSeconds} />
                </div>
                {/* Desktop: horizontal layout with colons */}
                <div className="relative hidden sm:flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10">
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
              <div className="w-full max-w-md mt-2 sm:mt-4 px-2">
                <div className="flex justify-between text-[10px] sm:text-xs text-cyan-300/50 mb-1 sm:mb-2">
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
                    FINAL STRETCH!
                  </p>
                )}
              </div>

              {/* Hype Meter */}
              <div className="w-full max-w-xs mt-1 sm:mt-2 px-2">
                <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                  <span className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                    Hype Level
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-bold ${
                      hypeLevel.level >= 75 ? "animate-pulse" : ""
                    }`}
                  >
                    {hypeLevel.label}
                  </span>
                </div>
                <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${hypeLevel.color} ${
                      hypeLevel.level >= 85 ? "animate-pulse" : ""
                    }`}
                    style={{ width: `${hypeLevel.level}%` }}
                  />
                </div>
              </div>

              {/* Total seconds remaining - dramatic counter */}
              {totalSecondsRemaining > 0 && totalSecondsRemaining < 86400 && (
                <div className="text-center">
                  <span className="text-cyan-300/40 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                    Only
                  </span>
                  <span className="mx-1 sm:mx-2 font-mono text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400 text-glow-cyan">
                    {totalSecondsRemaining.toLocaleString()}
                  </span>
                  <span className="text-cyan-300/40 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                    seconds to 2026
                  </span>
                </div>
              )}

              {/* Final minute dramatic message */}
              {isFinalCountdown && !isLastTenSeconds && seconds > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <p
                    className={`text-lg font-bold tracking-wider ${
                      isLastThirtySeconds ? "text-orange-400 animate-pulse" : "text-yellow-400"
                    }`}
                  >
                    {isLastThirtySeconds ? "🔥 FINAL 30 SECONDS! 🔥" : "⏰ FINAL MINUTE! ⏰"}
                  </p>
                  <p className="text-white/50 text-sm">
                    {isLastThirtySeconds
                      ? "Get your champagne ready... 🍾"
                      : "The moment is almost here..."}
                  </p>
                </div>
              )}

              {/* Final countdown message */}
              {isLastTenSeconds && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-2xl font-bold text-red-400 animate-pulse tracking-wider">
                    🎆 GET READY! 🎆
                  </p>
                  <div
                    className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 animate-heartbeat"
                    style={{
                      filter: `drop-shadow(0 0 ${30 + (10 - seconds) * 5}px rgba(255,100,0,0.8))`,
                    }}
                  >
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
                  {/* Crowd cheer effect */}
                  <div className="flex gap-1 text-2xl opacity-60">
                    {Array.from({ length: Math.min(10, 11 - seconds) }).map((_, i) => (
                      <span
                        key={i}
                        className="animate-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        {["🙌", "🎊", "👏", "🥳", "🎉"][i % 5]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic message based on time */}
              {!isFinalCountdown && (
                <p className="mt-4 max-w-md text-sm leading-relaxed text-cyan-300/50 sm:text-base">
                  {hours < 1
                    ? "Less than an hour! The excitement is building!"
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
              <p className="text-purple-300/50 text-[10px] sm:text-xs transition-opacity duration-500 max-w-sm px-2">
                {FUN_FACTS[factIndex]}
              </p>

              {/* Rotating inspirational quote */}
              <p className="text-white/30 text-[10px] sm:text-xs italic transition-opacity duration-500 px-2">
                &ldquo;{QUOTES[quoteIndex]}&rdquo;
              </p>

              {/* Next city to celebrate indicator */}
              {nextCityToCelebrate && (
                <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-400/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                  <span className="text-purple-300/60 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                    Next up:
                  </span>
                  <span className="text-lg sm:text-2xl">{nextCityToCelebrate.emoji}</span>
                  <span className="text-purple-300 font-bold text-sm sm:text-base">
                    {nextCityToCelebrate.city}
                  </span>
                  <span className="text-pink-400 text-xs sm:text-sm font-mono">
                    in {nextCityToCelebrate.timeUntil}
                  </span>
                </div>
              )}

              {/* World Celebration Tracker */}
              <div className="mt-3 sm:mt-6 w-full max-w-lg">
                <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                  <span className="text-cyan-300/60 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">
                    World Celebration Wave
                  </span>
                  {celebratedCount > 0 && (
                    <span className="text-yellow-400 text-[10px] sm:text-xs font-bold">
                      {celebratedCount}/{WORLD_CITIES.length} celebrating!
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                  {worldCelebrationStatus.map((city) => (
                    <div
                      key={city.city}
                      className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs transition-all duration-500 ${
                        city.hasCelebrated
                          ? "bg-yellow-400/20 border border-yellow-400/40 text-yellow-300"
                          : "bg-white/5 border border-white/10 text-white/40"
                      }`}
                      title={`${city.city} ${
                        city.hasCelebrated ? "Celebrating 2026!" : "Waiting..."
                      }`}
                    >
                      <span>{city.emoji}</span>
                      <span className="hidden sm:inline">{city.city}</span>
                      {city.hasCelebrated && <span className="animate-pulse">🎉</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
          : (
            <div className="animate-banner-appear flex flex-col items-center gap-8">
              {/* Celebration screen pulse */}
              <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none animate-pulse" />

              {/* Epic celebration banner */}
              <div className="relative">
                {/* Multiple glow layers for epic effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 blur-3xl opacity-50 animate-pulse scale-150" />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 blur-2xl opacity-40 animate-pulse scale-125"
                  style={{ animationDelay: "-0.5s" }}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 blur-xl opacity-30 animate-pulse scale-110"
                  style={{ animationDelay: "-1s" }}
                />

                <div className="relative rounded-2xl border-4 border-yellow-400/60 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 px-8 py-6 shadow-[0_0_120px_rgba(234,179,8,0.7)] sm:px-16 sm:py-8 animate-heartbeat overflow-hidden">
                  {/* Holographic shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-holographic-shimmer" />
                  <div className="flex items-center gap-4">
                    <Sparkles
                      className="h-10 w-10 text-white animate-spin"
                      style={{ animationDuration: "2s" }}
                    />
                    <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-7xl md:text-9xl animate-text-shimmer bg-clip-text relative">
                      2026
                      {/* Prismatic overlay */}
                      <span className="absolute inset-0 bg-gradient-to-r from-red-400 via-yellow-300 via-green-400 via-cyan-400 via-blue-400 to-purple-400 opacity-30 mix-blend-overlay animate-rainbow-pulse" />
                    </h1>
                    <Sparkles
                      className="h-10 w-10 text-white animate-spin"
                      style={{ animationDuration: "2s", animationDirection: "reverse" }}
                    />
                  </div>
                </div>
              </div>

              {/* Victory firework starbursts */}
              <div className="fixed inset-0 pointer-events-none z-90">
                {[
                  { top: "15%", left: "20%" },
                  { top: "25%", right: "15%" },
                  { top: "60%", left: "10%" },
                  { top: "70%", right: "20%" },
                  { top: "40%", left: "80%" },
                ].map((pos, idx) => (
                  <div
                    key={`starburst-${idx}`}
                    className="absolute animate-starburst"
                    style={{ ...pos, animationDelay: `${idx * 0.4}s` }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-8 bg-gradient-to-t from-yellow-400 to-transparent origin-bottom"
                        style={{ transform: `rotate(${i * 45}deg)` }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Floating 2026 numbers rising */}
              <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`float-2026-${i}`}
                    className="absolute text-4xl sm:text-6xl font-black text-white/10 animate-float-2026"
                    style={{
                      left: `${5 + i * 12}%`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: `${6 + (i % 3)}s`,
                    }}
                  >
                    2026
                  </div>
                ))}
              </div>

              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 tracking-widest sm:text-5xl animate-pulse relative">
                🎊 HAPPY NEW YEAR! 🎊
                {/* Glow behind text */}
                <span className="absolute inset-0 blur-lg bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 opacity-50 -z-10" />
              </h2>

              {/* Celebration viewer count */}
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Eye className="h-4 w-4" />
                <span className="font-mono">{viewerCount.toLocaleString()}</span>
                <span>people celebrating with you!</span>
              </div>

              <div className="flex gap-3 text-5xl">
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

              {/* Rotating New Year wishes */}
              <div className="px-6 py-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                <p className="text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 font-medium transition-opacity duration-500">
                  {NEW_YEAR_WISHES[wishIndex]}
                </p>
              </div>

              <p className="max-w-md text-lg text-white/80 sm:text-xl">
                The future is NOW! Welcome to 2026!
              </p>

              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border-2 border-yellow-400/50 bg-yellow-400/20 px-8 py-3 text-sm font-bold text-yellow-400 backdrop-blur-md transition-all hover:bg-yellow-400/30 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]"
              >
                Relive the Magic
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
      <div className="fixed bottom-2 sm:bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-white/30 text-[10px] sm:text-xs">
          Made with 💜 for the most epic NYE ever • spike.land
        </p>
      </div>

      {/* Interactive Layers */}
      <Confetti />
      <Fireworks isActive={showCelebration} />
    </div>
  );
}
