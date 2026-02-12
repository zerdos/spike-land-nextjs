import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VibeCodeActivator } from "./vibe-code-activator";

const mockSetAppContext = vi.fn();

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    setAppContext: mockSetAppContext,
  }),
}));

describe("VibeCodeActivator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call setAppContext with slug, title, and codespaceId on mount", () => {
    render(
      <VibeCodeActivator slug="my-app" title="My App" codespaceId="cs-123" />,
    );

    expect(mockSetAppContext).toHaveBeenCalledWith({
      slug: "my-app",
      title: "My App",
      codespaceId: "cs-123",
    });
  });

  it("should render nothing", () => {
    const { container } = render(
      <VibeCodeActivator slug="test" title="Test" codespaceId="cs-456" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("should call setAppContext again when props change", () => {
    const { rerender } = render(
      <VibeCodeActivator slug="app-1" title="App 1" codespaceId="cs-1" />,
    );

    expect(mockSetAppContext).toHaveBeenCalledTimes(1);

    rerender(
      <VibeCodeActivator slug="app-2" title="App 2" codespaceId="cs-2" />,
    );

    expect(mockSetAppContext).toHaveBeenCalledTimes(2);
    expect(mockSetAppContext).toHaveBeenLastCalledWith({
      slug: "app-2",
      title: "App 2",
      codespaceId: "cs-2",
    });
  });
});
