"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Heart,
  MessageCircle,
  Share2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ThemeCard } from "../../landing-sections/shared/ThemeCard";

interface PostVariant {
  id: string;
  label: string;
  content: string;
  emoji: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  color: string;
}

const variants: PostVariant[] = [
  {
    id: "a",
    label: "Variant A",
    content: "Discover how AI is transforming social media marketing...",
    emoji: "Formal",
    likes: 234,
    comments: 45,
    shares: 12,
    engagement: 3.2,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "b",
    label: "Variant B",
    content: "Mind = BLOWN by what AI can do for your social game...",
    emoji: "Casual",
    likes: 892,
    comments: 156,
    shares: 89,
    engagement: 8.7,
    color: "from-purple-500 to-pink-500",
  },
];

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string; }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

function PostCard({
  variant,
  isWinner,
  isAnimating,
}: {
  variant: PostVariant;
  isWinner: boolean;
  isAnimating: boolean;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "relative",
        isWinner && "ring-2 ring-green-500 ring-offset-2 ring-offset-[var(--landing-bg)]",
      )}
    >
      <ThemeCard className="p-4 sm:p-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r",
              variant.color,
            )}
          >
            {variant.label}
          </span>
          <span className="text-xs text-[var(--landing-muted-fg)] bg-[var(--landing-muted)]/50 px-2 py-1 rounded">
            {variant.emoji}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm sm:text-base text-[var(--landing-fg)] mb-6 line-clamp-2">
          {variant.content}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-[var(--landing-muted)]/30">
            <div className="flex items-center justify-center text-rose-400 mb-1">
              <Heart className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold">
              {isAnimating ? <AnimatedCounter value={variant.likes} /> : variant.likes}
            </div>
            <div className="text-xs text-[var(--landing-muted-fg)]">Likes</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--landing-muted)]/30">
            <div className="flex items-center justify-center text-blue-400 mb-1">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold">
              {isAnimating ? <AnimatedCounter value={variant.comments} /> : variant.comments}
            </div>
            <div className="text-xs text-[var(--landing-muted-fg)]">Comments</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--landing-muted)]/30">
            <div className="flex items-center justify-center text-green-400 mb-1">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold">
              {isAnimating ? <AnimatedCounter value={variant.shares} /> : variant.shares}
            </div>
            <div className="text-xs text-[var(--landing-muted-fg)]">Shares</div>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="border-t border-[var(--landing-border)] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--landing-muted-fg)]">Engagement Rate</span>
            <span className="text-xl font-bold text-[var(--landing-primary)]">
              {isAnimating
                ? <AnimatedCounter value={variant.engagement * 10} suffix="%" />
                : `${variant.engagement}%`}
            </span>
          </div>
          <div className="mt-2 h-2 bg-[var(--landing-muted)]/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${variant.engagement * 10}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn("h-full rounded-full bg-gradient-to-r", variant.color)}
            />
          </div>
        </div>

        {/* Winner Badge */}
        <AnimatePresence>
          {isWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute -top-3 -right-3 bg-green-500 text-white p-2 rounded-full shadow-lg"
            >
              <Trophy className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </ThemeCard>
    </motion.div>
  );
}

export function ABTestingDemo() {
  const [phase, setPhase] = useState<"testing" | "results" | "winner">("testing");
  const [progress, setProgress] = useState(0);

  const runTest = useCallback(() => {
    setPhase("testing");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPhase("results");
          setTimeout(() => setPhase("winner"), 1500);
          return 100;
        }
        return p + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = runTest();
    const resetInterval = setInterval(() => {
      runTest();
    }, 8000);

    return () => {
      cleanup();
      clearInterval(resetInterval);
    };
  }, [runTest]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Demo Container */}
      <ThemeCard glass className="p-4 sm:p-8">
        {/* Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">A/B Test Running</h3>
              <p className="text-sm text-[var(--landing-muted-fg)]">
                Comparing post variations in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {phase === "testing" && (
              <>
                <div className="w-full sm:w-32 h-2 bg-[var(--landing-muted)]/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--landing-primary)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--landing-muted-fg)] min-w-[3rem]">
                  {progress}%
                </span>
              </>
            )}
            {phase === "results" && (
              <span className="text-sm font-medium text-yellow-400">Analyzing...</span>
            )}
            {phase === "winner" && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                <CheckCircle2 className="w-4 h-4" /> Winner Found
              </span>
            )}
          </div>
        </div>

        {/* Posts Comparison */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {variants.map((variant) => (
            <PostCard
              key={variant.id}
              variant={variant}
              isWinner={phase === "winner" && variant.id === "b"}
              isAnimating={phase !== "testing"}
            />
          ))}
        </div>

        {/* Statistical Significance */}
        <AnimatePresence>
          {phase === "winner" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-400">
                      Variant B wins with 95% confidence
                    </p>
                    <p className="text-sm text-[var(--landing-muted-fg)]">
                      172% higher engagement rate - ready to scale
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors whitespace-nowrap">
                  Apply Winner <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ThemeCard>
    </div>
  );
}
