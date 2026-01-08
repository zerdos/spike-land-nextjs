import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders dashboard heading and welcome message", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Dashboard" }))
      .toBeInTheDocument();
    expect(screen.getByText("Welcome to Orbit")).toBeInTheDocument();
    expect(
      screen.getByText(/Your social command center dashboard is coming soon/i),
    ).toBeInTheDocument();
  });
});
