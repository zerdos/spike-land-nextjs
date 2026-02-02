/**
 * Workflow Actions Registry Implementation
 */

import type { WorkflowActionType } from "@/types/workflow";

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
 */
export const ACTION_REGISTRY: Partial<Record<WorkflowActionType, ActionDefinition>> = {};

/**
 * Register an action definition
 */
export function registerAction(definition: ActionDefinition): void {
  ACTION_REGISTRY[definition.type] = definition;
}

/**
 * Get action definition by type
 */
export function getActionDefinition(type: WorkflowActionType): ActionDefinition | null {
  return ACTION_REGISTRY[type] ?? null;
}

/**
 * Validate action configuration against schema
 */
export function validateActionConfig(type: WorkflowActionType, config: unknown): boolean {
  const definition = getActionDefinition(type);
  if (!definition) {
    return false;
  }

  // TODO: Implement proper JSON schema validation
  // For now, we assume simple validation is handled by the type system
  // In a real implementation, we would use ajv or similar to validate `config` against `definition.configSchema`

  return true;
}
