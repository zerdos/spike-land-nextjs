import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VibeCodeSidebar } from "./vibe-code-sidebar";

const mockUseVibeCode = vi.fn();

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => mockUseVibeCode(),
}));

vi.mock("./related-apps", () => ({
  RelatedApps: ({ links }: { links: string[] }) => (
    <div data-testid="related-apps">RelatedApps: {links.join(", ")}</div>
  ),
}));

vi.mock("./vibe-code-panel", () => ({
  VibeCodePanel: () => <div data-testid="vibe-code-panel">VibeCodePanel</div>,
}));

describe("VibeCodeSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render RelatedApps when isOpen is false", () => {
    mockUseVibeCode.mockReturnValue({ isOpen: false });

    render(<VibeCodeSidebar links={["link-1", "link-2"]} />);

    expect(screen.getByTestId("related-apps")).toBeInTheDocument();
    expect(screen.queryByTestId("vibe-code-panel")).not.toBeInTheDocument();
  });

  it("should render VibeCodePanel when isOpen is true", () => {
    mockUseVibeCode.mockReturnValue({ isOpen: true });

    render(<VibeCodeSidebar links={["link-1"]} />);

    expect(screen.getByTestId("vibe-code-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("related-apps")).not.toBeInTheDocument();
  });

  it("should pass links and publishedApps to RelatedApps", () => {
    mockUseVibeCode.mockReturnValue({ isOpen: false });

    render(<VibeCodeSidebar links={["a", "b"]} />);

    expect(screen.getByTestId("related-apps")).toHaveTextContent("a, b");
  });
});
