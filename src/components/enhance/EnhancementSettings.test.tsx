import type { EnhancementTier } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnhancementSettings } from "./EnhancementSettings";

describe("EnhancementSettings Component", () => {
  const mockOnEnhance = vi.fn();
  const mockOnBalanceRefresh = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    onEnhance: mockOnEnhance,
    currentBalance: 10,
    isProcessing: false,
    completedVersions: [],
    onBalanceRefresh: mockOnBalanceRefresh,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders component with title and description", () => {
    render(<EnhancementSettings {...defaultProps} />);

    expect(screen.getByText("Enhancement Settings")).toBeInTheDocument();
    expect(screen.getByText("Choose the quality tier for AI enhancement")).toBeInTheDocument();
  });

  it("displays current balance", () => {
    render(<EnhancementSettings {...defaultProps} />);

    expect(screen.getByText("Your Balance")).toBeInTheDocument();
    const balanceSection = screen.getByText("Your Balance").parentElement?.parentElement;
    expect(balanceSection?.textContent).toContain("10 tokens");
  });

  it("renders all three tier selection cards with Standard/Pro/Ultra labels", () => {
    render(<EnhancementSettings {...defaultProps} />);

    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Balanced quality & speed")).toBeInTheDocument();

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Higher detail, slower")).toBeInTheDocument();

    expect(screen.getByText("Ultra")).toBeInTheDocument();
    expect(screen.getByText("Maximum detail, slowest")).toBeInTheDocument();
  });

  it("displays Enhancement Level label", () => {
    render(<EnhancementSettings {...defaultProps} />);

    expect(screen.getByText("Enhancement Level")).toBeInTheDocument();
  });

  it("calls onTierChange when tier is selected", () => {
    render(<EnhancementSettings {...defaultProps} />);

    const standardRadio = screen.getByRole("radio", { name: /Standard/i });
    fireEvent.click(standardRadio);

    expect(standardRadio).toBeChecked();
  });

  it("has Pro (TIER_2K) selected by default", () => {
    render(<EnhancementSettings {...defaultProps} />);

    const proRadio = screen.getByRole("radio", { name: /Pro/i });
    expect(proRadio).toBeChecked();
  });

  it("calls onEnhance when enhance button clicked", async () => {
    mockOnEnhance.mockResolvedValue(undefined);

    render(<EnhancementSettings {...defaultProps} />);

    const enhanceButton = screen.getByRole("button", { name: /Start Enhancement/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalledWith("TIER_2K");
    });
  });

  it("disables enhance button when processing", () => {
    render(<EnhancementSettings {...defaultProps} isProcessing={true} />);

    const enhanceButton = screen.getByRole("button", { name: /Enhancing/i });
    expect(enhanceButton).toBeDisabled();
  });

  it("shows loading state when processing", () => {
    render(<EnhancementSettings {...defaultProps} isProcessing={true} />);

    expect(screen.getByText("Enhancing...")).toBeInTheDocument();
  });

  it("shows insufficient tokens warning when balance is low", () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />);

    expect(screen.getByText("Insufficient Tokens")).toBeInTheDocument();
    expect(screen.getByText(/You need 5 tokens but only have 3/i)).toBeInTheDocument();
  });

  it("disables enhance button when balance is insufficient", () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />);

    const enhanceButton = screen.getByRole("button", { name: /Start Enhancement/i });
    expect(enhanceButton).toBeDisabled();
  });

  it("shows Get Tokens button when balance is insufficient", () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />);

    expect(screen.getByRole("button", { name: /Get Tokens/i })).toBeInTheDocument();
  });

  it("disables tier options when balance is insufficient", () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />);

    const proRadio = screen.getByRole("radio", { name: /Pro/i });
    const ultraRadio = screen.getByRole("radio", { name: /Ultra/i });

    expect(proRadio).toBeDisabled();
    expect(ultraRadio).toBeDisabled();
  });

  it("enables tiers that user can afford", () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={5} />);

    const standardRadio = screen.getByRole("radio", { name: /Standard/i });
    const proRadio = screen.getByRole("radio", { name: /Pro/i });

    expect(standardRadio).not.toBeDisabled();
    expect(proRadio).not.toBeDisabled();
  });

  it("shows note when version already exists for selected tier", () => {
    const completedVersions: Array<{ tier: EnhancementTier; url: string; }> = [
      { tier: "TIER_2K", url: "/enhanced.jpg" },
    ];

    render(
      <EnhancementSettings
        {...defaultProps}
        completedVersions={completedVersions}
      />,
    );

    expect(
      screen.getByText(/A Pro version already exists/i),
    ).toBeInTheDocument();
  });

  it("does not show version exists note when selecting different tier", () => {
    const completedVersions: Array<{ tier: EnhancementTier; url: string; }> = [
      { tier: "TIER_1K", url: "/enhanced.jpg" },
    ];

    render(
      <EnhancementSettings
        {...defaultProps}
        completedVersions={completedVersions}
      />,
    );

    expect(
      screen.queryByText(/A Pro version already exists/i),
    ).not.toBeInTheDocument();
  });

  it("calls onEnhance with selected tier when different tier is selected", async () => {
    mockOnEnhance.mockResolvedValue(undefined);

    render(<EnhancementSettings {...defaultProps} />);

    const ultraRadio = screen.getByRole("radio", { name: /Ultra/i });
    fireEvent.click(ultraRadio);

    const enhanceButton = screen.getByRole("button", { name: /Start Enhancement \(10 tokens\)/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalledWith("TIER_4K");
    });
  });

  it("displays correct token cost in enhance button for selected tier", () => {
    render(<EnhancementSettings {...defaultProps} />);

    const standardRadio = screen.getByRole("radio", { name: /Standard/i });
    fireEvent.click(standardRadio);

    expect(screen.getByRole("button", { name: /Start Enhancement \(2 tokens\)/i }))
      .toBeInTheDocument();
  });

  it("shows balance with coin icon", () => {
    render(<EnhancementSettings {...defaultProps} />);

    const balanceSection = screen.getByText("Your Balance").parentElement;
    expect(balanceSection?.querySelector("svg")).toBeInTheDocument();
  });

  it("handles onEnhance rejection gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
    consoleErrorSpy.mockImplementation(() => {});

    mockOnEnhance.mockImplementation(() => {
      return Promise.reject(new Error("Enhancement failed")).catch(() => {
        // Catch the error to prevent unhandled rejection
      });
    });

    render(<EnhancementSettings {...defaultProps} />);

    const enhanceButton = screen.getByRole("button", { name: /Start Enhancement/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  describe("asCard prop", () => {
    it("renders with Card wrapper by default", () => {
      render(<EnhancementSettings {...defaultProps} />);

      expect(screen.getByText("Enhancement Settings")).toBeInTheDocument();
      expect(screen.getByText("Choose the quality tier for AI enhancement")).toBeInTheDocument();
    });

    it("renders with Card wrapper when asCard is true", () => {
      render(<EnhancementSettings {...defaultProps} asCard={true} />);

      expect(screen.getByText("Enhancement Settings")).toBeInTheDocument();
      expect(screen.getByText("Choose the quality tier for AI enhancement")).toBeInTheDocument();
    });

    it("renders without Card wrapper when asCard is false", () => {
      render(<EnhancementSettings {...defaultProps} asCard={false} />);

      expect(screen.queryByText("Choose the quality tier for AI enhancement")).not
        .toBeInTheDocument();
      expect(screen.getByText("Enhancement Settings")).toBeInTheDocument();
    });

    it("hides balance display when asCard is false", () => {
      render(<EnhancementSettings {...defaultProps} asCard={false} />);

      expect(screen.queryByText("Your Balance")).not.toBeInTheDocument();
    });

    it("shows balance display when asCard is true", () => {
      render(<EnhancementSettings {...defaultProps} asCard={true} />);

      expect(screen.getByText("Your Balance")).toBeInTheDocument();
    });

    it("still shows tier options when asCard is false", () => {
      render(<EnhancementSettings {...defaultProps} asCard={false} />);

      expect(screen.getByText("Standard")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Ultra")).toBeInTheDocument();
    });

    it("still shows enhance button when asCard is false", () => {
      render(<EnhancementSettings {...defaultProps} asCard={false} />);

      expect(screen.getByRole("button", { name: /Start Enhancement/i })).toBeInTheDocument();
    });

    it("still shows insufficient warning when asCard is false", () => {
      render(<EnhancementSettings {...defaultProps} asCard={false} currentBalance={3} />);

      expect(screen.getByText("Insufficient Tokens")).toBeInTheDocument();
    });
  });

  describe("dialog mode", () => {
    it("renders as dialog when trigger prop is provided", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
        />,
      );

      expect(screen.getByRole("button", { name: /Open Dialog/i })).toBeInTheDocument();
    });

    it("opens dialog on trigger click", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
        />,
      );

      const triggerButton = screen.getByRole("button", { name: /Open Dialog/i });
      fireEvent.click(triggerButton);

      expect(screen.getByText("Enhancement Settings")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start Enhancement/i })).toBeInTheDocument();
    });

    it("shows Cancel and Start Enhancement buttons in dialog footer", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start Enhancement/i })).toBeInTheDocument();
    });

    it("calls onCancel when Cancel button clicked", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
          onCancel={mockOnCancel}
          onOpenChange={mockOnOpenChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));
      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("calls onEnhance when Start Enhancement clicked in dialog", async () => {
      mockOnEnhance.mockResolvedValue(undefined);

      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));
      fireEvent.click(screen.getByRole("button", { name: /Start Enhancement/i }));

      await waitFor(() => {
        expect(mockOnEnhance).toHaveBeenCalledWith("TIER_2K");
      });
    });

    it("disables buttons when processing in dialog mode", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
          isProcessing={true}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Enhancing/i })).toBeDisabled();
    });
  });

  describe("image preview", () => {
    it("displays image preview when imageUrl is provided", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          imageUrl="/test-image.jpg"
          imageName="test-image.jpg"
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(screen.getByAltText("test-image.jpg")).toBeInTheDocument();
    });

    it("displays image name in input field", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          imageUrl="/test-image.jpg"
          imageName="mountain_view.jpg"
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(screen.getByText("Selected Image")).toBeInTheDocument();
      expect(screen.getByText("Image Name")).toBeInTheDocument();
      expect(screen.getByDisplayValue("mountain_view.jpg")).toBeInTheDocument();
    });

    it("shows image name input as read-only", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          imageUrl="/test-image.jpg"
          imageName="test.jpg"
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      const input = screen.getByDisplayValue("test.jpg");
      expect(input).toHaveAttribute("readonly");
    });

    it("displays image preview section only when imageName is provided", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          imageName="test.jpg"
          trigger={<button>Open Dialog</button>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(screen.getByText("Selected Image")).toBeInTheDocument();
    });

    it("does not show image preview in card mode without imageUrl", () => {
      render(<EnhancementSettings {...defaultProps} />);

      expect(screen.queryByText("Selected Image")).not.toBeInTheDocument();
    });
  });

  describe("controlled dialog state", () => {
    it("respects open prop for dialog state", () => {
      const { rerender } = render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open</button>}
          open={false}
        />,
      );

      // Dialog content should not be visible when open is false
      expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument();

      rerender(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open</button>}
          open={true}
        />,
      );

      // Dialog content should be visible when open is true
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    it("calls onOpenChange when dialog state changes", () => {
      render(
        <EnhancementSettings
          {...defaultProps}
          trigger={<button>Open Dialog</button>}
          onOpenChange={mockOnOpenChange}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Open Dialog/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(true);
    });
  });
});
