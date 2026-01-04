import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AiAgentsPage from "./page";

describe("AiAgentsPage", () => {
  it("renders page content", () => {
    render(<AiAgentsPage />);
    expect(screen.getByRole("heading", { name: "AI Agents" })).toBeInTheDocument();
    expect(screen.getByText("AI Agents coming soon.")).toBeInTheDocument();
  });
});
