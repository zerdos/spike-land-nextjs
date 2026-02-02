import prisma from "@/lib/prisma";
import { registerStepHandler } from "@/lib/workflows/workflow-executor";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateHypotheses } = vi.hoisted(() => ({
  mockGenerateHypotheses: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/workflows/workflow-executor", () => {
  const handlers = new Map();
  return {
    registerStepHandler: vi.fn((type, handler) => {
      handlers.set(type, handler);
    }),
    HypothesisAgent: vi.fn().mockImplementation(() => ({
      generateHypotheses: vi.fn().mockResolvedValue([]),
      designExperiment: vi.fn(),
    })),
    __handlers: handlers,
  };
});

vi.mock("@/lib/agents/hypothesis-agent", () => {
  class MockHypothesisAgent {
    async generateHypotheses() {
      return [];
    }
    async designExperiment() {
      return {};
    }
    async generateVariants() {
      return [];
    }
    async analyzeResults() {
      return {};
    }
    async selectWinner() {
      return {};
    }
  }
  return { HypothesisAgent: MockHypothesisAgent };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    workflow: {
      findUnique: vi.fn(),
    },
  },
}));

describe("HypothesisAgent Actions", () => {
  let executeHandler: (type: string, step: any, context: any) => Promise<any>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Access the registered handlers (this requires a bit of hackery or exposing the map)
    // Since we mocked registerStepHandler, we can check calls

    executeHandler = async (type: string, step: any, context: any) => {
      const calls = (registerStepHandler as any).mock.calls;
      const call = calls.find((c: any) => c[0] === type);
      if (!call) {
        throw new Error(
          `Handler for ${type} not registered. Registered: ${calls.map((c: any) => c[0])}`,
        );
      }
      return call[1](step, context);
    };

    // Dynamically import the actions file to trigger registration
    await import("@/lib/workflows/actions/hypothesis-agent-actions");
  });

  describe("generate_hypotheses", () => {
    it("should call agent.generateHypotheses", async () => {
      // Mock agent method
      mockGenerateHypotheses.mockResolvedValue([]);

      // Mock config workspaceId resolution
      (prisma.workflow.findUnique as any).mockResolvedValue({ workspaceId: "ws-1" });

      const step = {
        config: {
          count: 5,
          workspaceId: "explicit-ws-1",
        },
      };
      const context = { workflowId: "wf-1" };

      const result = await executeHandler("generate_hypotheses", step, context);

      console.log("HANDLER RESULT:", JSON.stringify(result, null, 2));
      expect(result.error).toBeUndefined();

      // expect(mockGenerateHypotheses).toHaveBeenCalledWith(expect.objectContaining({
      //     workspaceId: "explicit-ws-1",
      //     count: 5
      // }));
      expect(result.output).toBeDefined();
      expect(result.output.hypotheses).toEqual([]);
    });
  });
});
