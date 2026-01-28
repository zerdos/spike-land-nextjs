import type { WorkflowStepData } from "@/types/workflow";
import type { WorkflowStepType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { validateForPublish, validateWorkflow } from "./workflow-validator";

describe("workflow-validator", () => {
  describe("validateWorkflow", () => {
    it("should validate a simple workflow with trigger and action", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Start",
          type: "TRIGGER" as WorkflowStepType,
          sequence: 0,
          config: { trigger: "manual" },
        },
        {
          id: "step-2",
          name: "Send Email",
          type: "ACTION" as WorkflowStepType,
          sequence: 1,
          config: { action: "send_notification" },
          dependencies: ["step-1"],
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing step name", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "",
          type: "TRIGGER" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "MISSING_NAME" }),
      );
    });

    it("should detect invalid step type", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Invalid Step",
          type: "INVALID" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_TYPE" }),
      );
    });

    it("should detect invalid sequence when provided", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Bad Sequence",
          type: "TRIGGER" as WorkflowStepType,
          sequence: -1,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_SEQUENCE" }),
      );
    });

    it("should allow missing sequence", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "No Sequence",
          type: "TRIGGER" as WorkflowStepType,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(true);
    });

    it("should detect circular dependencies", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Step 1",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
          dependencies: ["step-2"],
        },
        {
          id: "step-2",
          name: "Step 2",
          type: "ACTION" as WorkflowStepType,
          sequence: 1,
          config: {},
          dependencies: ["step-1"],
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "CYCLE_DETECTED" }),
      );
    });

    it("should detect missing dependency references", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Step 1",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
          dependencies: ["non-existent-step"],
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "MISSING_DEPENDENCY" }),
      );
    });

    it("should detect missing parent step reference", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Branch Step",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
          parentStepId: "non-existent-parent",
          branchType: "IF_TRUE",
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "MISSING_PARENT" }),
      );
    });

    it("should warn about branch without parent", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Orphan Branch",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
          branchType: "IF_TRUE",
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "BRANCH_WITHOUT_PARENT" }),
      );
    });

    it("should warn about missing trigger", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Action Only",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "NO_TRIGGER" }),
      );
    });

    it("should warn about condition without branches", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Condition",
          type: "CONDITION" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: "CONDITION_NO_BRANCHES" }),
      );
    });

    it("should validate workflow with branches", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "condition-1",
          name: "Check Value",
          type: "CONDITION" as WorkflowStepType,
          sequence: 0,
          config: { expression: "value > 10" },
          childSteps: [
            {
              id: "branch-true",
              name: "High Value Action",
              type: "ACTION" as WorkflowStepType,
              sequence: 1,
              config: {},
              parentStepId: "condition-1",
              branchType: "IF_TRUE",
            },
            {
              id: "branch-false",
              name: "Low Value Action",
              type: "ACTION" as WorkflowStepType,
              sequence: 2,
              config: {},
              parentStepId: "condition-1",
              branchType: "IF_FALSE",
            },
          ],
        },
      ];

      const result = validateWorkflow(steps);
      expect(result.valid).toBe(true);
    });

    it("should validate empty workflow", () => {
      const steps: WorkflowStepData[] = [];
      const result = validateWorkflow(steps);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateForPublish", () => {
    it("should require at least one trigger for publishing", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Action Only",
          type: "ACTION" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateForPublish(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "NO_TRIGGER_FOR_PUBLISH" }),
      );
    });

    it("should require at least one action for publishing", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Trigger Only",
          type: "TRIGGER" as WorkflowStepType,
          sequence: 0,
          config: {},
        },
      ];

      const result = validateForPublish(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "NO_ACTION_FOR_PUBLISH" }),
      );
    });

    it("should reject empty workflow for publishing", () => {
      const steps: WorkflowStepData[] = [];
      const result = validateForPublish(steps);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "EMPTY_WORKFLOW" }),
      );
    });

    it("should allow publishing valid workflow with trigger and action", () => {
      const steps: WorkflowStepData[] = [
        {
          id: "step-1",
          name: "Start",
          type: "TRIGGER" as WorkflowStepType,
          sequence: 0,
          config: { trigger: "manual" },
        },
        {
          id: "step-2",
          name: "Do Something",
          type: "ACTION" as WorkflowStepType,
          sequence: 1,
          config: {},
          dependencies: ["step-1"],
        },
      ];

      const result = validateForPublish(steps);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
