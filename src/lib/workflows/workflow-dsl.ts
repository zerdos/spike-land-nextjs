import type {
  WorkflowBranchDSL,
  WorkflowDSL,
  WorkflowStepData,
  WorkflowStepDSL,
} from "@/types/workflow";
import type { BranchType, WorkflowStepType } from "@prisma/client";
import { parse as parseYAML, stringify as stringifyYAML } from "yaml";

/**
 * Converts a workflow version to DSL format
 */
export function workflowToDSL(
  name: string,
  description: string | undefined | null,
  steps: WorkflowStepData[],
): WorkflowDSL {
  const rootSteps = steps.filter((s) => !s.parentStepId);
  const stepMap = buildStepMapByParent(steps);

  return {
    version: "1.0",
    name,
    description: description ?? undefined,
    steps: rootSteps.map((step) => stepToDSL(step, stepMap)),
  };
}

/**
 * Converts a single step to DSL format, including child branches
 */
function stepToDSL(
  step: WorkflowStepData,
  stepMap: Map<string | null, WorkflowStepData[]>,
): WorkflowStepDSL {
  const dsl: WorkflowStepDSL = {
    id: step.id ?? generateId(),
    name: step.name,
    type: step.type,
    config: step.config,
  };

  if (step.dependencies && step.dependencies.length > 0) {
    dsl.dependsOn = step.dependencies;
  }

  // Get child steps (branches)
  const children = stepMap.get(step.id ?? null) ?? [];
  if (children.length > 0) {
    const branches = groupByBranchType(children, stepMap);
    if (branches.length > 0) {
      dsl.branches = branches;
    }
  }

  return dsl;
}

/**
 * Groups child steps by branch type
 */
function groupByBranchType(
  children: WorkflowStepData[],
  stepMap: Map<string | null, WorkflowStepData[]>,
): WorkflowBranchDSL[] {
  const branchGroups = new Map<BranchType, WorkflowStepData[]>();

  for (const child of children) {
    const branchType = child.branchType ?? "DEFAULT";
    if (!branchGroups.has(branchType)) {
      branchGroups.set(branchType, []);
    }
    branchGroups.get(branchType)!.push(child);
  }

  return Array.from(branchGroups.entries()).map(([type, steps]) => ({
    type,
    condition: steps[0]?.branchCondition ?? undefined,
    steps: steps
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .map((s) => stepToDSL(s, stepMap)),
  }));
}

/**
 * Builds a map of parent ID to child steps
 */
function buildStepMapByParent(
  steps: WorkflowStepData[],
): Map<string | null, WorkflowStepData[]> {
  const map = new Map<string | null, WorkflowStepData[]>();

  for (const step of steps) {
    const parentId = step.parentStepId ?? null;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(step);
  }

  return map;
}

/**
 * Parses DSL from JSON format
 */
export function parseDSLFromJSON(json: string): WorkflowDSL {
  const parsed = JSON.parse(json) as WorkflowDSL;
  validateDSL(parsed);
  return parsed;
}

/**
 * Parses DSL from YAML format
 */
export function parseDSLFromYAML(yaml: string): WorkflowDSL {
  const parsed = parseYAML(yaml) as WorkflowDSL;
  validateDSL(parsed);
  return parsed;
}

/**
 * Validates DSL structure
 */
function validateDSL(dsl: unknown): asserts dsl is WorkflowDSL {
  if (!dsl || typeof dsl !== "object") {
    throw new Error("Invalid DSL: must be an object");
  }

  const obj = dsl as Record<string, unknown>;

  if (obj["version"] !== "1.0") {
    throw new Error(`Invalid DSL version: ${obj["version"]}. Expected "1.0"`);
  }

  if (typeof obj["name"] !== "string" || obj["name"].trim() === "") {
    throw new Error("Invalid DSL: name is required");
  }

  if (!Array.isArray(obj["steps"])) {
    throw new Error("Invalid DSL: steps must be an array");
  }

  for (const step of obj["steps"]) {
    validateStepDSL(step);
  }
}

