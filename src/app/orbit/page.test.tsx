import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrbitPage from "./page";

describe("OrbitPage", () => {
  it("renders branding and dashboard link", () => {
    render(<OrbitPage />);

    expect(screen.getByRole("heading", { name: "Orbit" })).toBeInTheDocument();
    expect(screen.getByText("Your Social Command Center")).toBeInTheDocument();

    const button = screen.getByRole("link", { name: "Enter Dashboard" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/orbit/dashboard");
  });
});
