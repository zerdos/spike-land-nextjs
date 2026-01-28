import type { WorkflowStepData } from "@/types/workflow";
import { describe, expect, it, vi } from "vitest";
import {
  type ExecutionStepContext,
  getStepHandler,
  registerStepHandler,
  type StepHandler,
} from "./workflow-executor";

describe("Step Handler Registry", () => {
  describe("registerStepHandler", () => {
    it("should register a handler", () => {
      const handler: StepHandler = vi.fn().mockResolvedValue({ output: {} });
      registerStepHandler("test-action", handler);

      expect(getStepHandler("test-action")).toBe(handler);
    });

    it("should override existing handler", () => {
      const handler1: StepHandler = vi.fn().mockResolvedValue({ output: { v: 1 } });
      const handler2: StepHandler = vi.fn().mockResolvedValue({ output: { v: 2 } });

      registerStepHandler("override-action", handler1);
      registerStepHandler("override-action", handler2);

      expect(getStepHandler("override-action")).toBe(handler2);
    });
  });

  describe("getStepHandler", () => {
    it("should return undefined for unregistered handler", () => {
      expect(getStepHandler("non-existent-action")).toBeUndefined();
    });

    it("should return registered handler", () => {
      const handler: StepHandler = vi.fn();
      registerStepHandler("get-test", handler);

      expect(getStepHandler("get-test")).toBe(handler);
    });
  });
});

describe("Built-in Handlers", () => {
  const createContext = (): ExecutionStepContext => ({
    workflowId: "wf-1",
    runId: "run-1",
    previousOutputs: new Map(),
    triggerData: {},
  });

  describe("trigger handler", () => {
    it("should return empty output", async () => {
      const handler = getStepHandler("trigger");
      expect(handler).toBeDefined();

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { actionType: "trigger" },
      };

      const result = await handler!(step, createContext());
      expect(result.output).toEqual({});
    });
  });

  describe("condition handler", () => {
    it("should evaluate truthy condition", async () => {
      const handler = getStepHandler("condition");
      expect(handler).toBeDefined();

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: { actionType: "condition", condition: true },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate falsy condition", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: { actionType: "condition", condition: false },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(false);
    });

    it("should evaluate equals operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: "hello",
          rightOperand: "hello",
          operator: "equals",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate not_equals operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: "hello",
          rightOperand: "world",
          operator: "not_equals",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate greater_than operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: 100,
          rightOperand: 50,
          operator: "greater_than",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate less_than operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: 50,
          rightOperand: 100,
          operator: "less_than",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate contains operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: "hello world",
          rightOperand: "world",
          operator: "contains",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should evaluate is_empty operator", async () => {
      const handler = getStepHandler("condition");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: "",
          operator: "is_empty",
        },
      };

      const result = await handler!(step, createContext());
      expect(result.output?.["result"]).toBe(true);
    });

    it("should resolve template references from previous outputs", async () => {
      const handler = getStepHandler("condition");

      const context = createContext();
      context.previousOutputs.set("prev-step", { value: 100 });

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Condition",
        type: "CONDITION",
        config: {
          actionType: "condition",
          leftOperand: "{{prev-step.value}}",
          rightOperand: 50,
          operator: "greater_than",
        },
      };

      const result = await handler!(step, context);
      expect(result.output?.["result"]).toBe(true);
    });
  });

  describe("log handler", () => {
    it("should log message", async () => {
      const handler = getStepHandler("log");
      expect(handler).toBeDefined();

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Log",
        type: "ACTION",
        config: { actionType: "log", message: "Test message" },
      };

      const result = await handler!(step, createContext());

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.output?.["logged"]).toBe("Test message");

      consoleSpy.mockRestore();
    });
  });

  describe("delay handler", () => {
    it("should delay execution", async () => {
      const handler = getStepHandler("delay");
      expect(handler).toBeDefined();

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Delay",
        type: "ACTION",
        config: { actionType: "delay", durationMs: 10 },
      };

      const start = Date.now();
      const result = await handler!(step, createContext());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(10);
      expect(result.output?.["delayed"]).toBe(10);
    });

    it("should cap delay at 30 seconds", async () => {
      const handler = getStepHandler("delay");

      const step: WorkflowStepData = {
        id: "step-1",
        name: "Delay",
        type: "ACTION",
        config: { actionType: "delay", durationMs: 60000 }, // 60 seconds
      };

      // Mock setTimeout to avoid actual delay
      vi.useFakeTimers();

      const promise = handler!(step, createContext());
      vi.advanceTimersByTime(30000);

      const result = await promise;
      expect(result.output?.["delayed"]).toBe(30000); // Capped at 30s

      vi.useRealTimers();
    });
  });
});
