/**
 * ActivityFeed Tests
 *
 * Tests for the activity feed component that displays pipeline events.
 */

import type { HistoryEntry } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityFeed } from "./ActivityFeed";

describe("ActivityFeed", () => {
  describe("empty state", () => {
    it("renders empty state message when no activity", () => {
      render(<ActivityFeed activity={[]} />);

      expect(screen.getByText("No activity yet")).toBeInTheDocument();
      expect(
        screen.getByText("Events will appear here as apps move through the pipeline"),
      ).toBeInTheDocument();
    });

    it("renders Activity Feed title even when empty", () => {
      render(<ActivityFeed activity={[]} />);

      expect(screen.getByText("Activity Feed")).toBeInTheDocument();
    });
  });

  describe("rendering entries", () => {
    const baseEntry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      appName: "test-app",
      event: "initialized",
    };

    it("renders entry app name", () => {
      render(<ActivityFeed activity={[baseEntry]} />);

      expect(screen.getByText("test-app")).toBeInTheDocument();
    });

    it("renders Activity Feed title", () => {
      render(<ActivityFeed activity={[baseEntry]} />);

      expect(screen.getByText("Activity Feed")).toBeInTheDocument();
    });
  });

  describe("event types", () => {
    it("renders initialized event with New badge", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "new-app",
        event: "initialized",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("new-app")).toBeInTheDocument();
    });

    it("renders phase_complete event with phase transition", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "completing-app",
        event: "phase_complete",
        from: "develop",
        to: "test",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("completing-app")).toBeInTheDocument();
      expect(screen.getByText("Develop")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("renders phase_failed event with Failed badge", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "failed-app",
        event: "phase_failed",
        from: "test",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByText("failed-app")).toBeInTheDocument();
    });

    it("renders manual_move event with Manual badge", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "moved-app",
        event: "manual_move",
        from: "develop",
        to: "debug",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("Manual")).toBeInTheDocument();
      expect(screen.getByText("moved-app")).toBeInTheDocument();
      expect(screen.getByText("Develop")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
    });
  });

  describe("reason display", () => {
    it("shows reason when provided", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "app-with-reason",
        event: "phase_failed",
        reason: "Build failed: missing dependency",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("Build failed: missing dependency")).toBeInTheDocument();
    });

    it("does not show reason section when not provided", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "app-no-reason",
        event: "initialized",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.queryByText(/Build failed/)).not.toBeInTheDocument();
    });
  });

  describe("timestamp display", () => {
    it("shows just now for very recent entries", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "recent-app",
        event: "initialized",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("shows minutes ago for entries within the hour", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const entry: HistoryEntry = {
        timestamp: fiveMinutesAgo,
        appName: "old-app",
        event: "initialized",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("shows hours ago for entries within the day", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const entry: HistoryEntry = {
        timestamp: twoHoursAgo,
        appName: "hours-old-app",
        event: "initialized",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });
  });

  describe("multiple entries", () => {
    it("renders multiple entries correctly", () => {
      const entries: HistoryEntry[] = [
        {
          timestamp: new Date().toISOString(),
          appName: "app-1",
          event: "initialized",
        },
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          appName: "app-2",
          event: "phase_complete",
          from: "plan",
          to: "develop",
        },
        {
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          appName: "app-3",
          event: "phase_failed",
        },
      ];

      render(<ActivityFeed activity={entries} />);

      expect(screen.getByText("app-1")).toBeInTheDocument();
      expect(screen.getByText("app-2")).toBeInTheDocument();
      expect(screen.getByText("app-3")).toBeInTheDocument();
    });
  });

  describe("Jules events", () => {
    it("handles jules_started event", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "jules-app",
        event: "jules_started",
        julesSessionId: "session-123",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("jules-app")).toBeInTheDocument();
    });

    it("handles jules_completed event", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "completed-jules-app",
        event: "jules_completed",
        julesSessionId: "session-456",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("completed-jules-app")).toBeInTheDocument();
    });

    it("handles jules_failed event", () => {
      const entry: HistoryEntry = {
        timestamp: new Date().toISOString(),
        appName: "failed-jules-app",
        event: "jules_failed",
        reason: "Session timed out",
      };

      render(<ActivityFeed activity={[entry]} />);

      expect(screen.getByText("failed-jules-app")).toBeInTheDocument();
      expect(screen.getByText("Session timed out")).toBeInTheDocument();
    });
  });
});
