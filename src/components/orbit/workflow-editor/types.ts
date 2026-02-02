import type { Node, Edge } from "reactflow";

export type WorkflowNodeType = "trigger" | "action" | "condition" | "group";

export interface WorkflowNodeData {
  label: string;
  description?: string;
  type: WorkflowNodeType;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;
