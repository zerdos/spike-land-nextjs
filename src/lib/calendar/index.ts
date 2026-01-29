/**
 * Calendar Module
 *
 * Manages scheduled posts and calendar functionality for Orbit
 * Resolves #571
 */

// Types
export type {
  CalendarPostItem,
  CalendarViewResponse,
  CreateScheduledPostInput,
  DateRange,
  PublishAccountResult,
  PublishScheduledPostResult,
  ScheduledPostAccountInfo,
  ScheduledPostMetadata,
  ScheduledPostsListResponse,
  ScheduledPostsQueryOptions,
  ScheduledPostsStats,
  ScheduledPostStatus,
  ScheduledPostWithAccounts,
  UpdateScheduledPostInput,
} from "./types";

// Service functions
export {
  cancelScheduledPost,
  createScheduledPost,
  deleteScheduledPost,
  finalizePostPublishing,
  getCalendarView,
  getDueScheduledPosts,
  getScheduledPost,
  getScheduledPostsStats,
  listScheduledPosts,
  markPostPublishing,
  recordAccountPublishResult,
  schedulePost,
  updateScheduledPost,
} from "./scheduled-posts";

// Publishing service
export {
  processScheduledPosts,
  type PublishingRunResult,
  publishScheduledPost,
} from "./publishing-service";

// Best-time recommendations
export type {
  BestTimeRecommendationsOptions,
  BestTimeRecommendationsResponse,
  CalendarGap,
  ConfidenceLevel,
  DailyEngagementPattern,
  DayOfWeek,
  HourOfDay,
  IndustryBenchmark,
  PlatformRecommendations,
  TimeSlotRecommendation,
} from "./best-time-types";

export {
  getBestTimeRecommendations,
  getIndustryBenchmarks,
  isRecommendedTimeSlot,
} from "./best-time-service";

// Content gap detection (Resolves #869)
export type {
  ContentGap,
  ContentGapDetectionOptions,
  ContentGapsResponse,
  GapSeverity,
  TimeSlot,
} from "./content-gaps";

export { detectContentGaps, getTimeSlotForHour, summarizeGaps } from "./content-gaps";

// AI Content Calendar (Issue #841)
export {
  acceptContentSuggestion,
  generateContentSuggestions,
  rejectContentSuggestion,
} from "./ai-content-service";

export { getHeatmapData, getOptimalTimes, refreshOptimalTimes } from "./optimal-time-service";

export { generateWeeklyPlan } from "./weekly-plan-service";
