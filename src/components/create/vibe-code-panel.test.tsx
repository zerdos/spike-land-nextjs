import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockClosePanel = vi.fn();
const mockSetMode = vi.fn();
let mockMode = "plan";

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    closePanel: mockClosePanel,
    mode: mockMode,
    setMode: mockSetMode,
    messages: [],
    agentStage: null,
    isStreaming: false,
    sendMessage: vi.fn(),
    refreshCounter: 0,
    isOpen: true,
    openPanel: vi.fn(),
    appContext: null,
    setAppContext: vi.fn(),
  }),
}));

vi.mock("./vibe-code-messages", () => ({
  VibeCodeMessages: () => <div data-testid="vibe-messages">Messages</div>,
}));

vi.mock("./vibe-code-input", () => ({
  VibeCodeInput: () => <div data-testid="vibe-input">Input</div>,
}));

vi.mock("lucide-react", () => ({
  Brain: ({ className }: { className?: string }) => (
    <span data-testid="brain-icon" className={className} />
  ),
  Wrench: ({ className }: { className?: string }) => (
    <span data-testid="wrench-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="x-icon" className={className} />
  ),
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({
    children,
    onValueChange: _onValueChange,
    value,
    ...props
  }: {
    children: React.ReactNode;
    onValueChange: (val: string) => void;
    value: string;
    type: string;
    className?: string;
  }) => (
    <div data-testid="toggle-group" data-value={value} {...props}>
      {children}
    </div>
  ),
  ToggleGroupItem: ({
    children,
    value,
    ...props
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
    "aria-label"?: string;
  }) => (
    <button data-testid={`toggle-${value}`} data-value={value} {...props}>
      {children}
    </button>
  ),
}));

import { VibeCodePanel } from "./vibe-code-panel";

describe("VibeCodePanel", () => {
  beforeEach(() => {
    mockMode = "plan";
    mockClosePanel.mockClear();
    mockSetMode.mockClear();
  });

  it("renders panel with title", () => {
    render(<VibeCodePanel />);
    expect(screen.getByText("Vibe Code")).toBeInTheDocument();
  });

  it("renders messages and input components", () => {
    render(<VibeCodePanel />);
    expect(screen.getByTestId("vibe-messages")).toBeInTheDocument();
    expect(screen.getByTestId("vibe-input")).toBeInTheDocument();
  });

  it("renders toggle group with plan and edit options", () => {
    render(<VibeCodePanel />);
    expect(screen.getByTestId("toggle-plan")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-edit")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders close button and calls closePanel on click", () => {
    render(<VibeCodePanel />);
    const closeBtn = screen.getByLabelText("Close panel");
    fireEvent.click(closeBtn);
    expect(mockClosePanel).toHaveBeenCalledTimes(1);
  });

  it("renders brain and wrench icons", () => {
    render(<VibeCodePanel />);
    expect(screen.getByTestId("brain-icon")).toBeInTheDocument();
    expect(screen.getByTestId("wrench-icon")).toBeInTheDocument();
  });
});
