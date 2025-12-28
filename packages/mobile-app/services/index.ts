/**
 * Services barrel export
 */

// Core API client
export { apiClient } from "./api-client";
export type { ApiResponse, RequestOptions } from "./api-client";

// Authentication
export { authService } from "./auth";
export type {
  AuthProvider,
  AuthResult,
  EmailVerificationResult,
  PasswordResetResult,
  SessionInfo,
} from "./auth";

// Push Notifications
export {
  cancelAllNotifications,
  cancelNotification,
  clearBadge,
  deleteNotification,
  fetchNotifications,
  getBadgeCount,
  handleNotificationResponse,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  navigateFromNotification,
  registerDeviceWithServer,
  registerForPushNotifications,
  scheduleDelayedNotification,
  scheduleLocalNotification,
  setBadgeCount,
} from "./notifications";
export type {
  NotificationData,
  NotificationsListResponse,
  NotificationType,
  RegisterDeviceResponse,
  ServerNotification,
} from "./notifications";

// API Services
export * from "./api/admin";
export * from "./api/blog";
export * from "./api/images";
export * from "./api/jobs";
export * from "./api/merch";
export * from "./api/tokens";
