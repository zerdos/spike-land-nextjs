/**
 * Tests for TemplateSelector component
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateSelector } from "./template-selector";

describe("TemplateSelector", () => {
  it("should render the component with heading", () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    expect(screen.getByText("Choose a Template")).toBeInTheDocument();
    expect(
      screen.getByText("Start with a pre-built template or create from scratch"),
    ).toBeInTheDocument();
  });

  it("should render 'Start from Scratch' option", () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    expect(screen.getByText("Start from Scratch")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Build anything you want with AI assistance. No template constraints.",
      ),
    ).toBeInTheDocument();
  });

  it("should render all 4 template cards", () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    expect(screen.getByText("Link-in-Bio Page")).toBeInTheDocument();
    expect(screen.getByText("Campaign Landing Page")).toBeInTheDocument();
    expect(screen.getByText("Interactive Poll")).toBeInTheDocument();
    expect(screen.getByText("Contest Entry Form")).toBeInTheDocument();
  });

  it("should call onSelect with null when 'Start from Scratch' is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    const scratchCard = screen.getByText("Start from Scratch").closest("div");
    if (scratchCard) {
      await user.click(scratchCard);
      expect(onSelect).toHaveBeenCalledWith(null);
    }
  });

  it("should call onSelect with template ID when template card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    const linkInBioCard = screen.getByText("Link-in-Bio Page").closest("div");
    if (linkInBioCard) {
      await user.click(linkInBioCard);
      expect(onSelect).toHaveBeenCalledWith("link-in-bio");
    }
  });

  it("should display tags for each template", () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    // Check for some expected tags
    expect(screen.getByText("social-media")).toBeInTheDocument();
    expect(screen.getByText("marketing")).toBeInTheDocument();
    expect(screen.getByText("poll")).toBeInTheDocument();
    expect(screen.getByText("contest")).toBeInTheDocument();
  });

  it("should display badges for Start from Scratch option", () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Flexible")).toBeInTheDocument();
  });

  it("should display emoji icons for templates", () => {
    const onSelect = vi.fn();
    const { container } = render(<TemplateSelector onSelect={onSelect} />);

    // Check that emojis are rendered (they appear as text content)
    const text = container.textContent || "";
    expect(text).toContain("✨"); // Start from scratch
    expect(text).toContain("🔗"); // Link-in-bio
    expect(text).toContain("🚀"); // Campaign landing
    expect(text).toContain("📊"); // Poll
    expect(text).toContain("🏆"); // Contest
  });
});
