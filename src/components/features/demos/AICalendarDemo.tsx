"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ThemeCard } from "../../landing-sections/shared/ThemeCard";

interface TimeSlot {
  hour: number;
  score: number;
  label: string;
}

interface DayData {
  day: number;
  dayName: string;
  slots: TimeSlot[];
  bestTime: number;
}

// Generate engagement scores that look realistic
function generateDayData(dayOffset: number): DayData {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + dayOffset);
  const day = baseDate.getDate();
  const dayName = baseDate.toLocaleDateString("en-US", { weekday: "short" });

  // Generate time slots with varying engagement
  const slots: TimeSlot[] = [];
  let bestTime = 9;
  let bestScore = 0;

  for (let hour = 6; hour <= 22; hour++) {
    // Create realistic engagement patterns
    let score = 20;

    // Morning peak (7-9 AM)
    if (hour >= 7 && hour <= 9) {
      score = 50 + Math.random() * 30;
    }
    // Lunch time (12-1 PM)
    if (hour >= 12 && hour <= 13) {
      score = 60 + Math.random() * 25;
    }
    // Evening peak (6-9 PM)
    if (hour >= 18 && hour <= 21) {
      score = 70 + Math.random() * 30;
    }
    // Late night drop
    if (hour >= 22) {
      score = 15 + Math.random() * 10;
    }

    // Add some randomness based on day
    score += (dayOffset % 3) * 5;
    score = Math.min(100, Math.max(10, score));

    if (score > bestScore) {
      bestScore = score;
      bestTime = hour;
    }

    const label = hour === 12
      ? "12 PM"
      : hour > 12
      ? `${hour - 12} PM`
      : hour === 0
      ? "12 AM"
      : `${hour} AM`;

    slots.push({ hour, score: Math.round(score), label });
  }

  return { day, dayName, slots, bestTime };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-emerald-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function HeatmapCell({
  slot,
  isSelected,
  isBest,
  onClick,
}: {
  slot: TimeSlot;
  isSelected: boolean;
  isBest: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all duration-200",
        getScoreColor(slot.score),
        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-[var(--landing-bg)]",
        isBest && "animate-pulse",
      )}
      style={{ opacity: 0.3 + (slot.score / 100) * 0.7 }}
      title={`${slot.label}: ${slot.score}% engagement`}
    >
      {isBest && <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />}
    </motion.button>
  );
}

export function AICalendarDemo() {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(2);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  // Generate week data
  useEffect(() => {
    const data = Array.from({ length: 7 }, (_, i) => generateDayData(i));
    setWeekData(data);
  }, []);

  // Auto-show AI suggestion
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuggestion(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSchedule = useCallback(() => {
    setIsScheduling(true);
    setTimeout(() => {
      setIsScheduling(false);
      setScheduled(true);
      setTimeout(() => {
        setScheduled(false);
        setShowSuggestion(false);
        setTimeout(() => setShowSuggestion(true), 2000);
      }, 3000);
    }, 1500);
  }, []);

  const currentDay = weekData[selectedDay];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <ThemeCard glass className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">AI Content Calendar</h3>
              <p className="text-sm text-[var(--landing-muted-fg)]">
                Optimal posting times for your audience
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button className="p-2 rounded-lg hover:bg-[var(--landing-muted)]/30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">This Week</span>
            <button className="p-2 rounded-lg hover:bg-[var(--landing-muted)]/30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Week Day Selector */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6">
          {weekData.map((day, index) => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(index)}
              className={cn(
                "p-2 sm:p-3 rounded-xl text-center transition-all duration-200",
                selectedDay === index
                  ? "bg-[var(--landing-primary)] text-white"
                  : "hover:bg-[var(--landing-muted)]/30",
              )}
            >
              <div className="text-xs text-current opacity-70">{day.dayName}</div>
              <div className="text-sm sm:text-lg font-semibold">{day.day}</div>
            </button>
          ))}
        </div>

        {/* Heatmap */}
        {currentDay && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Engagement Heatmap</span>
              <div className="flex items-center gap-2 text-xs text-[var(--landing-muted-fg)]">
                <span>Low</span>
                <div className="flex gap-0.5">
                  {[20, 40, 60, 80, 100].map((score) => (
                    <div
                      key={score}
                      className={cn("w-3 h-3 rounded", getScoreColor(score))}
                      style={{ opacity: 0.3 + (score / 100) * 0.7 }}
                    />
                  ))}
                </div>
                <span>High</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2">
              {currentDay.slots.map((slot) => (
                <HeatmapCell
                  key={slot.hour}
                  slot={slot}
                  isSelected={selectedTime === slot.hour}
                  isBest={slot.hour === currentDay.bestTime}
                  onClick={() => setSelectedTime(slot.hour)}
                />
              ))}
            </div>

            {/* Time Labels */}
            <div className="flex justify-between mt-2 text-xs text-[var(--landing-muted-fg)]">
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>10 PM</span>
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        <AnimatePresence>
          {showSuggestion && currentDay && !scheduled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 rounded-xl bg-gradient-to-r from-[var(--landing-primary)]/20 to-[var(--landing-accent)]/20 border border-[var(--landing-primary)]/30"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[var(--landing-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[var(--landing-primary)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--landing-primary)]">
                      AI Recommendation
                    </p>
                    <p className="text-sm text-[var(--landing-muted-fg)]">
                      Schedule at{" "}
                      <span className="font-medium text-[var(--landing-fg)]">
                        {currentDay.bestTime > 12
                          ? `${currentDay.bestTime - 12}:00 PM`
                          : `${currentDay.bestTime}:00 AM`}
                      </span>{" "}
                      for maximum reach
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                    <span>+47% reach</span>
                  </div>
                  <button
                    onClick={handleSchedule}
                    disabled={isScheduling}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                      isScheduling
                        ? "bg-[var(--landing-muted)] text-[var(--landing-muted-fg)]"
                        : "bg-[var(--landing-primary)] text-white hover:opacity-90",
                    )}
                  >
                    {isScheduling
                      ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Scheduling...
                        </>
                      )
                      : (
                        <>
                          <Zap className="w-4 h-4" />
                          Schedule
                        </>
                      )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scheduled Confirmation */}
        <AnimatePresence>
          {scheduled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-400">Post Scheduled!</p>
                  <p className="text-sm text-[var(--landing-muted-fg)]">
                    Your content will go live at the optimal time
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
