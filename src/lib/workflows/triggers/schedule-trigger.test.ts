import { describe, expect, it } from "vitest";
import {
  describeCronExpression,
  getNextRunTime,
  parseCronExpression,
  validateCronExpression,
} from "./schedule-trigger";

describe("parseCronExpression", () => {
  it("should parse simple expressions", () => {
    const result = parseCronExpression("0 0 * * *"); // Every day at midnight

    expect(result).not.toBeNull();
    expect(result?.minutes).toEqual([0]);
    expect(result?.hours).toEqual([0]);
    expect(result?.daysOfMonth.length).toBe(31);
    expect(result?.months.length).toBe(12);
    expect(result?.daysOfWeek.length).toBe(7);
  });

  it("should parse wildcards", () => {
    const result = parseCronExpression("* * * * *"); // Every minute

    expect(result).not.toBeNull();
    expect(result?.minutes.length).toBe(60);
    expect(result?.hours.length).toBe(24);
  });

  it("should parse ranges", () => {
    const result = parseCronExpression("0-5 9-17 * * *"); // First 5 minutes of business hours

    expect(result).not.toBeNull();
    expect(result?.minutes).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result?.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it("should parse steps", () => {
    const result = parseCronExpression("*/15 * * * *"); // Every 15 minutes

    expect(result).not.toBeNull();
    expect(result?.minutes).toEqual([0, 15, 30, 45]);
  });

  it("should parse lists", () => {
    const result = parseCronExpression("0 9,12,18 * * *"); // 9am, noon, 6pm

    expect(result).not.toBeNull();
    expect(result?.hours).toEqual([9, 12, 18]);
  });

  it("should parse combined expressions", () => {
    const result = parseCronExpression("0,30 9-17/2 * * 1-5"); // Every 30 min, odd business hours, weekdays

    expect(result).not.toBeNull();
    expect(result?.minutes).toEqual([0, 30]);
    expect(result?.hours).toEqual([9, 11, 13, 15, 17]);
    expect(result?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it("should normalize day of week 7 to 0", () => {
    const result = parseCronExpression("0 0 * * 7"); // Sunday (using 7)

    expect(result).not.toBeNull();
    expect(result?.daysOfWeek).toEqual([0]);
  });

  it("should return null for invalid expressions", () => {
    expect(parseCronExpression("invalid")).toBeNull();
    expect(parseCronExpression("0 0 * *")).toBeNull(); // Missing field
    expect(parseCronExpression("60 * * * *")).toBeNull(); // Invalid minute
    expect(parseCronExpression("* 25 * * *")).toBeNull(); // Invalid hour
    expect(parseCronExpression("* * 32 * *")).toBeNull(); // Invalid day
    expect(parseCronExpression("* * * 13 *")).toBeNull(); // Invalid month
    expect(parseCronExpression("* * * * 8")).toBeNull(); // Invalid day of week
  });

  it("should handle invalid step values", () => {
    expect(parseCronExpression("*/0 * * * *")).toBeNull(); // Step of 0
  });

  it("should handle invalid range values", () => {
    expect(parseCronExpression("5-3 * * * *")).toBeNull(); // Start > end
  });
});

describe("validateCronExpression", () => {
  it("should return valid for correct expressions", () => {
    expect(validateCronExpression("0 0 * * *")).toEqual({ valid: true });
    expect(validateCronExpression("*/5 * * * *")).toEqual({ valid: true });
    expect(validateCronExpression("0 9-17 * * 1-5")).toEqual({ valid: true });
  });

  it("should return error for invalid expressions", () => {
    const result = validateCronExpression("invalid");

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("getNextRunTime", () => {
  it("should calculate next run time for simple expression", () => {
    const cron = parseCronExpression("0 12 * * *")!; // Every day at noon
    const after = new Date("2024-01-15T10:00:00Z");

    const next = getNextRunTime(cron, after, "UTC");

    expect(next).not.toBeNull();
    expect(next?.getUTCHours()).toBe(12);
    expect(next?.getUTCMinutes()).toBe(0);
    expect(next?.getUTCDate()).toBe(15); // Same day since it's before noon
  });

  it("should roll over to next day if time passed", () => {
    const cron = parseCronExpression("0 12 * * *")!; // Every day at noon
    const after = new Date("2024-01-15T14:00:00Z");

    const next = getNextRunTime(cron, after, "UTC");

    expect(next).not.toBeNull();
    expect(next?.getUTCHours()).toBe(12);
    expect(next?.getUTCDate()).toBe(16); // Next day
  });

  it("should handle every minute expression", () => {
    const cron = parseCronExpression("* * * * *")!;
    const after = new Date("2024-01-15T10:30:30Z");

    const next = getNextRunTime(cron, after, "UTC");

    expect(next).not.toBeNull();
    expect(next?.getUTCMinutes()).toBe(31); // Next minute
  });

  it("should handle day of week restrictions", () => {
    const cron = parseCronExpression("0 9 * * 1")!; // Every Monday at 9am
    const after = new Date("2024-01-15T10:00:00Z"); // Monday

    const next = getNextRunTime(cron, after, "UTC");

    expect(next).not.toBeNull();
    // Should be next Monday since we're past 9am
    expect(next?.getDay()).toBe(1);
    expect(next?.getUTCHours()).toBe(9);
  });

  it("should return null if no valid time within a year", () => {
    // This is an edge case - a cron that never matches
    // In practice, this shouldn't happen with valid cron expressions
    const cron = {
      minutes: [],
      hours: [],
      daysOfMonth: [],
      months: [],
      daysOfWeek: [],
    };

    const next = getNextRunTime(cron, new Date(), "UTC");

    expect(next).toBeNull();
  });
});

describe("describeCronExpression", () => {
  it("should describe every minute", () => {
    const desc = describeCronExpression("* * * * *");

    expect(desc).toContain("every minute");
  });

  it("should describe specific minute", () => {
    const desc = describeCronExpression("0 * * * *");

    expect(desc).toContain("minute 0");
  });

  it("should describe specific hour", () => {
    const desc = describeCronExpression("0 9 * * *");

    expect(desc).toContain("hour 9");
  });

  it("should return null for invalid expressions", () => {
    expect(describeCronExpression("invalid")).toBeNull();
  });
});
