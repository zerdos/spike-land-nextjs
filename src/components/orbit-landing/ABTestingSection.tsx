"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { AlertTriangle, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

/**
 * ABTestingSection - Showcases Pulse monitoring and analytics
 *
 * Features:
 * - Dashboard preview with metrics charts
 * - Animated chart bars that grow on scroll
 * - Anomaly detection visualization
 */

// Simulated chart data
const chartData = [
  { day: "Mon", engagement: 65, followers: 45 },
  { day: "Tue", engagement: 72, followers: 52 },
  { day: "Wed", engagement: 58, followers: 48 },
  { day: "Thu", engagement: 85, followers: 61 },
  { day: "Fri", engagement: 42, followers: 38 }, // Anomaly
  { day: "Sat", engagement: 78, followers: 55 },
  { day: "Sun", engagement: 91, followers: 68 },
];

function AnimatedBar({
  height,
  delay,
  color,
  isAnomaly = false,
}: {
  height: number;
  delay: number;
  color: string;
  isAnomaly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="relative h-32 flex items-end justify-center">
      <motion.div
        className={cn(
          "w-full rounded-t-sm",
          color,
          isAnomaly && "relative",
        )}
        initial={{ height: 0 }}
        animate={isInView ? { height: `${height}%` } : { height: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {isAnomaly && (
          <motion.div
            className="absolute -top-6 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: delay + 0.4, duration: 0.3 }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function MetricsChart() {
  return (
    <Card className="bg-zinc-900/50 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white/90">
            Performance Trends
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            <span>+12.4%</span>
          </div>
        </div>
        <p className="text-xs text-white/40">Last 7 days</p>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {chartData.map((data, index) => (
            <div key={data.day} className="flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5">
                <AnimatedBar
                  height={data.engagement}
                  delay={index * 0.1}
                  color="bg-emerald-500/80"
                  isAnomaly={data.engagement < 50}
                />
                <AnimatedBar
                  height={data.followers}
                  delay={index * 0.1 + 0.05}
                  color="bg-purple-500/80"
                />
              </div>
              <span className="text-xs text-white/40">{data.day}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/80" />
            <span>Engagement</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500/80" />
            <span>Followers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnomalyAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm mb-1">
              Anomaly Detected
            </h4>
            <p className="text-xs text-white/60 mb-2">
              Engagement dropped 42% on Friday. Pulse detected this pattern and suggests adjusting
              your posting time.
            </p>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
              View Recommendations
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatsGrid() {
  const stats = [
    {
      label: "Total Impressions",
      value: "124.5K",
      change: "+18%",
      isPositive: true,
      icon: BarChart3,
    },
    {
      label: "Engagement Rate",
      value: "4.8%",
      change: "+0.6%",
      isPositive: true,
      icon: TrendingUp,
    },
    {
      label: "Follower Growth",
      value: "+2,847",
      change: "this month",
      isPositive: true,
      icon: TrendingUp,
    },
    {
      label: "Content Score",
      value: "92",
      change: "-3",
      isPositive: false,
      icon: TrendingDown,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
        >
          <Card className="bg-zinc-900/50 border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon
                  className={cn(
                    "w-4 h-4",
                    stat.isPositive ? "text-emerald-400" : "text-red-400",
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    stat.isPositive ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {stat.change}
                </span>
              </div>
              <span className="text-xl font-bold text-white">{stat.value}</span>
              <p className="text-xs text-white/50 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function ABTestingSection() {
  return (
    <section className="relative py-24 bg-zinc-950">
      <div className="container mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Real-time Analytics
          </Badge>
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            Monitor Everything with Pulse
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Track performance across all platforms. Get alerts when something&apos;s off. Make
            data-driven decisions with AI-powered insights.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {/* Main chart - takes 3 columns */}
          <div className="lg:col-span-3">
            <ScrollReveal>
              <MetricsChart />
            </ScrollReveal>
            <div className="mt-4">
              <AnomalyAlert />
            </div>
          </div>

          {/* Stats sidebar - takes 2 columns */}
          <div className="lg:col-span-2">
            <StatsGrid />
          </div>
        </div>
      </div>
    </section>
  );
}