/**
 * Validates a single step in DSL format
 */
function validateStepDSL(step: unknown): asserts step is WorkflowStepDSL {
  if (!step || typeof step !== "object") {
    throw new Error("Invalid step: must be an object");
  }

  const obj = step as Record<string, unknown>;

  if (typeof obj["id"] !== "string") {
    throw new Error("Invalid step: id is required");
  }

  if (typeof obj["name"] !== "string") {
    throw new Error("Invalid step: name is required");
  }

  if (!["TRIGGER", "ACTION", "CONDITION"].includes(obj["type"] as string)) {
    throw new Error(`Invalid step type: ${obj["type"]}`);
  }

  if (obj["branches"] && Array.isArray(obj["branches"])) {
    for (const branch of obj["branches"]) {
      validateBranchDSL(branch);
    }
  }
}

/**
 * Validates a branch in DSL format
 */
function validateBranchDSL(branch: unknown): asserts branch is WorkflowBranchDSL {
  if (!branch || typeof branch !== "object") {
    throw new Error("Invalid branch: must be an object");
  }

  const obj = branch as Record<string, unknown>;

  if (!["IF_TRUE", "IF_FALSE", "SWITCH_CASE", "DEFAULT"].includes(obj["type"] as string)) {
    throw new Error(`Invalid branch type: ${obj["type"]}`);
  }

  if (!Array.isArray(obj["steps"])) {
    throw new Error("Invalid branch: steps must be an array");
  }

  for (const step of obj["steps"]) {
    validateStepDSL(step);
  }
}

/**
 * Converts DSL to workflow version data
 */
export function dslToWorkflowVersion(dsl: WorkflowDSL): {
  name: string;
  description?: string;
  steps: WorkflowStepData[];
} {
  let sequenceCounter = 0;

  function convertStep(
    stepDSL: WorkflowStepDSL,
    parentStepId: string | null,
    branchType: BranchType | null,
    branchCondition: string | null,
  ): WorkflowStepData[] {
    const step: WorkflowStepData = {
      id: stepDSL.id,
      name: stepDSL.name,
      type: stepDSL.type as WorkflowStepType,
      sequence: sequenceCounter++,
      config: stepDSL.config ?? {},
      dependencies: stepDSL.dependsOn,
      parentStepId,
      branchType,
      branchCondition,
    };

    const result: WorkflowStepData[] = [step];

    // Process branches
    if (stepDSL.branches) {
      for (const branch of stepDSL.branches) {
        for (const childStepDSL of branch.steps) {
          const childSteps = convertStep(
            childStepDSL,
            stepDSL.id,
            branch.type,
            branch.condition ?? null,
          );
          result.push(...childSteps);
        }
      }
    }

    return result;
  }

  const allSteps: WorkflowStepData[] = [];
  for (const stepDSL of dsl.steps) {
    const steps = convertStep(stepDSL, null, null, null);
    allSteps.push(...steps);
  }

  return {
    name: dsl.name,
    description: dsl.description,
    steps: allSteps,
  };
}

/**
 * Exports workflow to JSON DSL
 */
export function exportToJSON(
  name: string,
  description: string | undefined | null,
  steps: WorkflowStepData[],
): string {
  const dsl = workflowToDSL(name, description, steps);
  return JSON.stringify(dsl, null, 2);
}

/**
 * Exports workflow to YAML DSL
 */
export function exportToYAML(
  name: string,
  description: string | undefined | null,
  steps: WorkflowStepData[],
): string {
  const dsl = workflowToDSL(name, description, steps);
  return stringifyYAML(dsl);
}

/**
 * Generates a unique ID for new steps
 */
function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Auto-detect and parse DSL from string
 */
export function parseWorkflowDSL(content: string): WorkflowDSL {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith("{")) {
    return parseDSLFromJSON(trimmed);
  }

  // Try YAML
  return parseDSLFromYAML(trimmed);
}
