import type { BranchType, WorkflowStepType } from "@prisma/client";
import type { Edge, Node } from "reactflow";

export interface WorkflowNodeData {
  label: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  sequence?: number;
  isValid?: boolean;

  // For branching (Condition nodes have outputs, but child nodes have branchType)
  // Actually, the node itself (if it's a child of a condition) might need to know its branch type.
  branchType?: BranchType | null;
  branchCondition?: string | null;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;
