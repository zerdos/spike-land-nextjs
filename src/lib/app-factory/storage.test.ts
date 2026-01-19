/**
 * Storage Utility Tests
 *
 * Tests for the app factory storage utilities, particularly isValidAppName
 * which is critical for security (prototype pollution / path traversal prevention).
 */

import { describe, expect, it } from "vitest";
import { isValidAppName } from "./storage";

describe("isValidAppName", () => {
  describe("valid app names", () => {
    it("accepts lowercase letters only", () => {
      expect(isValidAppName("myapp")).toBe(true);
      expect(isValidAppName("pomodoro")).toBe(true);
    });

    it("accepts lowercase letters with numbers", () => {
      expect(isValidAppName("app123")).toBe(true);
      expect(isValidAppName("2048game")).toBe(true);
      expect(isValidAppName("v2app")).toBe(true);
    });

    it("accepts lowercase letters with hyphens", () => {
      expect(isValidAppName("my-app")).toBe(true);
      expect(isValidAppName("pomodoro-timer")).toBe(true);
      expect(isValidAppName("todo-list-app")).toBe(true);
    });

    it("accepts single character names", () => {
      expect(isValidAppName("a")).toBe(true);
      expect(isValidAppName("1")).toBe(true);
    });

    it("accepts names at the boundary of 100 characters", () => {
      const longName = "a".repeat(100);
      expect(isValidAppName(longName)).toBe(true);
    });
  });

  describe("invalid - non-string types", () => {
    it("rejects null", () => {
      expect(isValidAppName(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(isValidAppName(undefined)).toBe(false);
    });

    it("rejects numbers", () => {
      expect(isValidAppName(123)).toBe(false);
      expect(isValidAppName(0)).toBe(false);
    });

    it("rejects objects", () => {
      expect(isValidAppName({})).toBe(false);
      expect(isValidAppName({ name: "app" })).toBe(false);
    });

    it("rejects arrays", () => {
      expect(isValidAppName([])).toBe(false);
      expect(isValidAppName(["app"])).toBe(false);
    });

    it("rejects booleans", () => {
      expect(isValidAppName(true)).toBe(false);
      expect(isValidAppName(false)).toBe(false);
    });
  });

  describe("invalid - empty or too long", () => {
    it("rejects empty string", () => {
      expect(isValidAppName("")).toBe(false);
    });

    it("rejects strings longer than 100 characters", () => {
      const tooLong = "a".repeat(101);
      expect(isValidAppName(tooLong)).toBe(false);
    });

    it("rejects strings much longer than limit", () => {
      const veryLong = "a".repeat(500);
      expect(isValidAppName(veryLong)).toBe(false);
    });
  });

  describe("security - prototype pollution prevention", () => {
    it("rejects __proto__", () => {
      expect(isValidAppName("__proto__")).toBe(false);
    });

    it("rejects constructor", () => {
      expect(isValidAppName("constructor")).toBe(false);
    });

    it("rejects prototype", () => {
      expect(isValidAppName("prototype")).toBe(false);
    });
  });

  describe("invalid - pattern violations", () => {
    it("rejects uppercase letters", () => {
      expect(isValidAppName("MyApp")).toBe(false);
      expect(isValidAppName("APP")).toBe(false);
      expect(isValidAppName("myApp")).toBe(false);
    });

    it("rejects underscores", () => {
      expect(isValidAppName("my_app")).toBe(false);
      expect(isValidAppName("_app")).toBe(false);
      expect(isValidAppName("app_")).toBe(false);
    });

    it("rejects spaces", () => {
      expect(isValidAppName("my app")).toBe(false);
      expect(isValidAppName(" app")).toBe(false);
      expect(isValidAppName("app ")).toBe(false);
    });

    it("rejects path traversal characters", () => {
      expect(isValidAppName("../app")).toBe(false);
      expect(isValidAppName("app/..")).toBe(false);
      expect(isValidAppName("./app")).toBe(false);
      expect(isValidAppName("app/../other")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(isValidAppName("app@test")).toBe(false);
      expect(isValidAppName("app#1")).toBe(false);
      expect(isValidAppName("app$")).toBe(false);
      expect(isValidAppName("app!")).toBe(false);
      expect(isValidAppName("app&test")).toBe(false);
    });

    it("rejects dots", () => {
      expect(isValidAppName("app.js")).toBe(false);
      expect(isValidAppName(".app")).toBe(false);
      expect(isValidAppName("my.app")).toBe(false);
    });
  });
});
