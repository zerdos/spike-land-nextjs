import type { WorkflowEvent } from "@/lib/events/event-bus";
import { describe, expect, it } from "vitest";
import { matchesFilter } from "./event-trigger";

describe("matchesFilter", () => {
  const createEvent = (data: Record<string, unknown>): WorkflowEvent => ({
    type: "MENTION_RECEIVED",
    workspaceId: "ws-1",
    timestamp: new Date(),
    data,
  });

  describe("no filter", () => {
    it("should match when filter is null", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, null)).toBe(true);
    });

    it("should match when filter is undefined", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, undefined)).toBe(true);
    });

    it("should match when filter is empty object", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, {})).toBe(true);
    });
  });

  describe("equality filter", () => {
    it("should match equal string values", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: "twitter" })).toBe(true);
    });

    it("should not match different string values", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: "instagram" })).toBe(false);
    });

    it("should match equal number values", () => {
      const event = createEvent({ count: 100 });
      expect(matchesFilter(event, { count: 100 })).toBe(true);
    });

    it("should match equal boolean values", () => {
      const event = createEvent({ verified: true });
      expect(matchesFilter(event, { verified: true })).toBe(true);
    });

    it("should match multiple conditions", () => {
      const event = createEvent({ platform: "twitter", type: "mention" });
      expect(matchesFilter(event, { platform: "twitter", type: "mention" })).toBe(true);
      expect(matchesFilter(event, { platform: "twitter", type: "reply" })).toBe(false);
    });
  });

  describe("comparison operators", () => {
    it("should match $gt (greater than)", () => {
      const event = createEvent({ likes: 100 });
      expect(matchesFilter(event, { likes: { $gt: 50 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $gt: 100 } })).toBe(false);
      expect(matchesFilter(event, { likes: { $gt: 150 } })).toBe(false);
    });

    it("should match $gte (greater than or equal)", () => {
      const event = createEvent({ likes: 100 });
      expect(matchesFilter(event, { likes: { $gte: 50 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $gte: 100 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $gte: 150 } })).toBe(false);
    });

    it("should match $lt (less than)", () => {
      const event = createEvent({ likes: 100 });
      expect(matchesFilter(event, { likes: { $lt: 150 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $lt: 100 } })).toBe(false);
      expect(matchesFilter(event, { likes: { $lt: 50 } })).toBe(false);
    });

    it("should match $lte (less than or equal)", () => {
      const event = createEvent({ likes: 100 });
      expect(matchesFilter(event, { likes: { $lte: 150 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $lte: 100 } })).toBe(true);
      expect(matchesFilter(event, { likes: { $lte: 50 } })).toBe(false);
    });
  });

  describe("array operators", () => {
    it("should match $in (value in array)", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: { $in: ["twitter", "instagram"] } })).toBe(true);
      expect(matchesFilter(event, { platform: { $in: ["facebook", "instagram"] } })).toBe(false);
    });

    it("should match $nin (value not in array)", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: { $nin: ["facebook", "instagram"] } })).toBe(true);
      expect(matchesFilter(event, { platform: { $nin: ["twitter", "instagram"] } })).toBe(false);
    });
  });

  describe("string operators", () => {
    it("should match $regex", () => {
      const event = createEvent({ content: "Hello @user!" });
      expect(matchesFilter(event, { content: { $regex: "@user" } })).toBe(true);
      expect(matchesFilter(event, { content: { $regex: "^Hello" } })).toBe(true);
      expect(matchesFilter(event, { content: { $regex: "goodbye" } })).toBe(false);
    });
  });

  describe("existence operators", () => {
    it("should match $exists: true for existing field", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: { $exists: true } })).toBe(true);
    });

    it("should not match $exists: true for missing field", () => {
      const event = createEvent({});
      expect(matchesFilter(event, { platform: { $exists: true } })).toBe(false);
    });

    it("should match $exists: false for missing field", () => {
      const event = createEvent({});
      expect(matchesFilter(event, { platform: { $exists: false } })).toBe(true);
    });

    it("should not match $exists: false for existing field", () => {
      const event = createEvent({ platform: "twitter" });
      expect(matchesFilter(event, { platform: { $exists: false } })).toBe(false);
    });

    it("should treat null as non-existent", () => {
      const event = createEvent({ platform: null });
      expect(matchesFilter(event, { platform: { $exists: true } })).toBe(false);
      expect(matchesFilter(event, { platform: { $exists: false } })).toBe(true);
    });
  });

  describe("combined operators", () => {
    it("should match multiple operators on same field", () => {
      const event = createEvent({ likes: 100 });
      expect(
        matchesFilter(event, {
          likes: { $gte: 50, $lte: 150 },
        }),
      ).toBe(true);
      expect(
        matchesFilter(event, {
          likes: { $gte: 150, $lte: 200 },
        }),
      ).toBe(false);
    });

    it("should match complex filters", () => {
      const event = createEvent({
        platform: "twitter",
        likes: 500,
        verified: true,
      });

      expect(
        matchesFilter(event, {
          platform: { $in: ["twitter", "instagram"] },
          likes: { $gt: 100 },
          verified: true,
        }),
      ).toBe(true);

      expect(
        matchesFilter(event, {
          platform: { $in: ["twitter", "instagram"] },
          likes: { $gt: 1000 }, // This fails
          verified: true,
        }),
      ).toBe(false);
    });
  });
});
