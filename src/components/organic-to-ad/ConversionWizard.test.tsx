/**
 * Tests for Conversion Wizard Component
 * Issue: #567 (ORB-063)
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConversionWizard } from "./ConversionWizard";

describe("ConversionWizard", () => {
  it("should render the wizard with step 1", () => {
    render(<ConversionWizard postId="test-post" />);

    expect(screen.getByTestId("conversion-wizard")).toBeDefined();
    expect(screen.getByText("Step 1 of 6")).toBeDefined();
    expect(screen.getByTestId("step-1")).toBeDefined();
  });

  it("should navigate to next step", () => {
    render(<ConversionWizard postId="test-post" />);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    expect(screen.getByText("Step 2 of 6")).toBeDefined();
    expect(screen.getByTestId("step-2")).toBeDefined();
  });

  it("should navigate to previous step", () => {
    render(<ConversionWizard postId="test-post" />);

    // Go to step 2
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("step-2")).toBeDefined();

    // Go back to step 1
    const backButton = screen.getByText("Back");
    fireEvent.click(backButton);

    expect(screen.getByTestId("step-1")).toBeDefined();
  });

  it("should show all wizard steps", () => {
    const { rerender } = render(<ConversionWizard postId="test-post" />);

    // Navigate through all steps
    for (let i = 1; i < 6; i++) {
      expect(screen.getByText(`Step ${i} of 6`)).toBeDefined();
      fireEvent.click(screen.getByText("Next"));
      rerender(<ConversionWizard postId="test-post" />);
    }

    expect(screen.getByText("Step 6 of 6")).toBeDefined();
    expect(screen.getByTestId("step-6")).toBeDefined();
  });

  it("should call onComplete when launch is clicked", async () => {
    const onComplete = vi.fn();
    render(<ConversionWizard postId="test-post" onComplete={onComplete} />);

    // Navigate to final step
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Next"));
    }

    const launchButton = screen.getByText("Launch Campaign");
    fireEvent.click(launchButton);

    expect(screen.getByText("Launching...")).toBeDefined();

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("mock-conversion-id");
    });
  });

  it("should display post ID", () => {
    render(<ConversionWizard postId="test-post-123" />);

    expect(screen.getByText("Post ID: test-post-123")).toBeDefined();
  });
});
