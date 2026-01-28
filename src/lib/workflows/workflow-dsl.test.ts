import type { WorkflowDSL, WorkflowStepData } from "@/types/workflow";
import type { WorkflowStepType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  dslToWorkflowVersion,
  exportToJSON,
  exportToYAML,
  parseDSLFromJSON,
  parseDSLFromYAML,
  parseWorkflowDSL,
  workflowToDSL,
} from "./workflow-dsl";

describe("workflow-dsl", () => {
  const sampleSteps: WorkflowStepData[] = [
    {
      id: "trigger-1",
      name: "On Schedule",
      type: "TRIGGER" as WorkflowStepType,
      sequence: 0,
      config: { cron: "0 9 * * *" },
    },
    {
      id: "action-1",
      name: "Send Notification",
      type: "ACTION" as WorkflowStepType,
      sequence: 1,
      config: { type: "email", to: "user@example.com" },
      dependencies: ["trigger-1"],
    },
  ];

  const sampleDSL: WorkflowDSL = {
    version: "1.0",
    name: "Daily Notification",
    description: "Sends a daily email notification",
    steps: [
      {
        id: "trigger-1",
        name: "On Schedule",
        type: "TRIGGER",
        config: { cron: "0 9 * * *" },
      },
      {
        id: "action-1",
        name: "Send Notification",
        type: "ACTION",
        config: { type: "email", to: "user@example.com" },
        dependsOn: ["trigger-1"],
      },
    ],
  };

  describe("workflowToDSL", () => {
    it("should convert workflow steps to DSL format", () => {
      const dsl = workflowToDSL(
        "Daily Notification",
        "Sends a daily email notification",
        sampleSteps,
      );

      expect(dsl.version).toBe("1.0");
      expect(dsl.name).toBe("Daily Notification");
      expect(dsl.description).toBe("Sends a daily email notification");
      expect(dsl.steps).toHaveLength(2);
    });

    it("should handle steps with branches", () => {
      const stepsWithBranches: WorkflowStepData[] = [
        {
          id: "condition-1",
          name: "Check Value",
          type: "CONDITION" as WorkflowStepType,
          sequence: 0,
          config: { expression: "value > 10" },
        },
        {
          id: "action-true",
          name: "High Value",
          type: "ACTION" as WorkflowStepType,
          sequence: 1,
          config: {},
          parentStepId: "condition-1",
          branchType: "IF_TRUE",
          branchCondition: "value > 10",
        },
        {
          id: "action-false",
          name: "Low Value",
          type: "ACTION" as WorkflowStepType,
          sequence: 2,
          config: {},
          parentStepId: "condition-1",
          branchType: "IF_FALSE",
        },
      ];

      const dsl = workflowToDSL("Conditional Workflow", null, stepsWithBranches);

      expect(dsl.steps).toHaveLength(1);
      expect(dsl.steps[0]?.branches).toBeDefined();
      expect(dsl.steps[0]?.branches).toHaveLength(2);
    });

    it("should handle null description", () => {
      const dsl = workflowToDSL("Test", null, sampleSteps);
      expect(dsl.description).toBeUndefined();
    });
  });

  describe("parseDSLFromJSON", () => {
    it("should parse valid JSON DSL", () => {
      const json = JSON.stringify(sampleDSL);
      const parsed = parseDSLFromJSON(json);

      expect(parsed.version).toBe("1.0");
      expect(parsed.name).toBe("Daily Notification");
      expect(parsed.steps).toHaveLength(2);
    });

    it("should reject invalid version", () => {
      const invalid = { ...sampleDSL, version: "2.0" };
      expect(() => parseDSLFromJSON(JSON.stringify(invalid))).toThrow(
        "Invalid DSL version",
      );
    });

    it("should reject missing name", () => {
      const invalid = { ...sampleDSL, name: "" };
      expect(() => parseDSLFromJSON(JSON.stringify(invalid))).toThrow(
        "name is required",
      );
    });

    it("should reject non-array steps", () => {
      const invalid = { ...sampleDSL, steps: "not an array" };
      expect(() => parseDSLFromJSON(JSON.stringify(invalid))).toThrow(
        "steps must be an array",
      );
    });

    it("should reject invalid step type", () => {
      const invalid = {
        ...sampleDSL,
        steps: [{ id: "1", name: "test", type: "INVALID", config: {} }],
      };
      expect(() => parseDSLFromJSON(JSON.stringify(invalid))).toThrow(
        "Invalid step type",
      );
    });
  });

  describe("parseDSLFromYAML", () => {
    it("should parse valid YAML DSL", () => {
      const yaml = `
version: "1.0"
name: Daily Notification
description: Sends a daily email notification
steps:
  - id: trigger-1
    name: On Schedule
    type: TRIGGER
    config:
      cron: "0 9 * * *"
  - id: action-1
    name: Send Notification
    type: ACTION
    config:
      type: email
      to: user@example.com
    dependsOn:
      - trigger-1
`;

      const parsed = parseDSLFromYAML(yaml);

      expect(parsed.version).toBe("1.0");
      expect(parsed.name).toBe("Daily Notification");
      expect(parsed.steps).toHaveLength(2);
    });
  });

  describe("dslToWorkflowVersion", () => {
    it("should convert DSL to workflow version data", () => {
      const result = dslToWorkflowVersion(sampleDSL);

      expect(result.name).toBe("Daily Notification");
      expect(result.description).toBe("Sends a daily email notification");
      expect(result.steps).toHaveLength(2);

      const triggerStep = result.steps.find((s) => s.id === "trigger-1");
      expect(triggerStep?.type).toBe("TRIGGER");
      expect(triggerStep?.config).toEqual({ cron: "0 9 * * *" });

      const actionStep = result.steps.find((s) => s.id === "action-1");
      expect(actionStep?.dependencies).toContain("trigger-1");
    });

    it("should convert DSL with branches", () => {
      const dslWithBranches: WorkflowDSL = {
        version: "1.0",
        name: "Conditional",
        steps: [
          {
            id: "condition-1",
            name: "Check",
            type: "CONDITION",
            config: {},
            branches: [
              {
                type: "IF_TRUE",
                condition: "value > 10",
                steps: [
                  {
                    id: "action-true",
                    name: "High",
                    type: "ACTION",
                    config: {},
                  },
                ],
              },
              {
                type: "IF_FALSE",
                steps: [
                  {
                    id: "action-false",
                    name: "Low",
                    type: "ACTION",
                    config: {},
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = dslToWorkflowVersion(dslWithBranches);

      expect(result.steps).toHaveLength(3);

      const trueStep = result.steps.find((s) => s.id === "action-true");
      expect(trueStep?.parentStepId).toBe("condition-1");
      expect(trueStep?.branchType).toBe("IF_TRUE");
      expect(trueStep?.branchCondition).toBe("value > 10");

      const falseStep = result.steps.find((s) => s.id === "action-false");
      expect(falseStep?.parentStepId).toBe("condition-1");
      expect(falseStep?.branchType).toBe("IF_FALSE");
    });
  });

  describe("exportToJSON", () => {
    it("should export workflow to JSON format", () => {
      const json = exportToJSON("Test", "Description", sampleSteps);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe("1.0");
      expect(parsed.name).toBe("Test");
      expect(parsed.steps).toHaveLength(2);
    });

    it("should produce valid JSON that can be re-parsed", () => {
      const json = exportToJSON("Test", "Description", sampleSteps);
      expect(() => parseDSLFromJSON(json)).not.toThrow();
    });
  });

  describe("exportToYAML", () => {
    it("should export workflow to YAML format", () => {
      const yaml = exportToYAML("Test", "Description", sampleSteps);

      expect(yaml).toContain("version:");
      expect(yaml).toContain("name: Test");
      expect(yaml).toContain("steps:");
    });

    it("should produce valid YAML that can be re-parsed", () => {
      const yaml = exportToYAML("Test", "Description", sampleSteps);
      expect(() => parseDSLFromYAML(yaml)).not.toThrow();
    });
  });

  describe("parseWorkflowDSL", () => {
    it("should auto-detect and parse JSON", () => {
      const json = JSON.stringify(sampleDSL);
      const parsed = parseWorkflowDSL(json);
      expect(parsed.name).toBe("Daily Notification");
    });

    it("should auto-detect and parse YAML", () => {
      const yaml = `
version: "1.0"
name: YAML Workflow
steps: []
`;
      const parsed = parseWorkflowDSL(yaml);
      expect(parsed.name).toBe("YAML Workflow");
    });

    it("should handle whitespace in input", () => {
      const json = `   ${JSON.stringify(sampleDSL)}   `;
      const parsed = parseWorkflowDSL(json);
      expect(parsed.name).toBe("Daily Notification");
    });
  });
});
