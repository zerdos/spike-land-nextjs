import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardStepSkeleton } from "./wizard-step-skeleton";

describe("WizardStepSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<WizardStepSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders container with proper max-width", () => {
    const { container } = render(<WizardStepSkeleton />);
    const wrapper = container.querySelector(".max-w-2xl");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders card structure", () => {
    const { container } = render(<WizardStepSkeleton />);
    const card = container.querySelector('[class*="rounded-2xl"]');
    expect(card).toBeInTheDocument();
  });

  it("renders skeleton elements", () => {
    const { container } = render(<WizardStepSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders navigation buttons skeleton", () => {
    const { container } = render(<WizardStepSkeleton />);
    const buttonArea = container.querySelector(".justify-between");
    expect(buttonArea).toBeInTheDocument();
  });

  it("matches expected structure", () => {
    const { container } = render(<WizardStepSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(12);
  });
});
