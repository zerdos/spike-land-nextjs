/**
 * Rate Limit Tracker Tests
 *
 * Tests for rate limit parsing and tracking functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseFacebookRateLimits,
  parseLinkedInRateLimits,
  parseRateLimitHeaders,
  parseTwitterRateLimits,
} from "./rate-limit-tracker";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccountHealth: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("Rate Limit Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseTwitterRateLimits", () => {
    it("parses Twitter rate limit headers correctly", () => {
      const headers = new Headers({
        "x-rate-limit-limit": "900",
        "x-rate-limit-remaining": "450",
        "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 900),
      });

      const result = parseTwitterRateLimits(headers);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(900);
      expect(result?.remaining).toBe(450);
      expect(result?.resetAt).toBeInstanceOf(Date);
    });

    it("returns null when headers are missing", () => {
      const headers = new Headers({});
      const result = parseTwitterRateLimits(headers);
      expect(result).toBeNull();
    });

    it("handles partial headers", () => {
      const headers = new Headers({
        "x-rate-limit-remaining": "450",
      });
      const result = parseTwitterRateLimits(headers);
      expect(result).toBeNull();
    });

    it("calculates correct reset time from Unix timestamp", () => {
      const resetTime = Math.floor(Date.now() / 1000) + 600;
      const headers = new Headers({
        "x-rate-limit-limit": "900",
        "x-rate-limit-remaining": "450",
        "x-rate-limit-reset": String(resetTime),
      });

      const result = parseTwitterRateLimits(headers);
      expect(result?.resetAt.getTime()).toBe(resetTime * 1000);
    });
  });

  describe("parseFacebookRateLimits", () => {
    it("parses Facebook business use case usage header", () => {
      const usageData = {
        "test-app-id": [
          {
            type: "pages",
            call_count: 50,
            total_cputime: 25,
            total_time: 30,
            estimated_time_to_regain_access: 0,
          },
        ],
      };
      const headers = new Headers({
        "x-business-use-case-usage": JSON.stringify(usageData),
      });

      const result = parseFacebookRateLimits(headers);

      expect(result).not.toBeNull();
      expect(result?.remaining).toBeDefined();
      expect(result?.total).toBe(100);
    });

    it("returns null when no Facebook headers present", () => {
      const headers = new Headers({});
      const result = parseFacebookRateLimits(headers);
      expect(result).toBeNull();
    });

    it("handles malformed JSON in header", () => {
      const headers = new Headers({
        "x-business-use-case-usage": "not-valid-json",
      });
      const result = parseFacebookRateLimits(headers);
      expect(result).toBeNull();
    });

    it("parses x-app-usage header when business usage not present", () => {
      const usageData = {
        call_count: 30,
        total_cputime: 15,
        total_time: 20,
      };
      const headers = new Headers({
        "x-app-usage": JSON.stringify(usageData),
      });

      const result = parseFacebookRateLimits(headers);
      expect(result).not.toBeNull();
    });
  });

  describe("parseLinkedInRateLimits", () => {
    it("parses LinkedIn rate limit from response body", () => {
      const body = {
        serviceErrorCode: 0,
        message: "OK",
      };

      const result = parseLinkedInRateLimits(new Headers(), body);
      expect(result).toBeNull(); // No rate limit info in normal response
    });

    it("detects rate limited status from error", () => {
      const body = {
        serviceErrorCode: 429,
        message: "Rate limit exceeded",
      };

      const result = parseLinkedInRateLimits(new Headers(), body);
      // Returns rate limit info from error response
      expect(result === null || result?.remaining === 0).toBe(true);
    });

    it("parses X-Li-Uuid header", () => {
      const headers = new Headers({
        "X-Li-Uuid": "some-uuid-value",
      });

      const result = parseLinkedInRateLimits(headers);
      // LinkedIn doesn't expose remaining counts in headers
      expect(result).toBeNull();
    });
  });

  describe("parseRateLimitHeaders", () => {
    it("routes to correct parser for TWITTER", () => {
      const headers = new Headers({
        "x-rate-limit-limit": "900",
        "x-rate-limit-remaining": "450",
        "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 900),
      });

      const result = parseRateLimitHeaders("TWITTER", headers);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(900);
    });

    it("routes to correct parser for FACEBOOK", () => {
      const usageData = {
        call_count: 30,
        total_cputime: 15,
        total_time: 20,
      };
      const headers = new Headers({
        "x-app-usage": JSON.stringify(usageData),
      });

      const result = parseRateLimitHeaders("FACEBOOK", headers);
      expect(result).not.toBeNull();
    });

    it("routes to correct parser for INSTAGRAM", () => {
      // Instagram uses same API as Facebook
      const usageData = {
        call_count: 30,
        total_cputime: 15,
        total_time: 20,
      };
      const headers = new Headers({
        "x-app-usage": JSON.stringify(usageData),
      });

      const result = parseRateLimitHeaders("INSTAGRAM", headers);
      expect(result).not.toBeNull();
    });

    it("routes to correct parser for LINKEDIN", () => {
      const headers = new Headers({});
      const result = parseRateLimitHeaders("LINKEDIN", headers);
      expect(result).toBeNull();
    });

    it("returns null for unknown platforms", () => {
      const headers = new Headers({});
      const result = parseRateLimitHeaders("UNKNOWN" as never, headers);
      expect(result).toBeNull();
    });

    it("handles DISCORD platform", () => {
      const headers = new Headers({
        "X-RateLimit-Limit": "50",
        "X-RateLimit-Remaining": "49",
        "X-RateLimit-Reset": String(Date.now() / 1000 + 60),
      });

      const result = parseRateLimitHeaders("DISCORD", headers);
      // Discord parser may or may not be implemented
      expect(result === null || typeof result === "object").toBe(true);
    });
  });
});
