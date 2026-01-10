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
