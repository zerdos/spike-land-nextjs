import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  test("renders label correctly", () => {
    render(<SeverityBadge level="critical" />);
    expect(screen.getByText("critical")).toBeDefined();
  });

  test("applies critical styles", () => {
    render(<SeverityBadge level="critical" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-red-400");
  });

  test("applies medium styles", () => {
    render(<SeverityBadge level="medium" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-blue-400");
  });

  test("applies low styles", () => {
    render(<SeverityBadge level="low" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-slate-400");
  });
});
