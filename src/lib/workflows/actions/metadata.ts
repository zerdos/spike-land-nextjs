import type { WorkflowActionType } from "./action-types";

export interface ActionMetadata {
  type: WorkflowActionType;
  label: string;
  description: string;
  category: "communication" | "data" | "logic" | "ai" | "utility";
  iconName: string; // We'll map this to Lucide icons in the UI
}

export const actionMetadata: Record<WorkflowActionType, ActionMetadata> = {
  send_notification: {
    type: "send_notification",
    label: "Send Notification",
    description: "Send an email or Slack message",
    category: "communication",
    iconName: "Send",
  },
  update_record: {
    type: "update_record",
    label: "Update Record",
    description: "Update a record in the database",
    category: "data",
    iconName: "Database",
  },
  call_ai_agent: {
    type: "call_ai_agent",
    label: "Call AI Agent",
    description: "Invoke an AI agent with a prompt",
    category: "ai",
    iconName: "Bot",
  },
  post_to_platform: {
    type: "post_to_platform",
    label: "Post to Platform",
    description: "Post content to a social platform",
    category: "communication",
    iconName: "Share2",
  },
  conditional: {
    type: "conditional",
    label: "Condition",
    description: "Branch logic based on values",
    category: "logic",
    iconName: "GitFork",
  },
  http_request: {
    type: "http_request",
    label: "HTTP Request",
    description: "Make an external API call",
    category: "utility",
    iconName: "Globe",
  },
  transform_data: {
    type: "transform_data",
    label: "Transform Data",
    description: "Map, filter, or transform JSON data",
    category: "data",
    iconName: "FileJson",
  },
  parallel_execution: {
    type: "parallel_execution",
    label: "Parallel Execution",
    description: "Run multiple actions at the same time",
    category: "logic",
    iconName: "Layers",
  },
  loop: {
    type: "loop",
    label: "Loop",
    description: "Iterate over a list of items",
    category: "logic",
    iconName: "Repeat",
  },
};
