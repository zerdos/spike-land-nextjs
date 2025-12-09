import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./ShareButton";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

const mockWriteText = vi.fn();

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("ShareButton Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockWriteText.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders share button", () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    expect(screen.getByRole("button", { name: /Share/i })).toBeInTheDocument();
  });

  it("renders share icon", () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
        className="custom-class"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    expect(button.className).toContain("custom-class");
  });

  it("opens dialog when button is clicked", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        shareToken: "abc123",
        shareUrl: "https://spike.land/share/abc123",
      }),
    } as Response);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Share Image")).toBeInTheDocument();
    });
  });

  it("uses existing shareToken without making API call", async () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken="existing-token"
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/existing-token"))
        .toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls API to generate shareToken when not provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        shareToken: "new-token",
        shareUrl: "https://spike.land/share/new-token",
      }),
    } as Response);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/images/img-1/share", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/new-token"))
        .toBeInTheDocument();
    });
  });

  it("shows loading state while generating share link", async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(global.fetch).mockReturnValue(fetchPromise);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Generating share link...")).toBeInTheDocument();
    });

    resolvePromise!({
      ok: true,
      json: async () => ({
        shareToken: "new-token",
        shareUrl: "https://spike.land/share/new-token",
      }),
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText("Generating share link...")).not.toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Image not found" }),
    } as Response);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Image not found");
    });

    expect(screen.getByText("Failed to generate share link. Please try again."))
      .toBeInTheDocument();
  });

  it("handles network error gracefully", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });

  it("copies link to clipboard when copy button is clicked", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="Test Image"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/test-token"))
        .toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /Copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("https://spike.land/share/test-token");
    });

    expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard!");
  });

  it("handles clipboard error gracefully", async () => {
    mockWriteText.mockRejectedValue(new Error("Clipboard error"));

    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="Test Image"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/test-token"))
        .toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /Copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
    });
  });

  it("renders social share buttons with correct URLs", async () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="My Enhanced Photo"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Share on Twitter/i })).toBeInTheDocument();
    });

    const twitterLink = screen.getByRole("link", { name: /Share on Twitter/i });
    const facebookLink = screen.getByRole("link", { name: /Share on Facebook/i });
    const whatsappLink = screen.getByRole("link", { name: /Share on WhatsApp/i });

    expect(twitterLink).toHaveAttribute(
      "href",
      expect.stringContaining("twitter.com/intent/tweet"),
    );
    expect(twitterLink).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("https://spike.land/share/test-token")),
    );
    expect(twitterLink).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("My Enhanced Photo")),
    );

    expect(facebookLink).toHaveAttribute(
      "href",
      expect.stringContaining("facebook.com/sharer/sharer.php"),
    );
    expect(facebookLink).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("https://spike.land/share/test-token")),
    );

    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(whatsappLink).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("https://spike.land/share/test-token")),
    );
  });

  it("social links open in new tab", async () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="Test Image"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Share on Twitter/i })).toBeInTheDocument();
    });

    const twitterLink = screen.getByRole("link", { name: /Share on Twitter/i });
    const facebookLink = screen.getByRole("link", { name: /Share on Facebook/i });
    const whatsappLink = screen.getByRole("link", { name: /Share on WhatsApp/i });

    expect(twitterLink).toHaveAttribute("target", "_blank");
    expect(twitterLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(facebookLink).toHaveAttribute("target", "_blank");
    expect(facebookLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows check icon after copying", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWriteText.mockResolvedValue(undefined);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="Test Image"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/test-token"))
        .toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /Copy link/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(copyButton.querySelector(".text-green-500")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(copyButton.querySelector(".text-green-500")).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("does not make duplicate API calls when reopening dialog", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        shareToken: "abc123",
        shareUrl: "https://spike.land/share/abc123",
      }),
    } as Response);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/abc123")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Share Image")).not.toBeInTheDocument();
    });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByDisplayValue("https://spike.land/share/abc123")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("renders outline button variant", () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    expect(button.className).toContain("outline");
  });

  it("has accessible dialog with description", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        shareToken: "abc123",
        shareUrl: "https://spike.land/share/abc123",
      }),
    } as Response);

    render(
      <ShareButton
        imageId="img-1"
        shareToken={null}
        imageName="Test Image"
      />,
    );

    const button = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Share your enhanced image with friends and family."))
        .toBeInTheDocument();
    });
  });

  it("input field is readonly", async () => {
    render(
      <ShareButton
        imageId="img-1"
        shareToken="test-token"
        imageName="Test Image"
      />,
    );

    const shareButton = screen.getByRole("button", { name: /Share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      const input = screen.getByDisplayValue("https://spike.land/share/test-token");
      expect(input).toHaveAttribute("readonly");
    });
  });
});
