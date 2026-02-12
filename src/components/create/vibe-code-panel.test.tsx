import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockClosePanel = vi.fn();
const mockSetMode = vi.fn();
let mockMode = "plan";
let mockIsOpen = true;

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
    isOpen: mockIsOpen,
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

let capturedSheetOnOpenChange: ((open: boolean) => void) | undefined;

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    capturedSheetOnOpenChange = onOpenChange;
    return open ? (
      <div data-testid="mobile-sheet">{children}</div>
    ) : null;
  },
  SheetContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => (
    <div data-testid="sheet-content" data-side={props.side}>
      {children}
    </div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="sheet-title">{children}</span>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="sheet-description">{children}</span>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  Brain: ({ className }: { className?: string }) => (
    <span data-testid="brain-icon" className={className} />
  ),
  Eye: ({ className }: { className?: string }) => (
    <span data-testid="eye-icon" className={className} />
  ),
  Pencil: ({ className }: { className?: string }) => (
    <span data-testid="pencil-icon" className={className} />
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
    mockIsOpen = true;
    mockClosePanel.mockClear();
    mockSetMode.mockClear();
    capturedSheetOnOpenChange = undefined;
  });

  describe("desktop sidebar", () => {
    it("renders panel with title", () => {
      render(<VibeCodePanel />);
      expect(screen.getAllByText("Vibe Code").length).toBeGreaterThanOrEqual(1);
    });

    it("renders messages and input components", () => {
      render(<VibeCodePanel />);
      expect(screen.getAllByTestId("vibe-messages").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("vibe-input").length).toBeGreaterThanOrEqual(1);
    });

    it("renders toggle group with plan and edit options", () => {
      render(<VibeCodePanel />);
      expect(screen.getAllByTestId("toggle-plan").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("toggle-edit").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Plan").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Edit").length).toBeGreaterThanOrEqual(1);
    });

    it("renders close button and calls closePanel on click", () => {
      render(<VibeCodePanel />);
      const closeBtns = screen.getAllByLabelText("Close panel");
      fireEvent.click(closeBtns[0]!);
      expect(mockClosePanel).toHaveBeenCalledTimes(1);
    });

    it("renders brain and wrench icons", () => {
      render(<VibeCodePanel />);
      expect(screen.getAllByTestId("brain-icon").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("wrench-icon").length).toBeGreaterThanOrEqual(1);
    });

    it("shows plan mode indicator banner when in plan mode", () => {
      mockMode = "plan";
      render(<VibeCodePanel />);
      expect(
        screen.getAllByText("Read-only — analyzing code, no changes").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("eye-icon").length).toBeGreaterThanOrEqual(1);
    });

    it("shows edit mode indicator banner when in edit mode", () => {
      mockMode = "edit";
      render(<VibeCodePanel />);
      expect(
        screen.getAllByText("Edit mode — AI can modify your code").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("pencil-icon").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mobile bottom sheet", () => {
    it("renders mobile sheet when isOpen is true", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      expect(screen.getByTestId("mobile-sheet")).toBeInTheDocument();
      expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
    });

    it("does not render mobile sheet when isOpen is false", () => {
      mockIsOpen = false;
      render(<VibeCodePanel />);
      expect(screen.queryByTestId("mobile-sheet")).not.toBeInTheDocument();
    });

    it("renders sheet with bottom side", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      expect(screen.getByTestId("sheet-content")).toHaveAttribute(
        "data-side",
        "bottom",
      );
    });

    it("renders drag handle in mobile sheet", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      const sheetContent = screen.getByTestId("sheet-content");
      const dragHandle = sheetContent.querySelector(".rounded-full.bg-muted-foreground\\/30");
      expect(dragHandle).toBeInTheDocument();
    });

    it("renders accessible sheet title and description", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      expect(screen.getByTestId("sheet-title")).toHaveTextContent("Vibe Code");
      expect(screen.getByTestId("sheet-description")).toHaveTextContent(
        "AI coding assistant panel",
      );
    });

    it("calls closePanel when sheet is dismissed", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      expect(capturedSheetOnOpenChange).toBeDefined();
      capturedSheetOnOpenChange!(false);
      expect(mockClosePanel).toHaveBeenCalledTimes(1);
    });

    it("does not call closePanel when sheet onOpenChange receives true", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      expect(capturedSheetOnOpenChange).toBeDefined();
      capturedSheetOnOpenChange!(true);
      expect(mockClosePanel).not.toHaveBeenCalled();
    });

    it("renders messages and input inside the sheet", () => {
      mockIsOpen = true;
      render(<VibeCodePanel />);
      // Both desktop and mobile render messages/input; ensure at least 2 of each
      expect(screen.getAllByTestId("vibe-messages")).toHaveLength(2);
      expect(screen.getAllByTestId("vibe-input")).toHaveLength(2);
    });
  });
});
