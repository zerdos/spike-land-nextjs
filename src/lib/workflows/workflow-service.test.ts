import type { WorkflowStepData } from "@/types/workflow";
import type { WorkflowStepType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkflow,
  createWorkflowVersion,
  deleteWorkflow,
  getStepExecutions,
  getWorkflow,
  initializeStepExecutions,
  listWorkflows,
  publishWorkflowVersion,
  updateStepExecution,
  updateWorkflow,
} from "./workflow-service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workflow: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workflowVersion: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    workflowRun: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import mocked prisma
import prisma from "@/lib/prisma";

// Sample data for tests
const mockWorkflow = {
  id: "wf-1",
  name: "Test Workflow",
  description: "A test workflow",
  status: "DRAFT",
  workspaceId: "ws-1",
  createdById: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  versions: [
    {
      id: "ver-1",
      workflowId: "wf-1",
      version: 1,
      description: "Initial version",
      isPublished: false,
      publishedAt: null,
      createdAt: new Date(),
      steps: [
        {
          id: "step-1",
          workflowVersionId: "ver-1",
          name: "Start",
          type: "TRIGGER",
          sequence: 0,
          config: {},
          dependencies: null,
          parentStepId: null,
          branchType: null,
          branchCondition: null,
          createdAt: new Date(),
        },
      ],
    },
  ],
  createdBy: { id: "user-1", name: "Test User" },
};

