import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComposerSkills } from "./composer-skills";

describe("ComposerSkills", () => {
  it("should render nothing when query is too short", () => {
    const { container } = render(<ComposerSkills query="a" />);
    expect(container.innerHTML).toBe("");
  });

  it("should render nothing when no skills match", () => {
    const { container } = render(<ComposerSkills query="random unmatched" />);
    expect(container.innerHTML).toBe("");
  });

  it("should render skill badges for matched topics", () => {
    render(<ComposerSkills query="games tetris" />);
    expect(screen.getByText("Confetti")).toBeDefined();
    expect(screen.getByText("Game Audio")).toBeDefined();
  });

  it("should render 3D skills for 3D topics", () => {
    render(<ComposerSkills query="3d globe" />);
    expect(screen.getByText("Three.js")).toBeDefined();
    expect(screen.getByText("3D Performance")).toBeDefined();
  });

  it("should render gradient fade overlays", () => {
    const { container } = render(<ComposerSkills query="games tetris" />);
    const gradients = container.querySelectorAll(".pointer-events-none");
    expect(gradients.length).toBe(2);
  });
});
