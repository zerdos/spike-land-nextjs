import { Zap, Globe, RefreshCw, Layers, FileJson } from "lucide-react";
import { WorkflowActionType } from "./action-types";

export interface ActionMetadata {
  type: WorkflowActionType;
  label: string;
  description: string;
  icon: any;
  category: "Communication" | "Data" | "Logic" | "Integration" | "AI";
}

export const ACTION_METADATA: Record<WorkflowActionType, ActionMetadata> = {
  send_notification: {
    type: "send_notification",
    label: "Send Notification",
    description: "Send an email or Slack message",
    icon: Zap,
    category: "Communication",
  },
  http_request: {
    type: "http_request",
    label: "HTTP Request",
    description: "Make an external API call",
    icon: Globe,
    category: "Integration",
  },
  call_ai_agent: {
    type: "call_ai_agent",
    label: "Call AI Agent",
    description: "Trigger an AI agent",
    icon: Zap, // Using Zap for now, could be Brain
    category: "AI",
  },
  update_record: {
    type: "update_record",
    label: "Update Record",
    description: "Update a database record",
    icon: FileJson,
    category: "Data",
  },
  post_to_platform: {
    type: "post_to_platform",
    label: "Post to Platform",
    description: "Post content to a social platform",
    icon: Globe,
    category: "Integration",
  },
  transform_data: {
    type: "transform_data",
    label: "Transform Data",
    description: "Map or filter data",
    icon: FileJson,
    category: "Data",
  },
  loop: {
    type: "loop",
    label: "Loop",
    description: "Iterate over a list",
    icon: RefreshCw,
    category: "Logic",
  },
  parallel_execution: {
    type: "parallel_execution",
    label: "Parallel Execution",
    description: "Run actions in parallel",
    icon: Layers,
    category: "Logic",
  },
  conditional: {
    type: "conditional",
    label: "Conditional",
    description: "Branch based on condition",
    icon: Layers,
    category: "Logic",
  },
};
