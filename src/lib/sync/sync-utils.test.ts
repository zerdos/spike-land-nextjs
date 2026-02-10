import { describe, expect, it } from "vitest";

import {
  type BridgeMindCard,
  bridgemindCardToGitHubIssue,
  compareVersions,
  mapBridgemindStatus,
} from "./sync-utils";

describe("mapBridgemindStatus", () => {
  it("should map known statuses correctly", () => {
    expect(mapBridgemindStatus("backlog")).toBe("Backlog");
    expect(mapBridgemindStatus("todo")).toBe("Todo");
    expect(mapBridgemindStatus("to do")).toBe("Todo");
    expect(mapBridgemindStatus("in progress")).toBe("In Progress");
    expect(mapBridgemindStatus("in_progress")).toBe("In Progress");
    expect(mapBridgemindStatus("in-progress")).toBe("In Progress");
    expect(mapBridgemindStatus("review")).toBe("In Review");
    expect(mapBridgemindStatus("in review")).toBe("In Review");
    expect(mapBridgemindStatus("in_review")).toBe("In Review");
    expect(mapBridgemindStatus("done")).toBe("Done");
    expect(mapBridgemindStatus("completed")).toBe("Done");
    expect(mapBridgemindStatus("closed")).toBe("Done");
    expect(mapBridgemindStatus("cancelled")).toBe("Cancelled");
    expect(mapBridgemindStatus("canceled")).toBe("Cancelled");
    expect(mapBridgemindStatus("blocked")).toBe("Blocked");
  });

  it("should handle case-insensitive input", () => {
    expect(mapBridgemindStatus("BACKLOG")).toBe("Backlog");
    expect(mapBridgemindStatus("In Progress")).toBe("In Progress");
    expect(mapBridgemindStatus("DONE")).toBe("Done");
  });

  it("should handle leading/trailing whitespace", () => {
    expect(mapBridgemindStatus("  backlog  ")).toBe("Backlog");
    expect(mapBridgemindStatus("  in progress  ")).toBe("In Progress");
  });

  it("should return 'Backlog' for empty string", () => {
    expect(mapBridgemindStatus("")).toBe("Backlog");
  });

  it("should title-case unknown statuses", () => {
    expect(mapBridgemindStatus("custom status")).toBe("Custom Status");
    expect(mapBridgemindStatus("needs-triage")).toBe("Needs Triage");
    expect(mapBridgemindStatus("waiting_for_input")).toBe("Waiting For Input");
  });
});

describe("bridgemindCardToGitHubIssue", () => {
  const baseCard: BridgeMindCard = {
    id: "bm-123",
    title: "Fix authentication bug",
    description: "Users are unable to log in after password reset.",
    status: "in progress",
    priority: "high",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-16T14:30:00Z",
  };

  it("should transform a basic card to GitHub issue payload", () => {
    const result = bridgemindCardToGitHubIssue(baseCard);

    expect(result.title).toBe("Fix authentication bug");
    expect(result.body).toContain("Users are unable to log in after password reset.");
    expect(result.body).toContain("bm-123");
    expect(result.body).toContain("in progress");
    expect(result.labels).toContain("p-high");
    expect(result.labels).toContain("bridgemind-sync");
  });

  it("should include card labels in issue labels", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      labels: ["bug", "auth"],
    };

    const result = bridgemindCardToGitHubIssue(card);

    expect(result.labels).toContain("bug");
    expect(result.labels).toContain("auth");
    expect(result.labels).toContain("p-high");
    expect(result.labels).toContain("bridgemind-sync");
  });

  it("should include assignee in body when present", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      assignee: "zerdos",
    };

    const result = bridgemindCardToGitHubIssue(card);

    expect(result.body).toContain("Assignee: zerdos");
  });

  it("should include sprint in body when present", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      sprintId: "sprint-42",
    };

    const result = bridgemindCardToGitHubIssue(card);

    expect(result.body).toContain("Sprint: sprint-42");
  });

  it("should handle card with no priority", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      priority: "",
    };

    const result = bridgemindCardToGitHubIssue(card);

    // Should not include an empty priority label
    expect(result.labels).not.toContain("p-");
    expect(result.labels).toContain("bridgemind-sync");
  });

  it("should handle card with no description", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      description: "",
    };

    const result = bridgemindCardToGitHubIssue(card);

    expect(result.body).toContain("bm-123");
    expect(result.title).toBe("Fix authentication bug");
  });

  it("should handle card with no labels", () => {
    const card: BridgeMindCard = {
      ...baseCard,
      labels: undefined,
    };

    const result = bridgemindCardToGitHubIssue(card);

    expect(result.labels).toContain("p-high");
    expect(result.labels).toContain("bridgemind-sync");
    expect(result.labels).toHaveLength(2);
  });
});

describe("compareVersions", () => {
  it("should return 0 for equal null/undefined values", () => {
    expect(compareVersions(null, null)).toBe(0);
    expect(compareVersions(undefined, undefined)).toBe(0);
    expect(compareVersions(null, undefined)).toBe(0);
  });

  it("should treat null/undefined as oldest", () => {
    expect(compareVersions(null, "1")).toBe(-1);
    expect(compareVersions("1", null)).toBe(1);
    expect(compareVersions(undefined, "any")).toBe(-1);
    expect(compareVersions("any", undefined)).toBe(1);
  });

  it("should compare ISO date strings", () => {
    expect(compareVersions("2025-01-15T10:00:00Z", "2025-01-16T10:00:00Z")).toBe(-1);
    expect(compareVersions("2025-01-16T10:00:00Z", "2025-01-15T10:00:00Z")).toBe(1);
    expect(compareVersions("2025-01-15T10:00:00Z", "2025-01-15T10:00:00Z")).toBe(0);
  });

  it("should compare numeric version strings", () => {
    // Short numerics may parse as dates, so also test scientific notation
    // which is valid for Number() but NaN for Date.parse()
    expect(compareVersions("1e2", "2e2")).toBe(-1);
    expect(compareVersions("3e2", "1e2")).toBe(1);
    expect(compareVersions("1e2", "1e2")).toBe(0);
  });

  it("should fall back to lexicographic comparison for non-date/non-numeric strings", () => {
    expect(compareVersions("alpha", "beta")).toBe(-1);
    expect(compareVersions("beta", "alpha")).toBe(1);
    expect(compareVersions("same", "same")).toBe(0);
  });
});
