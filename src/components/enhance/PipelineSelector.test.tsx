import type { GroupedPipelines, Pipeline, UsePipelinesReturn } from "@/hooks/usePipelines";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PipelineSelector } from "./PipelineSelector";

// Mock usePipelines hook
const mockUsePipelines = vi.fn<() => UsePipelinesReturn>();

vi.mock("@/hooks/usePipelines", () => ({
  usePipelines: () => mockUsePipelines(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string; }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockPipelines: Pipeline[] = [
  {
    id: "system-1",
    name: "System Default",
    description: "Default enhancement pipeline",
    userId: null,
    visibility: "PUBLIC",
    tier: "TIER_1K",
    usageCount: 1000,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    analysisConfig: { enabled: true },
    autoCropConfig: { enabled: true },
    promptConfig: {},
    generationConfig: { retryAttempts: 3 },
    isOwner: false,
    isSystemDefault: true,
  },
  {
    id: "my-pipeline-1",
    name: "My Custom Pipeline",
    description: "My custom settings",
    userId: "user-123",
    visibility: "PRIVATE",
    tier: "TIER_2K",
    usageCount: 10,
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    analysisConfig: { enabled: true },
    autoCropConfig: { enabled: false },
    promptConfig: { customInstructions: "Enhance colors" },
    generationConfig: {},
    isOwner: true,
    isSystemDefault: false,
  },
  {
    id: "public-1",
    name: "Public Vintage",
    description: "Vintage style enhancement",
    userId: "other-user",
    visibility: "PUBLIC",
    tier: "TIER_1K",
    usageCount: 50,
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
    analysisConfig: { enabled: true },
    autoCropConfig: { enabled: true },
    promptConfig: { customInstructions: "Apply vintage look" },
    generationConfig: {},
    isOwner: false,
    isSystemDefault: false,
  },
];

const mockGroupedPipelines: GroupedPipelines = {
  systemDefaults: [mockPipelines[0]],
  myPipelines: [mockPipelines[1]],
  publicPipelines: [mockPipelines[2]],
};

describe("PipelineSelector", () => {
  const defaultMockReturn: UsePipelinesReturn = {
    pipelines: mockPipelines,
    groupedPipelines: mockGroupedPipelines,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    getPipelineById: (id: string) => mockPipelines.find((p) => p.id === id),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipelines.mockReturnValue(defaultMockReturn);
  });

  describe("loading state", () => {
    it("renders skeleton when loading", () => {
      mockUsePipelines.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        pipelines: [],
        groupedPipelines: { systemDefaults: [], myPipelines: [], publicPipelines: [] },
      });

      const { container } = render(
        <PipelineSelector value={null} onChange={() => {}} />,
      );

      // Should have a skeleton element
      const skeleton = container.querySelector('[class*="animate-pulse"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders error message when fetch fails", () => {
      mockUsePipelines.mockReturnValue({
        ...defaultMockReturn,
        error: new Error("Failed to fetch"),
        pipelines: [],
        groupedPipelines: { systemDefaults: [], myPipelines: [], publicPipelines: [] },
      });

      render(<PipelineSelector value={null} onChange={() => {}} />);

      expect(screen.getByText("Failed to load pipelines")).toBeInTheDocument();
    });
  });

  describe("rendering", () => {
    it("renders select with placeholder", () => {
      render(<PipelineSelector value={null} onChange={() => {}} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("System Default")).toBeInTheDocument();
    });

    it("shows selected pipeline name", () => {
      render(
        <PipelineSelector value="my-pipeline-1" onChange={() => {}} />,
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("My Custom Pipeline");
    });

    it("shows System Default when value is null", () => {
      render(<PipelineSelector value={null} onChange={() => {}} />);

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("System Default");
    });

    it("uses custom placeholder", () => {
      render(
        <PipelineSelector
          value={null}
          onChange={() => {}}
          placeholder="Choose a pipeline"
        />,
      );

      // Trigger should still show System Default, not placeholder, when value is null
      expect(screen.getByRole("combobox")).toHaveTextContent("System Default");
    });
  });

  describe("dropdown options", () => {
    it("shows grouped pipelines when opened", async () => {
      const user = userEvent.setup();

      render(<PipelineSelector value={null} onChange={() => {}} />);

      await user.click(screen.getByRole("combobox"));

      // Check group labels
      expect(screen.getByText("System Defaults")).toBeInTheDocument();
      expect(screen.getByText("My Pipelines")).toBeInTheDocument();
      expect(screen.getByText("Public Pipelines")).toBeInTheDocument();

      // Check pipeline names - use getAllByText since "System Default" appears multiple times
      expect(screen.getAllByText("System Default").length).toBeGreaterThan(0);
      expect(screen.getByText("My Custom Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Public Vintage")).toBeInTheDocument();
    });

    it("shows tier badges", async () => {
      const user = userEvent.setup();

      render(<PipelineSelector value={null} onChange={() => {}} />);

      await user.click(screen.getByRole("combobox"));

      // Multiple 1K badges exist (for "none" option and system default)
      expect(screen.getAllByText("1K").length).toBeGreaterThan(0);
      expect(screen.getByText("2K")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onChange with pipeline id when selected", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PipelineSelector value={null} onChange={onChange} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("My Custom Pipeline"));

      expect(onChange).toHaveBeenCalledWith("my-pipeline-1");
    });

    it("calls onChange with null when System Default selected", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <PipelineSelector value="my-pipeline-1" onChange={onChange} />,
      );

      await user.click(screen.getByRole("combobox"));

      // Find the "Auto" badge which is only on the "none" option
      const autoBadge = screen.getByText("Auto");
      // Click on the parent option
      await user.click(autoBadge.closest("[role='option']")!);

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe("manage link", () => {
    it("shows manage link when showManageLink is true", () => {
      render(
        <PipelineSelector value={null} onChange={() => {}} showManageLink />,
      );

      expect(screen.getByText("Manage Pipelines")).toBeInTheDocument();
    });

    it("hides manage link by default", () => {
      render(<PipelineSelector value={null} onChange={() => {}} />);

      expect(screen.queryByText("Manage Pipelines")).not.toBeInTheDocument();
    });

    it("shows edit link for owned pipeline when showManageLink is true", () => {
      render(
        <PipelineSelector
          value="my-pipeline-1"
          onChange={() => {}}
          showManageLink
        />,
      );

      expect(screen.getByText("Edit Pipeline")).toBeInTheDocument();
    });

    it("hides edit link for non-owned pipeline", () => {
      render(
        <PipelineSelector
          value="system-1"
          onChange={() => {}}
          showManageLink
        />,
      );

      expect(screen.queryByText("Edit Pipeline")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables select when disabled prop is true", () => {
      render(
        <PipelineSelector value={null} onChange={() => {}} disabled />,
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeDisabled();
    });
  });

  describe("empty groups", () => {
    it("handles empty groups gracefully", async () => {
      const user = userEvent.setup();

      mockUsePipelines.mockReturnValue({
        ...defaultMockReturn,
        groupedPipelines: {
          systemDefaults: [mockPipelines[0]],
          myPipelines: [],
          publicPipelines: [],
        },
      });

      render(<PipelineSelector value={null} onChange={() => {}} />);

      await user.click(screen.getByRole("combobox"));

      expect(screen.getByText("System Defaults")).toBeInTheDocument();
      expect(screen.queryByText("My Pipelines")).not.toBeInTheDocument();
      expect(screen.queryByText("Public Pipelines")).not.toBeInTheDocument();
    });
  });
});
