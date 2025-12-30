/**
 * Services barrel export
 */

// Core API client
export type { ApiResponse } from "./api-client";

// Authentication
export { authService } from "./auth";
export type { AuthProvider, AuthResult } from "./auth";

// Push Notifications
export {
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