describe("workflow-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listWorkflows", () => {
    it("should list workflows for a workspace", async () => {
      vi.mocked(prisma.workflow.findMany).mockResolvedValue([mockWorkflow] as any);
      vi.mocked(prisma.workflow.count).mockResolvedValue(1);

      const result = await listWorkflows("ws-1");

      expect(result.total).toBe(1);
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0]?.name).toBe("Test Workflow");
      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1" },
        }),
      );
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.workflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.workflow.count).mockResolvedValue(0);

      await listWorkflows("ws-1", { status: "ACTIVE" });

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1", status: "ACTIVE" },
        }),
      );
    });

    it("should handle pagination", async () => {
      vi.mocked(prisma.workflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.workflow.count).mockResolvedValue(100);

      await listWorkflows("ws-1", { page: 3, pageSize: 10 });

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe("getWorkflow", () => {
    it("should get a single workflow", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);

      const result = await getWorkflow("wf-1", "ws-1");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Workflow");
      expect(prisma.workflow.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "wf-1", workspaceId: "ws-1" },
        }),
      );
    });

    it("should return null for non-existent workflow", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);

      const result = await getWorkflow("wf-999", "ws-1");

      expect(result).toBeNull();
    });
  });

  describe("createWorkflow", () => {
    it("should create a workflow", async () => {
      vi.mocked(prisma.workflow.create).mockResolvedValue(mockWorkflow as any);

      const result = await createWorkflow("ws-1", "user-1", {
        name: "Test Workflow",
        description: "A test workflow",
      });

      expect(result.name).toBe("Test Workflow");
      expect(prisma.workflow.create).toHaveBeenCalled();
    });

    it("should create workflow with initial steps", async () => {
      vi.mocked(prisma.workflow.create).mockResolvedValue(mockWorkflow as any);

      const steps: WorkflowStepData[] = [
        {
          name: "Start",
          type: "TRIGGER" as WorkflowStepType,
          config: {},
        },
      ];

      await createWorkflow("ws-1", "user-1", {
        name: "Test",
        steps,
      });

      expect(prisma.workflow.create).toHaveBeenCalled();
    });

    it("should reject invalid steps", async () => {
      const invalidSteps: WorkflowStepData[] = [
        {
          name: "", // Invalid: empty name
          type: "TRIGGER" as WorkflowStepType,
          config: {},
        },
      ];

      await expect(
        createWorkflow("ws-1", "user-1", {
          name: "Test",
          steps: invalidSteps,
        }),
      ).rejects.toThrow("Invalid workflow");
    });
  });

  describe("updateWorkflow", () => {
    it("should update workflow metadata", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(prisma.workflow.update).mockResolvedValue({
        ...mockWorkflow,
        name: "Updated Name",
      } as any);

      const result = await updateWorkflow("wf-1", "ws-1", {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
    });

    it("should throw if workflow not found", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);

      await expect(
        updateWorkflow("wf-999", "ws-1", { name: "Test" }),
      ).rejects.toThrow("Workflow not found");
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(prisma.workflow.delete).mockResolvedValue(mockWorkflow as any);

      await deleteWorkflow("wf-1", "ws-1");

      expect(prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: "wf-1" },
      });
    });

    it("should throw if workflow not found", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);

      await expect(deleteWorkflow("wf-999", "ws-1")).rejects.toThrow(
        "Workflow not found",
      );
    });
  });

  describe("createWorkflowVersion", () => {
    it("should create a new version", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(prisma.workflowVersion.create).mockResolvedValue({
        id: "ver-2",
        workflowId: "wf-1",
        version: 2,
        description: "New version",
        isPublished: false,
        publishedAt: null,
        createdAt: new Date(),
        steps: [],
      } as any);

      const steps: WorkflowStepData[] = [
        {
          name: "Start",
          type: "TRIGGER" as WorkflowStepType,
          config: {},
        },
      ];

      const result = await createWorkflowVersion("wf-1", "ws-1", {
        description: "New version",
        steps,
      });

      expect(result.version).toBe(2);
    });

    it("should throw if workflow not found", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);

      await expect(
        createWorkflowVersion("wf-999", "ws-1", {
          steps: [
            {
              name: "Start",
              type: "TRIGGER" as WorkflowStepType,
              config: {},
            },
          ],
        }),
      ).rejects.toThrow("Workflow not found");
    });
  });

  describe("publishWorkflowVersion", () => {
    it("should publish a version", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(prisma.workflowVersion.findFirst).mockResolvedValue({
        id: "ver-1",
        workflowId: "wf-1",
        version: 1,
        isPublished: false,
        publishedAt: null,
        createdAt: new Date(),
        steps: [
          {
            id: "step-1",
            name: "Start",
            type: "TRIGGER",
            sequence: 0,
            config: {},
          },
          {
            id: "step-2",
            name: "Action",
            type: "ACTION",
            sequence: 1,
            config: {},
          },
        ],
      } as any);
      vi.mocked(prisma.workflowVersion.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.workflowVersion.update).mockResolvedValue({
        id: "ver-1",
        isPublished: true,
        publishedAt: new Date(),
        steps: [],
      } as any);
      vi.mocked(prisma.workflow.update).mockResolvedValue(mockWorkflow as any);

      const result = await publishWorkflowVersion("wf-1", "ws-1", "ver-1");

      expect(result.isPublished).toBe(true);
      expect(prisma.workflowVersion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workflowId: "wf-1", isPublished: true },
          data: { isPublished: false },
        }),
      );
    });

    it("should throw if version has no trigger", async () => {
      vi.mocked(prisma.workflow.findFirst).mockResolvedValue(mockWorkflow as any);
      vi.mocked(prisma.workflowVersion.findFirst).mockResolvedValue({
        id: "ver-1",
        workflowId: "wf-1",
        version: 1,
        isPublished: false,
        steps: [
          {
            id: "step-1",
            name: "Action Only",
            type: "ACTION",
            sequence: 0,
            config: {},
          },
        ],
      } as any);

      await expect(
        publishWorkflowVersion("wf-1", "ws-1", "ver-1"),
      ).rejects.toThrow("Cannot publish workflow");
    });
  });

  describe("Step Execution Tracking", () => {
    const mockSteps = [
      {
        id: "step-1",
        workflowVersionId: "ver-1",
        name: "Step 1",
        type: "ACTION",
        sequence: 0,
        config: {},
        dependencies: null,
        createdAt: new Date(),
        parentStepId: null,
        branchType: null,
        branchCondition: null,
      },
      {
        id: "step-2",
        workflowVersionId: "ver-1",
        name: "Step 2",
        type: "ACTION",
        sequence: 1,
        config: {},
        dependencies: null,
        createdAt: new Date(),
        parentStepId: null,
        branchType: null,
        branchCondition: null,
      },
    ];

    describe("initializeStepExecutions", () => {
      it("should initialize execution state for all steps", () => {
        const result = initializeStepExecutions(mockSteps as any);

        expect(result).toEqual({
          "step-1": {
            stepId: "step-1",
            status: "PENDING",
          },
          "step-2": {
            stepId: "step-2",
            status: "PENDING",
          },
        });
      });

      it("should handle empty steps array", () => {
        const result = initializeStepExecutions([]);

        expect(result).toEqual({});
      });
    });

    describe("updateStepExecution", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("should update step execution state", async () => {
        const mockRun = {
          id: "run-1",
          stepExecutions: {
            "step-1": {
              stepId: "step-1",
              status: "PENDING",
            },
          },
        };

        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue(mockRun as any);
        vi.mocked(prisma.workflowRun.update).mockResolvedValue({} as any);

        await updateStepExecution("run-1", "step-1", {
          status: "RUNNING",
          startedAt: new Date(),
        });

        expect(prisma.workflowRun.update).toHaveBeenCalledWith({
          where: { id: "run-1" },
          data: {
            stepExecutions: expect.objectContaining({
              "step-1": expect.objectContaining({
                status: "RUNNING",
                startedAt: expect.any(Date),
              }),
            }),
          },
        });
      });

      it("should handle run with no existing step executions", async () => {
        const mockRun = {
          id: "run-1",
          stepExecutions: null,
        };

        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue(mockRun as any);
        vi.mocked(prisma.workflowRun.update).mockResolvedValue({} as any);

        await updateStepExecution("run-1", "step-1", {
          status: "COMPLETED",
        });

        expect(prisma.workflowRun.update).toHaveBeenCalledWith({
          where: { id: "run-1" },
          data: {
            stepExecutions: {
              "step-1": {
                status: "COMPLETED",
              },
            },
          },
        });
      });

      it("should throw if run not found", async () => {
        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue(null);

        await expect(
          updateStepExecution("invalid-run", "step-1", { status: "RUNNING" }),
        ).rejects.toThrow("Workflow run invalid-run not found");
      });
    });

    describe("getStepExecutions", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("should return step execution states", async () => {
        const mockExecutions = {
          "step-1": {
            stepId: "step-1",
            status: "COMPLETED",
            startedAt: new Date(),
            endedAt: new Date(),
          },
          "step-2": {
            stepId: "step-2",
            status: "RUNNING",
            startedAt: new Date(),
          },
        };

        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue({
          id: "run-1",
          stepExecutions: mockExecutions,
        } as any);

        const result = await getStepExecutions("run-1");

        expect(result).toEqual(mockExecutions);
      });

      it("should return empty object if no step executions", async () => {
        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue({
          id: "run-1",
          stepExecutions: null,
        } as any);

        const result = await getStepExecutions("run-1");

        expect(result).toEqual({});
      });

      it("should throw if run not found", async () => {
        vi.mocked(prisma.workflowRun.findUnique).mockResolvedValue(null);

        await expect(getStepExecutions("invalid-run")).rejects.toThrow(
          "Workflow run invalid-run not found",
        );
      });
    });
  });
});
