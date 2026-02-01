import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { GlassCard } from "./GlassCard";

describe("GlassCard", () => {
  test("renders children correctly", () => {
    render(
      <GlassCard>
        <div>Test Content</div>
      </GlassCard>,
    );
    expect(screen.getByText("Test Content")).toBeDefined();
  });

  test("applies claude variant classes", () => {
    render(
      <GlassCard variant="claude" data-testid="card">
        Content
      </GlassCard>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-amber-500/5");
  });

  test("applies openClaw variant classes", () => {
    render(
      <GlassCard variant="openClaw" data-testid="card">
        Content
      </GlassCard>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-emerald-500/5");
  });

  test("applies custom className", () => {
    render(
      <GlassCard className="custom-class" data-testid="card">
        Content
      </GlassCard>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-class");
  });
});
