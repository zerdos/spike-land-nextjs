import { WorkflowActionType } from "@/types/workflow";
import { describe, expect, it } from "vitest";
import {
  ACTION_REGISTRY,
  getActionDefinition,
  getActionsByCategory,
  getAvailableActionTypes,
  validateActionConfig,
} from "./index";

describe("Action Registry", () => {
  describe("ACTION_REGISTRY", () => {
    it("should contain all defined action types", () => {
      expect(ACTION_REGISTRY.POST_TO_SOCIAL).toBeDefined();
      expect(ACTION_REGISTRY.SEND_EMAIL).toBeDefined();
      expect(ACTION_REGISTRY.GENERATE_CONTENT).toBeDefined();
      expect(ACTION_REGISTRY.DELAY).toBeDefined();
      expect(ACTION_REGISTRY.TRIGGER_WEBHOOK).toBeDefined();
    });

    it("should have proper structure for each action", () => {
      const action = ACTION_REGISTRY.POST_TO_SOCIAL!;

      expect(action.type).toBe(WorkflowActionType.POST_TO_SOCIAL);
      expect(action.name).toBe("Post to Social Media");
      expect(action.description).toBeDefined();
      expect(action.category).toBe("social");
      expect(action.configSchema).toBeDefined();
      expect(action.exampleConfig).toBeDefined();
    });
  });

  describe("getActionDefinition", () => {
    it("should return action definition for valid type", () => {
      const definition = getActionDefinition(WorkflowActionType.SEND_EMAIL);

      expect(definition).toBeDefined();
      expect(definition?.type).toBe(WorkflowActionType.SEND_EMAIL);
      expect(definition?.name).toBe("Send Email");
      expect(definition?.category).toBe("notification");
    });

    it("should return null for invalid type", () => {
      const definition = getActionDefinition("INVALID_TYPE" as WorkflowActionType);

      expect(definition).toBeNull();
    });
  });

  describe("getActionsByCategory", () => {
    it("should return all social actions", () => {
      const actions = getActionsByCategory("social");

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every((a) => a.category === "social")).toBe(true);
    });

    it("should return all notification actions", () => {
      const actions = getActionsByCategory("notification");

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every((a) => a.category === "notification")).toBe(true);
    });

    it("should return all AI actions", () => {
      const actions = getActionsByCategory("ai");

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every((a) => a.category === "ai")).toBe(true);
    });

    it("should return all control flow actions", () => {
      const actions = getActionsByCategory("control");

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every((a) => a.category === "control")).toBe(true);
    });

    it("should return all data actions", () => {
      const actions = getActionsByCategory("data");

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every((a) => a.category === "data")).toBe(true);
    });
  });

  describe("getAvailableActionTypes", () => {
    it("should return array of action types", () => {
      const types = getAvailableActionTypes();

      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain(WorkflowActionType.POST_TO_SOCIAL);
      expect(types).toContain(WorkflowActionType.SEND_EMAIL);
    });
  });

  describe("validateActionConfig", () => {
    it("should validate valid POST_TO_SOCIAL config", () => {
      const config = {
        actionType: WorkflowActionType.POST_TO_SOCIAL,
        platform: "twitter",
        accountId: "account_123",
        content: "Test post",
      };

      const isValid = validateActionConfig(WorkflowActionType.POST_TO_SOCIAL, config);

      expect(isValid).toBe(true);
    });

    it("should validate valid SEND_EMAIL config", () => {
      const config = {
        actionType: WorkflowActionType.SEND_EMAIL,
        to: "test@example.com",
        subject: "Test Email",
        body: "Email body",
      };

      const isValid = validateActionConfig(WorkflowActionType.SEND_EMAIL, config);

      expect(isValid).toBe(true);
    });

    it("should invalidate config with missing required fields", () => {
      const config = {
        actionType: WorkflowActionType.SEND_EMAIL,
        to: "test@example.com",
        // Missing subject and body
      };

      const isValid = validateActionConfig(WorkflowActionType.SEND_EMAIL, config);

      expect(isValid).toBe(false);
    });

    it("should invalidate non-object config", () => {
      const isValid = validateActionConfig(WorkflowActionType.POST_TO_SOCIAL, "invalid");

      expect(isValid).toBe(false);
    });

    it("should invalidate null config", () => {
      const isValid = validateActionConfig(WorkflowActionType.POST_TO_SOCIAL, null);

      expect(isValid).toBe(false);
    });

    it("should return false for invalid action type", () => {
      const config = { someField: "value" };
      const isValid = validateActionConfig("INVALID_TYPE" as WorkflowActionType, config);

      expect(isValid).toBe(false);
    });

    it("should validate DELAY config with duration", () => {
      const config = {
        actionType: WorkflowActionType.DELAY,
        duration: 5000,
      };

      const isValid = validateActionConfig(WorkflowActionType.DELAY, config);

      expect(isValid).toBe(true);
    });

    it("should validate TRIGGER_WEBHOOK config", () => {
      const config = {
        actionType: WorkflowActionType.TRIGGER_WEBHOOK,
        url: "https://api.example.com/webhook",
        method: "POST",
      };

      const isValid = validateActionConfig(WorkflowActionType.TRIGGER_WEBHOOK, config);

      expect(isValid).toBe(true);
    });

    it("should validate GENERATE_CONTENT config", () => {
      const config = {
        actionType: WorkflowActionType.GENERATE_CONTENT,
        prompt: "Write a tweet about AI",
      };

      const isValid = validateActionConfig(WorkflowActionType.GENERATE_CONTENT, config);

      expect(isValid).toBe(true);
    });
  });
});
