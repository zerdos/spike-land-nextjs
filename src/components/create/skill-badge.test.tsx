import type { SkillDefinition } from "@/lib/create/skill-definitions";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkillBadge } from "./skill-badge";

const mockSkill: SkillDefinition = {
  id: "three-js",
  name: "Three.js",
  icon: "🧊",
  category: "3D",
  colorClass: "border-blue-400 bg-blue-50 text-blue-700",
  triggers: ["three", "3d"],
  description: "3D scene rendering",
};

describe("SkillBadge", () => {
  it("should render skill name and icon", () => {
    render(<SkillBadge skill={mockSkill} index={0} />);
    expect(screen.getByText("Three.js")).toBeDefined();
    expect(screen.getByText("🧊")).toBeDefined();
  });

  it("should have title attribute with description", () => {
    render(<SkillBadge skill={mockSkill} index={0} />);
    const badge = screen.getByTitle("3D scene rendering");
    expect(badge).toBeDefined();
  });

  it("should apply color classes from skill", () => {
    const { container } = render(<SkillBadge skill={mockSkill} index={0} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("border-blue-400");
    expect(span?.className).toContain("bg-blue-50");
    expect(span?.className).toContain("text-blue-700");
  });
});
