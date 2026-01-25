"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Eye,
  Globe,
  Heart,
  Lightbulb,
  MessageCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeCard } from "../../landing-sections/shared/ThemeCard";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number;
  delay?: number;
}

function MetricCard({ icon, label, value, change, delay = 0 }: MetricCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  const numericValue = parseInt(value.replace(/[^0-9.]/g, ""), 10);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, numericValue]);

  const formattedValue = value.includes("K")
    ? `${(animatedValue / 1000).toFixed(1)}K`
    : value.includes("%")
    ? `${animatedValue}%`
    : animatedValue.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.3 }}
    >
      <ThemeCard className="p-4" hoverEffect>
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-[var(--landing-primary)]/10 flex items-center justify-center">
            {icon}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              change >= 0
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400",
            )}
          >
            {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold">{formattedValue}</div>
          <div className="text-sm text-[var(--landing-muted-fg)]">{label}</div>
        </div>
      </ThemeCard>
    </motion.div>
  );
}

interface ChartBarProps {
  height: number;
  label: string;
  value: number;
  index: number;
  isActive: boolean;
}

function ChartBar({ height, label, value, index, isActive }: ChartBarProps) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="relative h-32 w-full flex items-end justify-center">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${height}%` }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={cn(
            "w-full max-w-[40px] rounded-t-lg transition-colors",
            isActive
              ? "bg-gradient-to-t from-[var(--landing-primary)] to-[var(--landing-accent)]"
              : "bg-[var(--landing-muted)]/50",
          )}
        />
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[var(--landing-fg)] text-[var(--landing-bg)] text-xs font-medium whitespace-nowrap"
          >
            {value.toLocaleString()}
          </motion.div>
        )}
      </div>
      <span className="text-xs text-[var(--landing-muted-fg)]">{label}</span>
    </div>
  );
}

interface PlatformMetric {
  name: string;
  icon: React.ReactNode;
  followers: number;
  engagement: number;
  growth: number;
  color: string;
}

const platforms: PlatformMetric[] = [
  {
    name: "Instagram",
    icon: <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded" />,
    followers: 24500,
    engagement: 4.2,
    growth: 12,
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Twitter",
    icon: <div className="w-4 h-4 bg-blue-400 rounded" />,
    followers: 18200,
    engagement: 2.8,
    growth: 8,
    color: "from-blue-400 to-blue-500",
  },
  {
    name: "LinkedIn",
    icon: <div className="w-4 h-4 bg-blue-600 rounded" />,
    followers: 12800,
    engagement: 5.1,
    growth: 15,
    color: "from-blue-600 to-blue-700",
  },
  {
    name: "TikTok",
    icon: <div className="w-4 h-4 bg-black rounded" />,
    followers: 45000,
    engagement: 8.5,
    growth: 28,
    color: "from-gray-800 to-black",
  },
];

const chartData = [
  { label: "Mon", value: 2400 },
  { label: "Tue", value: 1800 },
  { label: "Wed", value: 3200 },
  { label: "Thu", value: 2800 },
  { label: "Fri", value: 4100 },
  { label: "Sat", value: 3600 },
  { label: "Sun", value: 2900 },
];

const insights = [
  {
    title: "Peak Performance",
    description: "Your Friday posts get 67% more engagement. Consider scheduling key content then.",
    type: "success" as const,
  },
  {
    title: "Growing Audience",
    description:
      "TikTok followers increased 28% this month - your short-form content is resonating.",
    type: "info" as const,
  },
  {
    title: "Optimization Tip",
    description:
      "Posts with questions get 2.3x more comments. Try adding CTAs to increase engagement.",
    type: "tip" as const,
  },
];

export function AnalyticsDemo() {
  const [activeBar, setActiveBar] = useState(4);
  const [showInsight, setShowInsight] = useState(false);
  const [currentInsight, setCurrentInsight] = useState(0);

  const maxValue = Math.max(...chartData.map((d) => d.value));

  useEffect(() => {
    // Cycle through bars
    const barInterval = setInterval(() => {
      setActiveBar((prev) => (prev + 1) % chartData.length);
    }, 3000);

    // Show insights after a delay
    const insightTimeout = setTimeout(() => {
      setShowInsight(true);
    }, 2000);

    // Cycle through insights
    const insightInterval = setInterval(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
    }, 5000);

    return () => {
      clearInterval(barInterval);
      clearTimeout(insightTimeout);
      clearInterval(insightInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <ThemeCard glass className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Analytics Dashboard</h3>
              <p className="text-sm text-[var(--landing-muted-fg)]">
                Cross-platform insights at a glance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--landing-muted-fg)]">Last 7 days</span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +24%
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-[var(--landing-primary)]" />}
            label="Total Impressions"
            value="847K"
            change={18}
            delay={0}
          />
          <MetricCard
            icon={<Users className="w-5 h-5 text-[var(--landing-primary)]" />}
            label="Total Followers"
            value="100500"
            change={12}
            delay={100}
          />
          <MetricCard
            icon={<Heart className="w-5 h-5 text-[var(--landing-primary)]" />}
            label="Engagement Rate"
            value="5%"
            change={8}
            delay={200}
          />
          <MetricCard
            icon={<MessageCircle className="w-5 h-5 text-[var(--landing-primary)]" />}
            label="Total Comments"
            value="4200"
            change={-3}
            delay={300}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Engagement Chart */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Weekly Engagement</span>
              <div className="flex items-center gap-2 text-xs text-[var(--landing-muted-fg)]">
                <Globe className="w-4 h-4" />
                All Platforms
              </div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {chartData.map((data, index) => (
                <ChartBar
                  key={data.label}
                  height={(data.value / maxValue) * 100}
                  label={data.label}
                  value={data.value}
                  index={index}
                  isActive={index === activeBar}
                />
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div>
            <span className="font-medium block mb-4">Platform Performance</span>
            <div className="space-y-3">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--landing-muted)]/20"
                >
                  {platform.icon}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{platform.name}</div>
                    <div className="text-xs text-[var(--landing-muted-fg)]">
                      {platform.followers.toLocaleString()} followers
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{platform.engagement}%</div>
                    <div className="text-xs text-green-400">+{platform.growth}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <AnimatePresence mode="wait">
          {showInsight && insights[currentInsight] && (
            <motion.div
              key={currentInsight}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "mt-6 p-4 rounded-xl border",
                insights[currentInsight].type === "success" &&
                  "bg-green-500/10 border-green-500/20",
                insights[currentInsight].type === "info" &&
                  "bg-blue-500/10 border-blue-500/20",
                insights[currentInsight].type === "tip" &&
                  "bg-yellow-500/10 border-yellow-500/20",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    insights[currentInsight].type === "success" && "bg-green-500/20",
                    insights[currentInsight].type === "info" && "bg-blue-500/20",
                    insights[currentInsight].type === "tip" && "bg-yellow-500/20",
                  )}
                >
                  <Lightbulb
                    className={cn(
                      "w-4 h-4",
                      insights[currentInsight].type === "success" && "text-green-400",
                      insights[currentInsight].type === "info" && "text-blue-400",
                      insights[currentInsight].type === "tip" && "text-yellow-400",
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-semibold",
                      insights[currentInsight].type === "success" && "text-green-400",
                      insights[currentInsight].type === "info" && "text-blue-400",
                      insights[currentInsight].type === "tip" && "text-yellow-400",
                    )}
                  >
                    {insights[currentInsight].title}
                  </p>
                  <p className="text-sm text-[var(--landing-muted-fg)] mt-1">
                    {insights[currentInsight].description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ThemeCard>
    </div>
  );
}
