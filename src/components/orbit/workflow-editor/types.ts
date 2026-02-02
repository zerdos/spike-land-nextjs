import { Node, Edge } from "reactflow";
import { WorkflowActionType } from "@/lib/workflows/actions/action-types";

export type WorkflowNodeType = "trigger" | "action" | "condition" | "group";

export interface WorkflowNodeData {
  label: string;
  type: WorkflowNodeType;
  actionType?: WorkflowActionType;
  config?: Record<string, any>;
  [key: string]: any;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export interface NodePaletteItem {
  type: WorkflowNodeType;
  actionType?: WorkflowActionType;
  label: string;
  icon?: React.ReactNode;
}
