import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkillsBar } from "./skills-bar";

describe("SkillsBar", () => {
  it("should render nothing when query is too short", () => {
    const { container } = render(<SkillsBar query="a" />);
    expect(container.innerHTML).toBe("");
  });

  it("should render nothing when no skills match", () => {
    const { container } = render(<SkillsBar query="random unmatched" />);
    expect(container.textContent).not.toContain("Skills:");
  });

  it("should render skill badges for matched topics", () => {
    render(<SkillsBar query="games tetris" />);
    expect(screen.getByText("Skills:")).toBeDefined();
    expect(screen.getByText("Confetti")).toBeDefined();
    expect(screen.getByText("Game Audio")).toBeDefined();
  });

  it("should render 3D skills for 3D topics", () => {
    render(<SkillsBar query="3d globe" />);
    expect(screen.getByText("Three.js")).toBeDefined();
    expect(screen.getByText("3D Performance")).toBeDefined();
  });

  it("should render audio skills for music topics", () => {
    render(<SkillsBar query="music piano" />);
    expect(screen.getByText("Howler.js")).toBeDefined();
    expect(screen.getByText("Web Audio")).toBeDefined();
  });
});
