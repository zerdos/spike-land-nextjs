/**
 * Workflow Actions Registry
 *
 * This file provides a centralized registry of all available workflow actions.
 * Each action type has:
 * - TypeScript type definition
 * - JSON schema for validation
 * - Documentation
 * - Example usage
 */

import { WorkflowActionType } from "@/types/workflow";

/**
 * Action definition with schema and metadata
 */
export interface ActionDefinition {
  type: WorkflowActionType;
  name: string;
  description: string;
  category: "social" | "notification" | "ai" | "data" | "control";
  configSchema: object; // JSON Schema
  exampleConfig: object;
  requiredPermissions?: string[];
}

/**
 * Registry of all available workflow actions
 *
 * This registry maps action types to their definitions, schemas, and examples.
 * Used for validation, UI rendering, and documentation.
 */
export const ACTION_REGISTRY: Partial<Record<WorkflowActionType, ActionDefinition>> = {
  POST_TO_SOCIAL: {
    type: WorkflowActionType.POST_TO_SOCIAL,
    name: "Post to Social Media",
    description: "Create and publish a post to a social media platform",
    category: "social",
    configSchema: {
      type: "object",
      required: ["platform", "accountId", "content"],
      properties: {
        platform: { type: "string", enum: ["twitter", "facebook", "instagram", "linkedin"] },
        accountId: { type: "string" },
        content: { type: "string", maxLength: 5000 },
        mediaUrls: { type: "array", items: { type: "string", format: "uri" } },
      },
    },
    exampleConfig: {
      actionType: "POST_TO_SOCIAL",
      platform: "twitter",
      accountId: "account_123",
      content: "Hello world! 🌍",
      mediaUrls: ["https://example.com/image.jpg"],
    },
    requiredPermissions: ["social:write"],
  },

  SEND_EMAIL: {
    type: WorkflowActionType.SEND_EMAIL,
    name: "Send Email",
    description: "Send an email notification",
    category: "notification",
    configSchema: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to: {
          oneOf: [
            { type: "string", format: "email" },
            { type: "array", items: { type: "string", format: "email" } },
          ],
        },
        subject: { type: "string", maxLength: 200 },
        body: { type: "string" },
        templateId: { type: "string" },
      },
    },
    exampleConfig: {
      actionType: "SEND_EMAIL",
      to: "user@example.com",
      subject: "Workflow Notification",
      body: "Your workflow has completed successfully.",
    },
    requiredPermissions: ["email:send"],
  },

  GENERATE_CONTENT: {
    type: WorkflowActionType.GENERATE_CONTENT,
    name: "Generate Content with AI",
    description: "Generate content using AI based on a prompt",
    category: "ai",
    configSchema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string" },
        maxTokens: { type: "number", minimum: 1, maximum: 4000 },
        temperature: { type: "number", minimum: 0, maximum: 2 },
        outputVariable: { type: "string", pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$" },
      },
    },
    exampleConfig: {
      actionType: "GENERATE_CONTENT",
      prompt: "Write a professional tweet about our new product launch",
      maxTokens: 100,
      temperature: 0.7,
      outputVariable: "generatedTweet",
    },
    requiredPermissions: ["ai:generate"],
  },

  DELAY: {
    type: WorkflowActionType.DELAY,
    name: "Delay",
    description: "Pause workflow execution for a specified duration",
    category: "control",
    configSchema: {
      type: "object",
      oneOf: [
        { required: ["duration"] },
        { required: ["until"] },
      ],
      properties: {
        duration: { type: "number", minimum: 0, description: "Delay duration in milliseconds" },
        until: { type: "string", format: "date-time", description: "Delay until specific time" },
      },
    },
    exampleConfig: {
      actionType: "DELAY",
      duration: 5000, // 5 seconds
    },
  },

  TRIGGER_WEBHOOK: {
    type: WorkflowActionType.TRIGGER_WEBHOOK,
    name: "Trigger Webhook",
    description: "Send an HTTP request to an external webhook",
    category: "data",
    configSchema: {
      type: "object",
      required: ["url", "method"],
      properties: {
        url: { type: "string", format: "uri" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        headers: { type: "object", additionalProperties: { type: "string" } },
        body: { type: "object" },
      },
    },
    exampleConfig: {
      actionType: "TRIGGER_WEBHOOK",
      url: "https://api.example.com/webhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${secrets.apiKey}",
      },
      body: {
        event: "workflow_completed",
        timestamp: "${context.timestamp}",
      },
    },
    requiredPermissions: ["webhook:trigger"],
  },
};

/**
 * Get action definition by type
 */
export function getActionDefinition(type: WorkflowActionType): ActionDefinition | null {
  return ACTION_REGISTRY[type] ?? null;
}

/**
 * Get all action definitions in a category
 */
export function getActionsByCategory(category: ActionDefinition["category"]): ActionDefinition[] {
  return Object.values(ACTION_REGISTRY).filter(
    (def): def is ActionDefinition => def?.category === category,
  );
}

/**
 * Get all available action types
 */
export function getAvailableActionTypes(): WorkflowActionType[] {
  return Object.keys(ACTION_REGISTRY) as WorkflowActionType[];
}

/**
 * Validate action configuration against schema
 *
 * @param type - The action type
 * @param config - The configuration to validate
 * @returns true if valid, false otherwise
 *
 * Note: This is a placeholder. Full JSON schema validation should be implemented
 * using a library like ajv in production.
 */
export function validateActionConfig(type: WorkflowActionType, config: unknown): boolean {
  const definition = getActionDefinition(type);
  if (!definition) {
    return false;
  }

  // Basic validation - check required properties
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const schema = definition.configSchema as {
    required?: string[];
    properties?: Record<string, unknown>;
  };

  if (schema.required) {
    const configObj = config as Record<string, unknown>;
    for (const requiredField of schema.required) {
      if (!(requiredField in configObj)) {
        return false;
      }
    }
  }

  return true;
}

// Re-export types from existing action framework
export type { WorkflowAction, ActionInput, ActionOutput } from "./action-types";
export type { WorkflowActionType as LegacyWorkflowActionType } from "./action-types";
