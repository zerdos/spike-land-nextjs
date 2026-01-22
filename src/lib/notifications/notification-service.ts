/**
 * Notification Service
 *
 * CRUD operations for workspace notifications.
 *
 * Resolves #802
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { Notification, Prisma } from "@prisma/client";

/**
 * Notification priority levels
 */
export type NotificationPriorityLevel = "low" | "medium" | "high" | "urgent";

/**
 * Data required to create a notification
 */
export interface CreateNotificationData {
  workspaceId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriorityLevel;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.JsonValue;
}

/**
 * Options for listing notifications
 */
export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

/**
 * Paginated notification list result
 */
export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Notification Service
 *
 * Provides CRUD operations for workspace notifications
 */
export const NotificationService = {
  /**
   * Create a new notification
   *
   * @param data - Notification data
   * @returns Created notification
   */
  async create(data: CreateNotificationData): Promise<Notification> {
    const { data: notification, error } = await tryCatch(
      prisma.notification.create({
        data: {
          workspaceId: data.workspaceId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority ?? "medium",
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata ?? {},
          read: false,
        },
      }),
    );

    if (error) {
      console.error("[NotificationService] Failed to create notification:", error);
      throw error;
    }

    return notification;
  },

  /**
   * Get notifications for a workspace (paginated)
   *
   * @param workspaceId - Workspace ID
   * @param options - Pagination and filter options
   * @returns Paginated notification list
   */
  async list(
    workspaceId: string,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationListResult> {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const where: Prisma.NotificationWhereInput = {
      workspaceId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notificationsResult, countResult] = await Promise.all([
      tryCatch(
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
      ),
      tryCatch(prisma.notification.count({ where })),
    ]);

    if (notificationsResult.error) {
      console.error(
        "[NotificationService] Failed to list notifications:",
        notificationsResult.error,
      );
      throw notificationsResult.error;
    }

    if (countResult.error) {
      console.error(
        "[NotificationService] Failed to count notifications:",
        countResult.error,
      );
      throw countResult.error;
    }

    return {
      notifications: notificationsResult.data,
      total: countResult.data,
      limit,
      offset,
    };
  },

  /**
   * Get unread notification count for a workspace
   *
   * @param workspaceId - Workspace ID
   * @returns Unread count
   */
  async getUnreadCount(workspaceId: string): Promise<number> {
    const { data: count, error } = await tryCatch(
      prisma.notification.count({
        where: {
          workspaceId,
          read: false,
        },
      }),
    );

    if (error) {
      console.error(
        "[NotificationService] Failed to get unread count:",
        error,
      );
      throw error;
    }

    return count;
  },

  /**
   * Mark a notification as read
   *
   * @param id - Notification ID
   * @returns Updated notification
   */
  async markAsRead(id: string): Promise<Notification> {
    const { data: notification, error } = await tryCatch(
      prisma.notification.update({
        where: { id },
        data: {
          read: true,
          readAt: new Date(),
        },
      }),
    );

    if (error) {
      console.error(
        "[NotificationService] Failed to mark notification as read:",
        error,
      );
      throw error;
    }

    return notification;
  },

  /**
   * Mark all notifications as read for a workspace
   *
   * @param workspaceId - Workspace ID
   */
  async markAllAsRead(workspaceId: string): Promise<void> {
    const { error } = await tryCatch(
      prisma.notification.updateMany({
        where: {
          workspaceId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      }),
    );

    if (error) {
      console.error(
        "[NotificationService] Failed to mark all notifications as read:",
        error,
      );
      throw error;
    }
  },

  /**
   * Delete a notification
   *
   * @param id - Notification ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await tryCatch(
      prisma.notification.delete({
        where: { id },
      }),
    );

    if (error) {
      console.error(
        "[NotificationService] Failed to delete notification:",
        error,
      );
      throw error;
    }
  },

  /**
   * Get a notification by ID
   *
   * @param id - Notification ID
   * @returns Notification or null if not found
   */
  async getById(id: string): Promise<Notification | null> {
    const { data: notification, error } = await tryCatch(
      prisma.notification.findUnique({
        where: { id },
      }),
    );

    if (error) {
      console.error(
        "[NotificationService] Failed to get notification:",
        error,
      );
      throw error;
    }

    return notification;
  },
};
