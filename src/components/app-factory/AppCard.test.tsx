/**
 * AppCard Tests
 *
 * Tests for the draggable app card component used in the Kanban board.
 */

import type { AppState } from "@/types/app-factory";
import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppCard } from "./AppCard";

// Wrapper component that provides DndContext required by useDraggable
function TestWrapper({ children }: { children: React.ReactNode; }) {
  return <DndContext>{children}</DndContext>;
}

describe("AppCard", () => {
  const baseApp: AppState = {
    name: "test-app",
    category: "utility",
    phase: "develop",
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe("rendering", () => {
    it("renders app name", () => {
      render(
        <TestWrapper>
          <AppCard app={baseApp} />
        </TestWrapper>,
      );

      expect(screen.getByText("test-app")).toBeInTheDocument();
    });

    it("renders app category", () => {
      render(
        <TestWrapper>
          <AppCard app={baseApp} />
        </TestWrapper>,
      );

      expect(screen.getByText("utility")).toBeInTheDocument();
    });

    it("renders phase label and emoji", () => {
      render(
        <TestWrapper>
          <AppCard app={baseApp} />
        </TestWrapper>,
      );

      expect(screen.getByText("Develop")).toBeInTheDocument();
      expect(screen.getByText("💻")).toBeInTheDocument();
    });
  });

  describe("attempt count display", () => {
    it("does not show attempt badge when attempts is 0", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, attempts: 0 }} />
        </TestWrapper>,
      );

      expect(screen.queryByText("0x")).not.toBeInTheDocument();
    });

    it("shows attempt badge when attempts is 1", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, attempts: 1 }} />
        </TestWrapper>,
      );

      expect(screen.getByText("1x")).toBeInTheDocument();
    });

    it("shows attempt badge when attempts is 2", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, attempts: 2 }} />
        </TestWrapper>,
      );

      expect(screen.getByText("2x")).toBeInTheDocument();
    });

    it("shows destructive variant badge for 3+ attempts", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, attempts: 3 }} />
        </TestWrapper>,
      );

      const badge = screen.getByText("3x");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Jules session display", () => {
    it("shows Jules session status when julesSessionId is present", () => {
      const appWithSession: AppState = {
        ...baseApp,
        julesSessionId: "session-123",
        julesSessionState: "IN_PROGRESS",
      };

      render(
        <TestWrapper>
          <AppCard app={appWithSession} />
        </TestWrapper>,
      );

      expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
    });

    it("shows session link when julesSessionUrl is present", () => {
      const appWithSession: AppState = {
        ...baseApp,
        julesSessionId: "session-123",
        julesSessionState: "PLANNING",
        julesSessionUrl: "https://jules.example.com/session-123",
      };

      render(
        <TestWrapper>
          <AppCard app={appWithSession} />
        </TestWrapper>,
      );

      const links = screen.getAllByRole("link");
      const julesLink = links.find((l) => l.getAttribute("href")?.includes("jules.example.com"));
      expect(julesLink).toHaveAttribute("href", "https://jules.example.com/session-123");
      expect(julesLink).toHaveAttribute("target", "_blank");
      expect(julesLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not show session info when julesSessionId is not present", () => {
      render(
        <TestWrapper>
          <AppCard app={baseApp} />
        </TestWrapper>,
      );

      expect(screen.queryByText("IN_PROGRESS")).not.toBeInTheDocument();
      expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    });
  });

  describe("error display", () => {
    it("shows error message when lastError is present", () => {
      const appWithError: AppState = {
        ...baseApp,
        lastError: "Build failed: syntax error",
      };

      render(
        <TestWrapper>
          <AppCard app={appWithError} />
        </TestWrapper>,
      );

      expect(screen.getByText("Build failed: syntax error")).toBeInTheDocument();
    });

    it("does not show error when lastError is null", () => {
      const appNoError: AppState = {
        ...baseApp,
        lastError: null,
      };

      render(
        <TestWrapper>
          <AppCard app={appNoError} />
        </TestWrapper>,
      );

      // No error text should be visible
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it("does not show error when lastError is undefined", () => {
      render(
        <TestWrapper>
          <AppCard app={baseApp} />
        </TestWrapper>,
      );

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("phase display", () => {
    it("renders correctly for plan phase", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, phase: "plan" }} />
        </TestWrapper>,
      );

      expect(screen.getByText("Plan")).toBeInTheDocument();
      expect(screen.getByText("📋")).toBeInTheDocument();
    });

    it("renders correctly for test phase", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, phase: "test" }} />
        </TestWrapper>,
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("🧪")).toBeInTheDocument();
    });

    it("renders correctly for debug phase", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, phase: "debug" }} />
        </TestWrapper>,
      );

      expect(screen.getByText("Debug")).toBeInTheDocument();
      expect(screen.getByText("🔧")).toBeInTheDocument();
    });

    it("renders correctly for polish phase", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, phase: "polish" }} />
        </TestWrapper>,
      );

      expect(screen.getByText("Polish")).toBeInTheDocument();
      expect(screen.getByText("✨")).toBeInTheDocument();
    });

    it("renders correctly for complete phase", () => {
      render(
        <TestWrapper>
          <AppCard app={{ ...baseApp, phase: "complete" }} />
        </TestWrapper>,
      );

      expect(screen.getByText("Complete")).toBeInTheDocument();
      expect(screen.getByText("✅")).toBeInTheDocument();
    });
  });
});
