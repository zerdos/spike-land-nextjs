import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emitCrisisDetected,
  emitEngagementThreshold,
  emitFollowerMilestone,
  emitInboxItemReceived,
  emitMentionReceived,
  emitPostPublished,
  EventBus,
  eventBus,
  type WorkflowEvent,
} from "./event-bus";

describe("EventBus", () => {
  afterEach(() => {
    eventBus.clear();
  });

  describe("subscribe", () => {
    it("should subscribe to an event type", () => {
      const handler = vi.fn();
      const subId = eventBus.subscribe("MENTION_RECEIVED", handler);

      expect(subId).toBeDefined();
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.getSubscriptionCountByType("MENTION_RECEIVED")).toBe(1);
    });

    it("should allow multiple subscriptions to the same event type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", handler1);
      eventBus.subscribe("MENTION_RECEIVED", handler2);

      expect(eventBus.getSubscriptionCount()).toBe(2);
      expect(eventBus.getSubscriptionCountByType("MENTION_RECEIVED")).toBe(2);
    });

    it("should track subscriptions by event type", () => {
      const handler = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", handler);
      eventBus.subscribe("POST_PUBLISHED", handler);

      expect(eventBus.getSubscriptionCountByType("MENTION_RECEIVED")).toBe(1);
      expect(eventBus.getSubscriptionCountByType("POST_PUBLISHED")).toBe(1);
      expect(eventBus.getSubscriptionCountByType("CRISIS_DETECTED")).toBe(0);
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe from events", () => {
      const handler = vi.fn();
      const subId = eventBus.subscribe("MENTION_RECEIVED", handler);

      expect(eventBus.getSubscriptionCount()).toBe(1);

      eventBus.unsubscribe(subId);

      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it("should handle unsubscribing non-existent subscription", () => {
      expect(() => eventBus.unsubscribe("non-existent")).not.toThrow();
    });
  });

  describe("emit", () => {
    it("should emit events to all subscribers", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", handler1);
      eventBus.subscribe("MENTION_RECEIVED", handler2);

      const event: WorkflowEvent = {
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        timestamp: new Date(),
        data: { platform: "twitter" },
      };

      await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should not emit to subscribers of different event types", async () => {
      const mentionHandler = vi.fn();
      const postHandler = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", mentionHandler);
      eventBus.subscribe("POST_PUBLISHED", postHandler);

      const event: WorkflowEvent = {
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        timestamp: new Date(),
        data: {},
      };

      await eventBus.emit(event);

      expect(mentionHandler).toHaveBeenCalledWith(event);
      expect(postHandler).not.toHaveBeenCalled();
    });

    it("should filter by workspace when specified", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", handler1, "ws-1");
      eventBus.subscribe("MENTION_RECEIVED", handler2, "ws-2");

      const event: WorkflowEvent = {
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        timestamp: new Date(),
        data: {},
      };

      await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).not.toHaveBeenCalled();
    });

    it("should capture errors from handlers", async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error("Handler error"));
      const successHandler = vi.fn();

      eventBus.subscribe("MENTION_RECEIVED", errorHandler);
      eventBus.subscribe("MENTION_RECEIVED", successHandler);

      const event: WorkflowEvent = {
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        timestamp: new Date(),
        data: {},
      };

      const results = await eventBus.emit(event);

      // Both handlers should be called
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();

      // Error should be captured
      const errorResult = results.find((r) => r.error);
      expect(errorResult).toBeDefined();
      expect(errorResult?.error?.message).toBe("Handler error");
    });

    it("should return empty results for event type with no subscribers", async () => {
      const event: WorkflowEvent = {
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        timestamp: new Date(),
        data: {},
      };

      const results = await eventBus.emit(event);

      expect(results).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should clear all subscriptions", () => {
      eventBus.subscribe("MENTION_RECEIVED", vi.fn());
      eventBus.subscribe("POST_PUBLISHED", vi.fn());

      expect(eventBus.getSubscriptionCount()).toBe(2);

      eventBus.clear();

      expect(eventBus.getSubscriptionCount()).toBe(0);
    });
  });
});

describe("Event Helpers", () => {
  afterEach(() => {
    eventBus.clear();
  });

  it("emitMentionReceived should emit MENTION_RECEIVED event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("MENTION_RECEIVED", handler);

    await emitMentionReceived("ws-1", {
      platform: "twitter",
      accountId: "acc-1",
      mentionId: "m-1",
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MENTION_RECEIVED",
        workspaceId: "ws-1",
        data: expect.objectContaining({
          platform: "twitter",
          accountId: "acc-1",
          mentionId: "m-1",
        }),
      }),
    );
  });

  it("emitEngagementThreshold should emit ENGAGEMENT_THRESHOLD event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("ENGAGEMENT_THRESHOLD", handler);

    await emitEngagementThreshold("ws-1", {
      postId: "p-1",
      platform: "instagram",
      metric: "likes",
      threshold: 1000,
      currentValue: 1050,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ENGAGEMENT_THRESHOLD",
        workspaceId: "ws-1",
      }),
    );
  });

  it("emitFollowerMilestone should emit FOLLOWER_MILESTONE event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("FOLLOWER_MILESTONE", handler);

    await emitFollowerMilestone("ws-1", {
      accountId: "acc-1",
      platform: "youtube",
      milestone: 10000,
      currentCount: 10050,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FOLLOWER_MILESTONE",
        workspaceId: "ws-1",
      }),
    );
  });

  it("emitCrisisDetected should emit CRISIS_DETECTED event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("CRISIS_DETECTED", handler);

    await emitCrisisDetected("ws-1", {
      severity: "high",
      description: "Negative sentiment spike",
      detectionSource: "sentiment-analyzer",
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CRISIS_DETECTED",
        workspaceId: "ws-1",
      }),
    );
  });

  it("emitPostPublished should emit POST_PUBLISHED event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("POST_PUBLISHED", handler);

    await emitPostPublished("ws-1", {
      postId: "p-1",
      platform: "facebook",
      accountId: "acc-1",
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POST_PUBLISHED",
        workspaceId: "ws-1",
      }),
    );
  });

  it("emitInboxItemReceived should emit INBOX_ITEM_RECEIVED event", async () => {
    const handler = vi.fn();
    eventBus.subscribe("INBOX_ITEM_RECEIVED", handler);

    await emitInboxItemReceived("ws-1", {
      inboxItemId: "i-1",
      platform: "twitter",
      accountId: "acc-1",
      itemType: "dm",
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INBOX_ITEM_RECEIVED",
        workspaceId: "ws-1",
      }),
    );
  });
});

describe("EventBus isolation", () => {
  it("should create independent instances", async () => {
    const bus1 = new EventBus();
    const bus2 = new EventBus();

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus1.subscribe("MENTION_RECEIVED", handler1);
    bus2.subscribe("MENTION_RECEIVED", handler2);

    await bus1.emit({
      type: "MENTION_RECEIVED",
      workspaceId: "ws-1",
      timestamp: new Date(),
      data: {},
    });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});
