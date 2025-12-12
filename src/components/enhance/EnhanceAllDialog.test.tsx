import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EnhanceAllDialog } from "./EnhanceAllDialog";

describe("EnhanceAllDialog Component", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    albumName: "Test Album",
    imageCount: 10,
    alreadyEnhancedCount: {
      TIER_1K: 2,
      TIER_2K: 3,
      TIER_4K: 1,
    },
    userBalance: 100,
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it("should render dialog when open is true", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Enhance All Photos")).toBeInTheDocument();
  });

  it("should not render dialog when open is false", () => {
    render(<EnhanceAllDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should display album name and image count", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("Test Album")).toBeInTheDocument();
    expect(screen.getByText("10 photos in album")).toBeInTheDocument();
  });

  it("should display singular photo text for single image", () => {
    render(<EnhanceAllDialog {...defaultProps} imageCount={1} />);

    expect(screen.getByText("1 photo in album")).toBeInTheDocument();
  });

  it("should display all tier options", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("1K (1024px)")).toBeInTheDocument();
    expect(screen.getByText("2K (2048px)")).toBeInTheDocument();
    expect(screen.getByText("4K (4096px)")).toBeInTheDocument();
  });

  it("should display tier descriptions", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("Fast processing, good for previews")).toBeInTheDocument();
    expect(screen.getByText("Balanced quality and speed")).toBeInTheDocument();
    expect(screen.getByText("Maximum quality output")).toBeInTheDocument();
  });

  it("should display cost per image for each tier", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("2 tokens/image")).toBeInTheDocument();
    expect(screen.getByText("5 tokens/image")).toBeInTheDocument();
    expect(screen.getByText("10 tokens/image")).toBeInTheDocument();
  });

  it("should default to TIER_2K selection", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    const tier2kRadio = screen.getByRole("radio", { name: /2K \(2048px\)/i });
    expect(tier2kRadio).toBeChecked();
  });

  it("should allow tier selection change", async () => {
    const user = userEvent.setup();
    render(<EnhanceAllDialog {...defaultProps} />);

    const tier4kRadio = screen.getByRole("radio", { name: /4K \(4096px\)/i });
    await user.click(tier4kRadio);

    expect(tier4kRadio).toBeChecked();
  });

  it("should display skip already enhanced checkbox", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText(/skip already enhanced at this tier/i)).toBeInTheDocument();
  });

  it("should show already enhanced count when greater than 0", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("(3 photos)")).toBeInTheDocument();
  });

  it("should show singular photo text for 1 already enhanced", async () => {
    const user = userEvent.setup();
    render(
      <EnhanceAllDialog
        {...defaultProps}
        alreadyEnhancedCount={{ TIER_1K: 1, TIER_2K: 0, TIER_4K: 0 }}
      />,
    );

    const tier1kRadio = screen.getByRole("radio", { name: /1K \(1024px\)/i });
    await user.click(tier1kRadio);

    expect(screen.getByText("(1 photo)")).toBeInTheDocument();
  });

  it("should calculate correct cost breakdown for TIER_2K", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("Images to enhance:")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Cost per image:")).toBeInTheDocument();
    expect(screen.getByText("5 tokens")).toBeInTheDocument();
    expect(screen.getByText("Total cost:")).toBeInTheDocument();
    expect(screen.getByText("35 tokens")).toBeInTheDocument();
  });

  it("should calculate correct cost without skip option", async () => {
    const user = userEvent.setup();
    render(<EnhanceAllDialog {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("50 tokens")).toBeInTheDocument();
  });

  it("should update cost breakdown when tier changes", async () => {
    const user = userEvent.setup();
    render(<EnhanceAllDialog {...defaultProps} />);

    const tier4kRadio = screen.getByRole("radio", { name: /4K \(4096px\)/i });
    await user.click(tier4kRadio);

    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("10 tokens")).toBeInTheDocument();
    expect(screen.getByText("90 tokens")).toBeInTheDocument();
  });

  it("should display user balance", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("Your Balance")).toBeInTheDocument();
    expect(screen.getByText("100 tokens")).toBeInTheDocument();
  });

  it("should show insufficient balance warning when balance is low", () => {
    render(<EnhanceAllDialog {...defaultProps} userBalance={10} />);

    expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
    expect(screen.getByText(/you need 25 more tokens/i)).toBeInTheDocument();
  });

  it("should disable confirm button when balance is insufficient", () => {
    render(<EnhanceAllDialog {...defaultProps} userBalance={10} />);

    const confirmButton = screen.getByRole("button", { name: /enhance/i });
    expect(confirmButton).toBeDisabled();
  });

  it("should show message when all photos already enhanced at tier", () => {
    render(
      <EnhanceAllDialog
        {...defaultProps}
        alreadyEnhancedCount={{ TIER_1K: 10, TIER_2K: 10, TIER_4K: 10 }}
      />,
    );

    expect(screen.getByText(/all photos have already been enhanced/i)).toBeInTheDocument();
  });

  it("should disable confirm button when no images to enhance", () => {
    render(
      <EnhanceAllDialog
        {...defaultProps}
        alreadyEnhancedCount={{ TIER_1K: 10, TIER_2K: 10, TIER_4K: 10 }}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /enhance 0 photos/i });
    expect(confirmButton).toBeDisabled();
  });

  it("should call onConfirm with correct parameters when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<EnhanceAllDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: /enhance 7 photos/i });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("TIER_2K", true);
  });

  it("should call onConfirm with different tier and skip option", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<EnhanceAllDialog {...defaultProps} onConfirm={onConfirm} />);

    const tier1kRadio = screen.getByRole("radio", { name: /1K \(1024px\)/i });
    await user.click(tier1kRadio);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    const confirmButton = screen.getByRole("button", { name: /enhance 10 photos/i });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("TIER_1K", false);
  });

  it("should call onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<EnhanceAllDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show loading state when isLoading is true", () => {
    render(<EnhanceAllDialog {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should disable buttons when loading", () => {
    render(<EnhanceAllDialog {...defaultProps} isLoading={true} />);

    const confirmButton = screen.getByRole("button", { name: /processing/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should handle 0 images in album", () => {
    render(<EnhanceAllDialog {...defaultProps} imageCount={0} />);

    expect(screen.getByText("0 photos in album")).toBeInTheDocument();
    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("should handle all tiers with 0 already enhanced", () => {
    render(
      <EnhanceAllDialog
        {...defaultProps}
        alreadyEnhancedCount={{ TIER_1K: 0, TIER_2K: 0, TIER_4K: 0 }}
      />,
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.queryByText(/photos\)/)).not.toBeInTheDocument();
  });

  it("should calculate cost correctly for TIER_1K", async () => {
    const user = userEvent.setup();
    render(<EnhanceAllDialog {...defaultProps} />);

    const tier1kRadio = screen.getByRole("radio", { name: /1K \(1024px\)/i });
    await user.click(tier1kRadio);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2 tokens")).toBeInTheDocument();
    expect(screen.getByText("16 tokens")).toBeInTheDocument();
  });

  it("should show correct confirm button text based on images to enhance", () => {
    render(
      <EnhanceAllDialog
        {...defaultProps}
        imageCount={1}
        alreadyEnhancedCount={{ TIER_1K: 0, TIER_2K: 0, TIER_4K: 0 }}
      />,
    );

    expect(screen.getByRole("button", { name: /enhance 1 photo$/i })).toBeInTheDocument();
  });

  it("should display dialog description", () => {
    render(<EnhanceAllDialog {...defaultProps} />);

    expect(screen.getByText("Batch enhance all photos in this album with AI")).toBeInTheDocument();
  });
});
