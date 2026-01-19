/**
 * StatisticsPanel Tests
 *
 * Tests for the statistics panel component that displays pipeline metrics.
 */

import type { AppFactoryStatistics } from "@/types/app-factory";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatisticsPanel } from "./StatisticsPanel";

describe("StatisticsPanel", () => {
  // Use unique values to avoid conflicts in tests
  const baseStatistics: AppFactoryStatistics = {
    phaseCount: {
      plan: 51,
      develop: 102,
      test: 33,
      debug: 24,
      polish: 15,
      complete: 256,
      done: 178,
    },
    avgTimePerPhase: {
      plan: 60000, // 1 minute
      develop: 3600000, // 1 hour
      test: 1800000, // 30 minutes
      debug: 7200000, // 2 hours
      polish: 900000, // 15 minutes
      complete: 0, // N/A
      done: 0, // N/A
    },
    completedToday: 87,
    completedThisHour: 29,
    failedAttempts: 53,
    totalApps: 467,
    inProgressApps: 211,
  };

  describe("overview cards", () => {
    it("renders total apps count", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("Total Apps")).toBeInTheDocument();
      expect(screen.getByText("467")).toBeInTheDocument();
    });

    it("renders in progress count", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("211")).toBeInTheDocument();
    });

    it("renders completed today count", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("Completed Today")).toBeInTheDocument();
      // completedToday appears both in the card and in throughput/day section
      const elements = screen.getAllByText("87");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders failed attempts count", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("Failed Attempts")).toBeInTheDocument();
      expect(screen.getByText("53")).toBeInTheDocument();
    });
  });

  describe("phase breakdown", () => {
    it("renders all phase cards with emojis", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("📋")).toBeInTheDocument();
      expect(screen.getByText("💻")).toBeInTheDocument();
      expect(screen.getByText("🧪")).toBeInTheDocument();
      expect(screen.getByText("🔧")).toBeInTheDocument();
      expect(screen.getByText("✨")).toBeInTheDocument();
      expect(screen.getByText("✅")).toBeInTheDocument();
    });

    it("renders all phase labels", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      expect(screen.getByText("Plan")).toBeInTheDocument();
      expect(screen.getByText("Develop")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("Polish")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("renders phase counts", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      // Phase counts in the breakdown section
      expect(screen.getByText("51")).toBeInTheDocument(); // plan
      expect(screen.getByText("102")).toBeInTheDocument(); // develop
      expect(screen.getByText("33")).toBeInTheDocument(); // test
      expect(screen.getByText("24")).toBeInTheDocument(); // debug
      expect(screen.getByText("15")).toBeInTheDocument(); // polish
      expect(screen.getByText("256")).toBeInTheDocument(); // complete
    });

    it("renders average time per phase", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      // Check that average times are rendered (formatted)
      expect(screen.getByText("Avg: 1m")).toBeInTheDocument(); // plan - 1 minute
      expect(screen.getByText("Avg: 1h 0m")).toBeInTheDocument(); // develop - 1 hour
      expect(screen.getByText("Avg: 30m")).toBeInTheDocument(); // test - 30 minutes
      expect(screen.getByText("Avg: 2h 0m")).toBeInTheDocument(); // debug - 2 hours
      expect(screen.getByText("Avg: 15m")).toBeInTheDocument(); // polish - 15 minutes
      expect(screen.getByText("Avg: —")).toBeInTheDocument(); // complete - no time
    });
  });

  describe("throughput display", () => {
    it("renders hourly throughput", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      // Text is split across elements, so check the container has the pattern
      expect(screen.getByText(/Throughput:/i)).toBeInTheDocument();
      expect(screen.getByText("29")).toBeInTheDocument(); // completedThisHour
    });

    it("renders daily throughput", () => {
      render(<StatisticsPanel statistics={baseStatistics} />);

      // Daily throughput shows completedToday (87)
      const elements = screen.getAllByText("87");
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("zero values handling", () => {
    it("handles zero values gracefully", () => {
      const zeroStatistics: AppFactoryStatistics = {
        phaseCount: {
          plan: 0,
          develop: 0,
          test: 0,
          debug: 0,
          polish: 0,
          complete: 0,
          done: 0,
        },
        avgTimePerPhase: {
          plan: 0,
          develop: 0,
          test: 0,
          debug: 0,
          polish: 0,
          complete: 0,
          done: 0,
        },
        completedToday: 0,
        completedThisHour: 0,
        failedAttempts: 0,
        totalApps: 0,
        inProgressApps: 0,
      };

      render(<StatisticsPanel statistics={zeroStatistics} />);

      // Multiple zeros should be present
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles large numbers", () => {
      const largeStatistics: AppFactoryStatistics = {
        ...baseStatistics,
        totalApps: 1000000,
        completedToday: 9999,
      };

      render(<StatisticsPanel statistics={largeStatistics} />);

      expect(screen.getByText("1000000")).toBeInTheDocument();
      // completedToday appears in multiple places (card and throughput)
      const elements = screen.getAllByText("9999");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("handles long duration times (days)", () => {
      const longDurationStats: AppFactoryStatistics = {
        ...baseStatistics,
        avgTimePerPhase: {
          ...baseStatistics.avgTimePerPhase,
          debug: 172800000, // 2 days
        },
      };

      render(<StatisticsPanel statistics={longDurationStats} />);

      expect(screen.getByText("Avg: 2d 0h")).toBeInTheDocument();
    });
  });
});
