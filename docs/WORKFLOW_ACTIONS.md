# Workflow Actions Reference

This document provides comprehensive documentation for all available workflow actions in the Spike Land workflow system.

## Table of Contents

- [Overview](#overview)
- [Action Categories](#action-categories)
- [Social Media Actions](#social-media-actions)
- [Notification Actions](#notification-actions)
- [AI Actions](#ai-actions)
- [Data Actions](#data-actions)
- [Control Flow Actions](#control-flow-actions)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)

## Overview

Workflow actions are the building blocks of automated workflows. Each action performs a specific operation, such as posting to social media, sending notifications, or processing data with AI.

### Action Structure

Every action has:

- **Type**: Unique identifier for the action
- **Name**: Human-readable display name
- **Description**: What the action does
- **Category**: Grouping (social, notification, ai, data, control)
- **Configuration Schema**: JSON schema defining required and optional parameters
- **Permissions**: Required permissions to execute the action

### Using Actions in Workflows

Actions are added to workflows as steps. Each step has:

```typescript
{
  name: "Step name",
  type: "ACTION",
  sequence: 0,
  config: {
    actionType: "POST_TO_SOCIAL",
    // Action-specific configuration
  }
}
```

## Action Categories

### Social Media Actions

Actions for interacting with social media platforms.

### Notification Actions

Actions for sending notifications to users via email, Slack, or in-app.

### AI Actions

Actions that leverage AI capabilities for content generation, analysis, and moderation.

### Data Actions

Actions for data manipulation, logging, and external integrations.

### Control Flow Actions

Actions that control workflow execution timing and branching.

---

## Social Media Actions

### POST_TO_SOCIAL

Creates and publishes a post to a social media platform.

**Category**: `social`

**Required Permissions**: `social:write`

**Configuration Schema**:

```json
{
  "type": "object",
  "required": ["platform", "accountId", "content"],
  "properties": {
    "platform": {
      "type": "string",
      "enum": ["twitter", "facebook", "instagram", "linkedin"]
    },
    "accountId": { "type": "string" },
    "content": { "type": "string", "maxLength": 5000 },
    "mediaUrls": {
      "type": "array",
      "items": { "type": "string", "format": "uri" }
    }
  }
}
```

**Example**:

```json
{
  "actionType": "POST_TO_SOCIAL",
  "platform": "twitter",
  "accountId": "account_123",
  "content": "🚀 Just launched our new feature!",
  "mediaUrls": ["https://example.com/launch-image.jpg"]
}
```

**Variables Supported**:

- `${context.timestamp}`: Current timestamp
- `${workflow.name}`: Workflow name
- `${previousStep.output}`: Output from previous step

### SCHEDULE_POST

Schedules a post for future publication (planned, not yet implemented).

### REPLY_TO_COMMENT

Automatically replies to comments on social media (planned, not yet implemented).

---

## Notification Actions

### SEND_EMAIL

Sends an email notification to one or more recipients.

**Category**: `notification`

**Required Permissions**: `email:send`

**Configuration Schema**:

```json
{
  "type": "object",
  "required": ["to", "subject", "body"],
  "properties": {
    "to": {
      "oneOf": [
        { "type": "string", "format": "email" },
        { "type": "array", "items": { "type": "string", "format": "email" } }
      ]
    },
    "subject": { "type": "string", "maxLength": 200 },
    "body": { "type": "string" },
    "templateId": { "type": "string" }
  }
}
```

**Example**:

```json
{
  "actionType": "SEND_EMAIL",
  "to": ["user@example.com", "admin@example.com"],
  "subject": "Workflow Alert: High Engagement Detected",
  "body": "Your recent post has exceeded 1000 likes. Great job!",
  "templateId": "engagement-alert"
}
```

**Template Variables**:

If using `templateId`, you can pass template variables in the `body` as JSON:

```json
{
  "actionType": "SEND_EMAIL",
  "to": "user@example.com",
  "subject": "Workflow Notification",
  "templateId": "workflow-complete",
  "body": "{\"workflowName\": \"${workflow.name}\", \"completedAt\": \"${context.timestamp}\"}"
}
```

### SEND_SLACK_MESSAGE

Sends a message to a Slack channel (planned, not yet implemented).

### CREATE_NOTIFICATION

Creates an in-app notification (planned, not yet implemented).

---

## AI Actions

### GENERATE_CONTENT

Generates content using AI based on a prompt.

**Category**: `ai`

**Required Permissions**: `ai:generate`

**Configuration Schema**:

```json
{
  "type": "object",
  "required": ["prompt"],
  "properties": {
    "prompt": { "type": "string" },
    "maxTokens": { "type": "number", "minimum": 1, "maximum": 4000 },
    "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
    "outputVariable": {
      "type": "string",
      "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
    }
  }
}
```

**Example**:

```json
{
  "actionType": "GENERATE_CONTENT",
  "prompt": "Write a professional tweet announcing our Q4 results. Revenue grew 50% year-over-year.",
  "maxTokens": 100,
  "temperature": 0.7,
  "outputVariable": "generatedTweet"
}
```

**Using Output Variables**:

The `outputVariable` stores the generated content, which can be referenced in subsequent steps:

```json
{
  "actionType": "POST_TO_SOCIAL",
  "platform": "twitter",
  "accountId": "account_123",
  "content": "${generatedTweet}"
}
```

### ANALYZE_SENTIMENT

Analyzes sentiment of text content (planned, not yet implemented).

### MODERATE_CONTENT

Automatically moderates content for policy violations (planned, not yet implemented).

---

## Data Actions

### TRIGGER_WEBHOOK

Sends an HTTP request to an external webhook.

**Category**: `data`

**Required Permissions**: `webhook:trigger`

**Configuration Schema**:

```json
{
  "type": "object",
  "required": ["url", "method"],
  "properties": {
    "url": { "type": "string", "format": "uri" },
    "method": {
      "type": "string",
      "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]
    },
    "headers": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "body": { "type": "object" }
  }
}
```

**Example**:

```json
{
  "actionType": "TRIGGER_WEBHOOK",
  "url": "https://api.example.com/events",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${secrets.apiKey}"
  },
  "body": {
    "event": "workflow_completed",
    "workflowId": "${workflow.id}",
    "timestamp": "${context.timestamp}",
    "metadata": {
      "triggerType": "${context.triggerType}"
    }
  }
}
```

**Security Note**: Use `${secrets.variableName}` to reference secrets stored in your workspace. Never hardcode sensitive values.

### UPDATE_DATABASE

Updates a database record (planned, not yet implemented).

### LOG_EVENT

Logs an event for analytics (planned, not yet implemented).

---

## Control Flow Actions

### DELAY

Pauses workflow execution for a specified duration or until a specific time.

**Category**: `control`

**Required Permissions**: None

**Configuration Schema**:

```json
{
  "type": "object",
  "oneOf": [{ "required": ["duration"] }, { "required": ["until"] }],
  "properties": {
    "duration": {
      "type": "number",
      "minimum": 0,
      "description": "Delay duration in milliseconds"
    },
    "until": {
      "type": "string",
      "format": "date-time",
      "description": "Delay until specific time"
    }
  }
}
```

**Example (Duration)**:

```json
{
  "actionType": "DELAY",
  "duration": 300000
}
```

This delays execution for 5 minutes (300,000 milliseconds).

**Example (Until Specific Time)**:

```json
{
  "actionType": "DELAY",
  "until": "2024-12-31T23:59:59Z"
}
```

**Use Cases**:

- Rate limiting between API calls
- Scheduling posts at optimal times
- Adding cooldown periods between notifications

### CONDITIONAL_BRANCH

Creates a conditional branch in the workflow (planned, not yet implemented).

### LOOP

Repeats a set of actions (planned, not yet implemented).

---

## Best Practices

### 1. Use Variables for Dynamic Content

Always use variables for dynamic values rather than hardcoding:

```json
// ✅ Good
{
  "content": "Posted by ${user.name} at ${context.timestamp}"
}

// ❌ Bad
{
  "content": "Posted by John Doe at 2024-01-29"
}
```

### 2. Store Secrets Securely

Never hardcode API keys, passwords, or tokens. Use the secrets management system:

```json
// ✅ Good
{
  "headers": {
    "Authorization": "Bearer ${secrets.apiToken}"
  }
}

// ❌ Bad
{
  "headers": {
    "Authorization": "Bearer sk-abc123xyz"
  }
}
```

### 3. Handle Errors Gracefully

Configure error handling for critical actions:

```json
{
  "actionType": "SEND_EMAIL",
  "to": "user@example.com",
  "subject": "Important Alert",
  "body": "...",
  "errorHandling": {
    "retryCount": 3,
    "retryDelay": 5000,
    "onFailure": "continue"
  }
}
```

### 4. Validate Inputs

Use step dependencies and conditions to validate inputs before executing actions:

```json
{
  "steps": [
    {
      "name": "Validate User",
      "type": "CONDITION",
      "config": {
        "condition": "${user.verified} === true"
      }
    },
    {
      "name": "Send Welcome Email",
      "type": "ACTION",
      "dependencies": ["validate-user"],
      "config": {
        "actionType": "SEND_EMAIL"
      }
    }
  ]
}
```

### 5. Use Descriptive Names

Name your steps clearly to make workflows self-documenting:

```json
// ✅ Good
{
  "name": "Send New Follower Welcome Email",
  "type": "ACTION",
  "config": { ... }
}

// ❌ Bad
{
  "name": "Step 1",
  "type": "ACTION",
  "config": { ... }
}
```

### 6. Keep Actions Focused

Each action should do one thing well. Avoid complex multi-step logic in a single action.

### 7. Test with Example Data

Always test workflows with realistic example data before publishing.

---

## Security Considerations

### Authentication & Authorization

- All actions require proper workspace permissions
- API tokens are scoped to specific capabilities
- User actions are logged for audit trails

### Data Privacy

- Sensitive data should be encrypted at rest
- PII should be handled according to GDPR/CCPA requirements
- Webhook payloads are validated for size and structure

### Rate Limiting

Actions are subject to rate limits:

- **Email**: 100 per hour per workspace
- **Social Posts**: 50 per hour per account
- **Webhooks**: 1000 per hour per workspace
- **AI Generation**: 500 requests per day per workspace

### Webhook Security

When using `TRIGGER_WEBHOOK`:

- Always use HTTPS URLs
- Implement signature verification on the receiving end
- Use IP allowlisting when possible
- Rotate webhook secrets regularly

### Content Moderation

AI-generated content should be reviewed before publishing to public channels:

```json
{
  "steps": [
    {
      "name": "Generate Content",
      "type": "ACTION",
      "config": {
        "actionType": "GENERATE_CONTENT",
        "outputVariable": "draft"
      }
    },
    {
      "name": "Moderate Content",
      "type": "ACTION",
      "config": {
        "actionType": "MODERATE_CONTENT",
        "input": "${draft}"
      }
    },
    {
      "name": "Post if Approved",
      "type": "ACTION",
      "dependencies": ["moderate-content"],
      "config": {
        "actionType": "POST_TO_SOCIAL",
        "content": "${draft}"
      }
    }
  ]
}
```

---

## Related Documentation

- [Workflow Data Model](./DATABASE_SCHEMA.md#workflows) - Database schema for workflows
- [Workflow DSL](../src/lib/workflows/workflow-dsl.ts) - Import/export format specification
- [Workflow Executor](../src/lib/workflows/workflow-executor.ts) - Execution engine details
- [API Reference](./API_REFERENCE.md) - Workflow API endpoints

---

## Support

For questions or issues with workflow actions:

1. Check the [API Reference](./API_REFERENCE.md)
2. Review example workflows in `examples/workflows/`
3. Contact support at support@spike.land
