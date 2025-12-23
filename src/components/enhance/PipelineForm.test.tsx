import { SYSTEM_DEFAULT_PIPELINE } from "@/lib/ai/pipeline-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineForm } from "./PipelineForm";

// Mock ReferenceImageUpload as it might have complex logic/styles
vi.mock("./ReferenceImageUpload", () => ({
  ReferenceImageUpload: () => (
    <div data-testid="reference-image-upload">Reference Image Upload</div>
  ),
}));

// ResizeObserver mock needed for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ScrollIntoView
window.HTMLElement.prototype.scrollIntoView = function() {};

describe("PipelineForm", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    mode: "create" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form correctly", () => {
    render(<PipelineForm {...defaultProps} />);

    // There are two "Create Pipeline" texts: the heading and the button
    const elements = screen.getAllByText("Create Pipeline");
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(elements.some(el => el.tagName === "H2")).toBe(true);

    expect(screen.getByLabelText("Name")).toHaveValue("");
    // Default tier 2K
    expect(screen.getAllByText("2K (2048px) - 5 tokens")[0]).toBeInTheDocument();
    // Default visibility PRIVATE
    expect(screen.getAllByText("Private (only you)")[0]).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Create Pipeline" })).toBeDisabled();
  });

  it("enables submit when name is filled", async () => {
    const user = userEvent.setup();
    render(<PipelineForm {...defaultProps} />);

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "New Pipeline");

    expect(screen.getByRole("button", { name: "Create Pipeline" })).toBeEnabled();
  });

  it("handles form submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PipelineForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "My Pipeline");
    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: "My Pipeline",
      tier: "TIER_2K",
    }));
  });

  it("renders edit mode correctly", async () => {
    const initialData = {
      id: "p1",
      name: "Existing Pipeline",
      description: "Desc",
      tier: "TIER_4K" as const,
      visibility: "PUBLIC" as const,
      analysisConfig: SYSTEM_DEFAULT_PIPELINE.analysis,
      autoCropConfig: SYSTEM_DEFAULT_PIPELINE.autoCrop,
      promptConfig: SYSTEM_DEFAULT_PIPELINE.prompt,
      generationConfig: SYSTEM_DEFAULT_PIPELINE.generation,
    };

    render(<PipelineForm {...defaultProps} mode="edit" initialData={initialData} />);

    expect(screen.getByText("Edit Pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Existing Pipeline");
    expect(screen.getAllByText("4K (4096px) - 10 tokens")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Public (visible to all)")[0]).toBeInTheDocument();

    // Check for Reference Image Upload (only in edit mode with ID)
    // You need to go to Prompt tab to see it
    const user = userEvent.setup();
    await user.click(screen.getByText("Prompt"));
    expect(await screen.findByTestId("reference-image-upload")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  });

  it("renders fork mode correctly", () => {
    const initialData = {
      name: "Base Pipeline",
    };
    render(<PipelineForm {...defaultProps} mode="fork" initialData={initialData} />);

    expect(screen.getByText("Fork Pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Base Pipeline (Copy)");
    expect(screen.getByRole("button", { name: "Create Fork" })).toBeEnabled();
  });

  it("updates configuration in tabs", async () => {
    const user = userEvent.setup();
    render(<PipelineForm {...defaultProps} />);

    // Type name to enable saving
    await user.type(screen.getByLabelText("Name"), "Config Test");

    // Analysis Tab
    await user.click(screen.getByText("Analysis"));
    const analysisCheckbox = screen.getAllByRole("checkbox")[0]!; // Enable Analysis checkbox
    // It defaults to true. Let's toggle it.
    await user.click(analysisCheckbox);
    // Now it should be unchecked.

    // Auto-Crop Tab
    await user.click(screen.getByText("Auto-Crop"));
    const autoCropCheckbox = screen.getAllByRole("checkbox")[0]!; // Enable Auto-Crop
    // Defaults to true.
    await user.click(autoCropCheckbox);

    // Generation Tab
    await user.click(screen.getByText("Generation"));
    await user.click(screen.getByLabelText("5")); // Retry attempts

    // Submit and check values
    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      analysisConfig: expect.objectContaining({ enabled: false }),
      autoCropConfig: expect.objectContaining({ enabled: false }),
      generationConfig: expect.objectContaining({ retryAttempts: 5 }),
    }));
  });

  it("validates empty name", async () => {
    const user = userEvent.setup();
    render(<PipelineForm {...defaultProps} />);

    const submitBtn = screen.getByRole("button", { name: "Create Pipeline" });
    expect(submitBtn).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "   ");
    expect(submitBtn).toBeDisabled();
  });
});
