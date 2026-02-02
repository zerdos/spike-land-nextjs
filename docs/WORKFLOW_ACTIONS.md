# Workflow Actions

This document describes the available actions in the Orbit workflow system.

## Action Categories

Actions are grouped into the following categories:

- **Social**: Interact with social media platforms
- **Notification**: Send alerts and messages
- **AI**: Generate content and analyze data
- **Data**: Manipulate data and trigger webhooks
- **Control**: Control flow logic (delays, branches)

## Available Actions

### Social

#### Post to Social Media (`POST_TO_SOCIAL`)
Publish content to a connected social media account.

**Configuration:**
- `platform`: Social platform (TWITTER, LINKEDIN, etc.)
- `accountId`: The ID of the connected account
- `content`: The text content of the post
- `mediaUrls`: Optional array of image/video URLs

### Notification

#### Send Email (`SEND_EMAIL`)
Send an email to one or more recipients.

**Configuration:**
- `to`: Recipient email(s)
- `subject`: Email subject
- `body`: Email body text
- `templateId`: Optional template ID

### AI

#### Generate Content (`GENERATE_CONTENT`)
Generate text content using AI.

**Configuration:**
- `prompt`: The prompt for the AI
- `maxTokens`: Maximum length of generated content
- `temperature`: Creativity level (0.0 - 1.0)
- `outputVariable`: Variable name to store the result

### Data

#### Trigger Webhook (`TRIGGER_WEBHOOK`)
Make an HTTP request to an external URL.

**Configuration:**
- `url`: Target URL
- `method`: HTTP method (GET, POST, PUT, PATCH, DELETE)
- `headers`: HTTP headers
- `body`: Request body

### Control

#### Delay (`DELAY`)
Pause execution for a specified duration.

**Configuration:**
- `duration`: Time to wait in milliseconds
- `until`: Specific date/time to wait until

## Adding New Actions

To add a new action:

1. Add the action type to `WorkflowActionType` in `src/types/workflow.ts`
2. Define the configuration interface in `src/types/workflow.ts`
3. Create a new action definition file in `src/lib/workflows/actions/`
4. Register the action in the appropriate category file (or `index.ts`)
