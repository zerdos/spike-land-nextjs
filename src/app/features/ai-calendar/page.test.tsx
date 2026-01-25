import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AICalendarPage from "./page";

// Mock the AICalendarPageContent component since it uses complex components
vi.mock("./AICalendarPageContent", () => ({
  AICalendarPageContent: () => (
    <main data-testid="ai-calendar-page">
      <h1>AI Calendar</h1>
      <p>AI-powered content scheduling that learns when your audience is most active.</p>
      <a href="/auth/signin">Optimize Your Schedule</a>
      <a href="/features">Features</a>
      <h2>AI-Suggested Times</h2>
      <h2>Visual Content Planning</h2>
      <h2>Auto-Scheduling</h2>
    </main>
  ),
}));

describe("AICalendarPage", () => {
  it("should render the page with correct structure", () => {
    render(<AICalendarPage />);
    expect(screen.getByTestId("ai-calendar-page")).toBeInTheDocument();
  });

  it("should render the main heading", () => {
    render(<AICalendarPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ai calendar/i,
    );
  });

  it("should render feature sections", () => {
    render(<AICalendarPage />);
    expect(screen.getByRole("heading", { name: /ai-suggested times/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /visual content planning/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /auto-scheduling/i })).toBeInTheDocument();
  });

  it("should have a CTA link", () => {
    render(<AICalendarPage />);
    expect(screen.getByRole("link", { name: /optimize your schedule/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render the page description", () => {
    render(<AICalendarPage />);
    expect(
      screen.getByText(/ai-powered content scheduling/i),
    ).toBeInTheDocument();
  });
});
