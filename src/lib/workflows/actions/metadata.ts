import type { WorkflowActionType } from "./action-types";

export type ActionCategory = "trigger" | "action" | "logic";

export interface ActionField {
  name: string;
  type: "string" | "number" | "boolean" | "select" | "json" | "code";
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface ActionMetadata {
  type: WorkflowActionType | string; // string to support triggers like 'schedule'
  label: string;
  description: string;
  category: ActionCategory;
  icon: string;
  fields: ActionField[];
}

export const ACTION_REGISTRY: ActionMetadata[] = [
  // Logic
  {
    type: "conditional",
    label: "Condition",
    description: "Branch based on a condition",
    category: "logic",
    icon: "GitFork",
    fields: [
      {
        name: "leftOperand",
        label: "Left Operand",
        type: "string",
        required: true,
        description: "Value to compare (supports {{interpolation}})",
      },
      {
        name: "operator",
        label: "Operator",
        type: "select",
        required: true,
        options: [
          { label: "Equals", value: "equals" },
          { label: "Not Equals", value: "not_equals" },
          { label: "Greater Than", value: "greater_than" },
          { label: "Less Than", value: "less_than" },
          { label: "Contains", value: "contains" },
          { label: "Is Empty", value: "is_empty" },
        ],
      },
      {
        name: "rightOperand",
        label: "Right Operand",
        type: "string",
        required: false,
        description: "Value to compare against",
      },
    ],
  },
  {
    type: "delay",
    label: "Delay",
    description: "Wait for a specified duration",
    category: "logic",
    icon: "Clock",
    fields: [
      {
        name: "durationMs",
        label: "Duration (ms)",
        type: "number",
        required: true,
        placeholder: "1000",
      },
    ],
  },
  {
    type: "loop",
    label: "Loop",
    description: "Iterate over a list of items",
    category: "logic",
    icon: "Repeat",
    fields: [
      {
        name: "items",
        label: "Items",
        type: "json",
        required: true,
        description: "Array of items to iterate over",
      },
    ],
  },

  // Actions
  {
    type: "send_notification",
    label: "Send Notification",
    description: "Send an email, Slack message, or webhook",
    category: "action",
    icon: "Bell",
    fields: [
      {
        name: "channel",
        label: "Channel",
        type: "select",
        required: true,
        options: [
          { label: "Email", value: "email" },
          { label: "Slack", value: "slack" },
          { label: "Webhook", value: "webhook" },
        ],
      },
      {
        name: "recipient",
        label: "Recipient",
        type: "string",
        required: true,
        description: "Email address or Slack channel ID",
      },
      {
        name: "message",
        label: "Message",
        type: "string", // textarea?
        required: true,
      },
      {
        name: "subject",
        label: "Subject",
        type: "string",
        required: false,
        description: "Email subject (optional)",
      },
      {
        name: "webhookUrl",
        label: "Webhook URL",
        type: "string",
        required: false,
        description: "Required if channel is webhook",
      },
    ],
  },
  {
    type: "http_request",
    label: "HTTP Request",
    description: "Make an external API call",
    category: "action",
    icon: "Globe",
    fields: [
      {
        name: "url",
        label: "URL",
        type: "string",
        required: true,
      },
      {
        name: "method",
        label: "Method",
        type: "select",
        required: true,
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
        ],
      },
      {
        name: "headers",
        label: "Headers",
        type: "json",
        required: false,
      },
      {
        name: "body",
        label: "Body",
        type: "json",
        required: false,
      },
    ],
  },
  {
    type: "call_ai_agent",
    label: "Call AI Agent",
    description: "Invoke an AI agent with a prompt",
    category: "action",
    icon: "Bot",
    fields: [
      {
        name: "agentId",
        label: "Agent ID",
        type: "string",
        required: true,
      },
      {
        name: "prompt",
        label: "Prompt",
        type: "string",
        required: true,
      },
      {
        name: "context",
        label: "Context",
        type: "json",
        required: false,
      },
    ],
  },
  {
    type: "update_record",
    label: "Update Record",
    description: "Update a database record",
    category: "action",
    icon: "Database",
    fields: [
      {
        name: "model",
        label: "Model",
        type: "string",
        required: true,
      },
      {
        name: "recordId",
        label: "Record ID",
        type: "string",
        required: true,
      },
      {
        name: "data",
        label: "Data",
        type: "json",
        required: true,
      },
    ],
  },
  {
    type: "post_to_platform",
    label: "Post to Platform",
    description: "Post content to a social platform",
    category: "action",
    icon: "Share2",
    fields: [
      {
        name: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: [
          { label: "Twitter", value: "twitter" },
          { label: "LinkedIn", value: "linkedin" },
        ],
      },
      {
        name: "content",
        label: "Content",
        type: "string",
        required: true,
      },
    ],
  },
  {
    type: "transform_data",
    label: "Transform Data",
    description: "Transform JSON data using a template",
    category: "action",
    icon: "FileJson",
    fields: [
      {
        name: "source",
        label: "Source Data",
        type: "json",
        required: true,
      },
      {
        name: "template",
        label: "Template",
        type: "json",
        required: true,
      },
    ],
  },
  {
    type: "parallel_execution",
    label: "Parallel Group",
    description: "Execute actions in parallel",
    category: "logic",
    icon: "Layers",
    fields: [
      {
        name: "actions",
        label: "Actions",
        type: "json",
        required: true,
        description: "List of actions to execute",
      },
    ],
  },
];

export const TRIGGER_REGISTRY: ActionMetadata[] = [
  {
    type: "schedule",
    label: "Schedule",
    description: "Trigger workflow on a schedule",
    category: "trigger",
    icon: "Calendar",
    fields: [
      {
        name: "cron",
        label: "Cron Expression",
        type: "string",
        required: true,
        placeholder: "0 0 * * *",
      },
    ],
  },
  {
    type: "webhook",
    label: "Webhook",
    description: "Trigger via HTTP POST",
    category: "trigger",
    icon: "Webhook",
    fields: [],
  },
  {
    type: "event",
    label: "Event",
    description: "Trigger on system event",
    category: "trigger",
    icon: "Zap",
    fields: [
      {
        name: "eventType",
        label: "Event Type",
        type: "string",
        required: true,
      },
      {
        name: "filter",
        label: "Filter",
        type: "json",
        required: false,
      },
    ],
  },
];
