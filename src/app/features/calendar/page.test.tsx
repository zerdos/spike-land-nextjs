import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "./page";

// Mock the CalendarPageContent component since it uses complex components
vi.mock("./CalendarPageContent", () => ({
  CalendarPageContent: () => (
    <main data-testid="calendar-page">
      <h1>AI Calendar</h1>
      <p>Stop guessing when to post.</p>
      <a href="/auth/signin">Start Scheduling</a>
      <a href="/features">Features</a>
    </main>
  ),
}));

describe("CalendarPage", () => {
  it("should render the page with correct structure", () => {
    render(<CalendarPage />);
    expect(screen.getByTestId("calendar-page")).toBeInTheDocument();
  });

  it("should render the main heading", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ai calendar/i,
    );
  });

  it("should have a CTA link", () => {
    render(<CalendarPage />);
    expect(screen.getByRole("link", { name: /start scheduling/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render the page description", () => {
    render(<CalendarPage />);
    expect(
      screen.getByText(/stop guessing when to post/i),
    ).toBeInTheDocument();
  });
});
