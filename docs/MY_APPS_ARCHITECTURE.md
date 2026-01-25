# My-Apps Architecture

This document provides comprehensive developer documentation for the `/my-apps`
feature in spike.land.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Next.js Application (spike.land)](#nextjs-application-spikeland)
- [testing.spike.land (Cloudflare Worker)](#testingspikeland-cloudflare-worker)
- [MCP Integration](#mcp-integration)
- [Data Flow](#data-flow)
- [Local Development](#local-development)
- [Production Architecture](#production-architecture)
- [Key Files Reference](#key-files-reference)

---

## Overview

**My-Apps** (`/my-apps`) is a dashboard where users can create, manage, and
interact with AI-powered React applications. It provides:

- **App Creation**: Users describe what they want to build, and an AI agent
  writes the code
- **Live Preview**: Real-time iframe preview of running React applications
- **Chat Interface**: Conversational UI to iterate on the app with AI assistance
- **Persistent Storage**: Apps are saved and can be resumed anytime

### Three-Tier Architecture

The feature spans three interconnected systems:

| System                 | Purpose                                                | URL                               |
| ---------------------- | ------------------------------------------------------ | --------------------------------- |
| **spike.land**         | Next.js app - User dashboard, authentication, database | `https://spike.land`              |
| **testing.spike.land** | Cloudflare Worker - Live codespace hosting             | `https://testing.spike.land`      |
| **MCP Server**         | Model Context Protocol - AI agent tools                | npm: `@spike-npm-land/mcp-server` |

---

## Conceptual Model: MCP Interface

### Key Insight: Same Tools, Different Interfaces

My-Apps and Claude Desktop are **two interfaces to the same MCP layer**. This
architectural choice means:

- Features built for My-Apps are automatically available to Claude users
- AI agents in Claude Code have the same capabilities as the My-Apps chat
- Users can switch between interfaces without losing functionality

```
+------------------+     +------------------+
|    My-Apps UI    |     | Claude Desktop   |
|  (Web Interface) |     |  (Native App)    |
+--------+---------+     +--------+---------+
         |                        |
         |  Chat with AI          |  Natural language
         |                        |
         v                        v
+--------------------------------------------------+
|            MCP Server Layer                       |
|                                                   |
|  +-------------+  +-------------+  +------------+|
|  | codespace_  |  | generate_   |  | apply_     ||
|  | update      |  | image       |  | brand_style||
|  +-------------+  +-------------+  +------------+|
|                                                   |
+--------------------------------------------------+
         |
         v
+--------------------------------------------------+
|            Backend Services                       |
|  - testing.spike.land (codespaces)               |
|  - spike.land/api (image gen, brand brain)       |
+--------------------------------------------------+
```

### What My-Apps Adds

While Claude Desktop gives raw access to MCP tools, My-Apps provides:

| Feature             | My-Apps | Claude Desktop |
| ------------------- | ------- | -------------- |
| Live app preview    | ✅      | ❌             |
| App version history | ✅      | ❌             |
| App organization    | ✅      | ❌             |
| Shareable app links | ✅      | ❌             |
| Raw MCP tool access | ✅      | ✅             |

---

## Architecture

```
                           +------------------+
                           |   User Browser   |
                           +--------+---------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                        spike.land (Next.js on Vercel)                 |
|                                                                       |
|  +------------------+    +------------------+    +------------------+ |
|  |    /my-apps      |    |  /my-apps/[id]   |    |  /api/apps/*     | |
|  |  (App Listing)   |    | (Chat+Preview)   |    |  (REST API)      | |
|  +--------+---------+    +--------+---------+    +--------+---------+ |
|           |                       |                       |           |
|           +-----------+-----------+-----------+-----------+           |
|                       |                       |                       |
|                       v                       v                       |
|  +--------------------+-----+   +------------+------------------------+
|  |   PostgreSQL (Prisma)    |   |  Claude Agent SDK                  |
|  |   - App table            |   |  - MCP Server integration          |
|  |   - AppMessage table     |   |  - Streaming responses             |
|  |   - AppStatusHistory     |   +------------+-----------------------+
|  +--------------------+-----+                |
+-----------------------------------------------------------------------+
                        |                      |
                        | codespaceUrl         | REST API calls
                        | (iframe embed)       | (read/update code)
                        v                      v
+-----------------------------------------------------------------------+
|               testing.spike.land (Cloudflare Worker)                  |
|                                                                       |
|  +------------------+    +------------------+    +------------------+ |
|  | /live/{id}/      |    | /live/{id}/api/* |    |      /mcp        | |
|  | (HTML renderer)  |    | (Code CRUD)      |    | (MCP Protocol)   | |
|  +--------+---------+    +--------+---------+    +--------+---------+ |
|           |                       |                       |           |
|           +-----------+-----------+-----------+-----------+           |
|                                   |                                   |
|                                   v                                   |
|                  +----------------+----------------+                   |
|                  |    Durable Object (Code class) |                   |
|                  |    - Session state per codespace|                  |
|                  |    - WebSocket broadcasts       |                  |
|                  |    - MCP tool execution         |                  |
|                  +----------------+----------------+                   |
|                                   |                                   |
+-----------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
              +----------+   +----------+   +-------------+
              |    KV    |   |    R2    |   | js.spike.land|
              | (Cache)  |   | (Storage)|   | (Transpiler) |
              +----------+   +----------+   +-------------+
```

---

## Next.js Application (spike.land)

### Pages

#### `/my-apps/page.tsx` - App Listing (Server Component)

The main dashboard showing all user's apps.

**Location**: `src/app/my-apps/page.tsx`

**Features**:

- Server-side data fetching from Prisma
- Authentication check (redirects to `/auth/signin` if not logged in)
- Filters out `ARCHIVED` apps and apps without messages (drafts)
- Displays apps as 3D cards with live iframe previews

**Data fetched**:

```typescript
const apps = await prisma.app.findMany({
  where: {
    userId: session.user.id,
    status: { notIn: ["ARCHIVED"] },
    messages: { some: {} },
  },
  select: {
    id,
    name,
    slug,
    description,
    status,
    codespaceId,
    codespaceUrl,
    isCurated,
    isPublic,
    _count: { messages, images },
  },
  orderBy: { updatedAt: "desc" },
});
```

#### `/my-apps/[id]/page.tsx` - App Workspace (Client Component)

The main workspace for interacting with an app.

**Location**: `src/app/my-apps/[id]/page.tsx`

**Layout**:

```
+---------------------------+---------------------------+
|                           |                           |
|      Chat Panel (50%)     |    Preview Panel (50%)    |
|                           |                           |
|  +---------------------+  |  +---------------------+  |
|  |  Message History    |  |  |  Browser Toolbar    |  |
|  |  - USER messages    |  |  |  [o][o][o] URL  [R] |  |
|  |  - AGENT responses  |  |  +---------------------+  |
|  |  - Streaming caret  |  |  |                     |  |
|  +---------------------+  |  |   iframe preview    |  |
|                           |  |   (scale: 0.5)      |  |
|  +---------------------+  |  |                     |  |
|  |  Image Upload       |  |  |  testing.spike.land |  |
|  +---------------------+  |  |  /live/{codespaceId}|  |
|  |  Text Input  [Send] |  |  |                     |  |
|  +---------------------+  |  +---------------------+  |
|                           |                           |
+---------------------------+---------------------------+
```

**Real-time Communication**:

- Uses SSE (Server-Sent Events) via `/api/apps/[id]/messages/stream`
- Events: `message`, `status`, `agent_working`, `code_updated`
- Auto-refreshes iframe when code is updated

#### `/my-apps/new/page.tsx` - New App Entry

Generates a random codespace ID and redirects to the draft workspace.

**Codespace ID Format**: `{adjective}.{noun}.{verb}.{suffix}`

- Example: `swift.spark.launch.a1b2`

#### `/my-apps/new/[tempId]/page.tsx` - Draft Workspace

Pre-creation workspace where users enter their initial prompt.

**Flow**:

1. Preview iframe points to `https://testing.spike.land/live/{tempId}/`
2. User enters initial prompt and submits
3. `POST /api/apps` creates the app with the codespaceId
4. Redirects to `/my-apps/[newAppId]`

### API Routes

#### `POST /api/apps` - Create App

**Location**: `src/app/api/apps/route.ts`

**Two modes**:

1. **Prompt-based** (new flow):

```typescript
{
  prompt: string,       // User's description
  codespaceId?: string, // Pre-allocated codespace ID
  imageIds?: string[]   // Optional attached images
}
```

Creates app with `status: WAITING`, creates first USER message.

2. **Legacy** (form-based):

```typescript
{
  name: string,
  description: string,
  requirements: string,
  monetizationModel: string,
  codespaceId?: string
}
```

Creates app with `status: PROMPTING`.

#### `POST /api/apps/[id]/agent/chat` - AI Interaction

**Location**: `src/app/api/apps/[id]/agent/chat/route.ts`

**Request**:

```typescript
{ content: string, imageIds?: string[] }
```

**Process**:

1. Creates USER message in database
2. Fetches current code from testing.spike.land
3. Initializes Claude Agent SDK with MCP server
4. Streams response chunks via SSE format
5. Saves AGENT message to database
6. Broadcasts `code_updated` event if code changed

#### `GET /api/apps/[id]/messages/stream` - Real-time Updates

**Location**: `src/app/api/apps/[id]/messages/stream/route.ts`

**Event types**:

```typescript
"connected"; // Initial connection
"message"; // New message
"status"; // App status change
"agent_working"; // Agent working indicator
"code_updated"; // Code modified (triggers iframe refresh)
"heartbeat"; // 30-second keep-alive
```

**Note**: Current implementation uses in-memory connections. Does not scale
across multiple Vercel instances. TODO: Implement Redis Pub/Sub.

### Components

#### `AppCard3D` - 3D Preview Card

**Location**: `src/components/my-apps/AppCard3D.tsx`

**Features**:

- 3D perspective rotation on mouse move
- Live iframe preview (400% size scaled to 25%)
- Lazy loading with skeleton
- Gradient overlay and shine effects

**Preview iframe**:

```tsx
<iframe
  src={app.codespaceUrl} // https://testing.spike.land/live/{id}/
  className="h-[400%] w-[400%]"
  style={{ transform: "scale(0.25)", transformOrigin: "0 0" }}
  sandbox="allow-scripts allow-same-origin"
/>;
```

### Database Schema

**Location**: `prisma/schema.prisma`

```prisma
model App {
  id            String   @id @default(cuid())
  name          String
  slug          String?  @unique
  description   String?
  userId        String

  // Codespace linking
  codespaceId   String?  @unique
  codespaceUrl  String?

  status        AppBuildStatus @default(PROMPTING)
  // PROMPTING | WAITING | DRAFTING | BUILDING | TEST | FINE_TUNING | LIVE | ARCHIVED | FAILED

  messages        AppMessage[]
  statusHistory   AppStatusHistory[]
  images          AppImage[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AppMessage {
  id        String         @id @default(cuid())
  appId     String
  role      AppMessageRole // USER | AGENT | SYSTEM
  content   String
  isRead    Boolean        @default(false)

  attachments AppAttachment[]

  createdAt DateTime @default(now())
}
```

---

## testing.spike.land (Cloudflare Worker)

### What It Is

**testing.spike.land** is a Cloudflare Worker that hosts live React
applications. Each "codespace" is an isolated environment where React code runs
in real-time.

**Key Technologies**:

- **Cloudflare Workers**: Serverless execution at the edge
- **Durable Objects**: Persistent state per codespace
- **KV**: Asset caching
- **R2**: Code history and storage
- **WebSockets**: Real-time sync between clients

### URL Structure

```
https://testing.spike.land/live/{codespaceId}/
├── (root)              GET   → Renders HTML with embedded React app
├── /api/code           GET   → Returns current code
├── /api/code           PUT   → Updates code, optional transpile
├── /api/run            POST  → Triggers transpilation
├── /api/screenshot     GET   → Captures JPEG screenshot
├── /api/session        GET   → Returns full session data
├── /index.tsx          GET   → Source code
├── /index.js           GET   → Transpiled JavaScript
├── /index.css          GET   → Styles
├── /session.json       GET   → Session metadata
├── /messages           GET/POST → AI message handling (legacy)
└── /mcp                POST  → MCP tool execution (deprecated)

Global MCP endpoint:
POST /mcp               → MCP protocol handler
```

### Durable Object: Code Class

**Location**: `packages/testing.spike.land/src/chatRoom.ts`

Each codespace has its own Durable Object instance that maintains:

```typescript
interface ICodeSession {
  codeSpace: string; // Unique identifier
  code: string; // Source TSX/JSX code
  transpiled: string; // Compiled JavaScript
  html: string; // Rendered HTML
  css: string; // Extracted styles
}
```

**Responsibilities**:

- Persistent state storage
- WebSocket broadcast to connected clients
- MCP server implementation for AI tools
- Route handling for API requests

### REST API Examples

**Get current code**:

```bash
curl https://testing.spike.land/live/my-app/session.json
```

**Update code**:

```bash
curl -X PUT https://testing.spike.land/live/my-app/api/code \
  -H "Content-Type: application/json" \
  -d '{"code": "export default () => <h1>Hello</h1>", "run": true}'
```

**Get screenshot**:

```bash
curl https://testing.spike.land/live/my-app/api/screenshot > screenshot.jpg
```

### Wrangler Configuration

**Location**: `packages/testing.spike.land/wrangler.toml`

```toml
name = "spike-land"
main = "src/cf-workers.ts"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "CODE", class_name = "Code" },
  { name = "LIMITERS", class_name = "CodeRateLimiter" },
]

kv_namespaces = [
  { binding = "KV", id = "..." },
]

[[r2_buckets]]
binding = "R2"
bucket_name = "npmprod"

[[r2_buckets]]
binding = "X9"
bucket_name = "code-chain"

[site]
bucket = "../code/dist" # Static editor UI assets
```

---

## MCP Integration

### MCP Server in testing.spike.land

**Location**: `packages/testing.spike.land/src/mcp/`

The Cloudflare Worker implements an MCP server that AI agents can connect to for
code manipulation.

**Endpoint**: `POST /mcp`

**Available Tools**:

| Tool                 | Description                         |
| -------------------- | ----------------------------------- |
| `read_code`          | Get the current source code         |
| `read_html`          | Get the rendered HTML               |
| `read_session`       | Get full session data               |
| `update_code`        | Replace the entire code             |
| `edit_code`          | Edit specific line ranges           |
| `search_and_replace` | Find and replace patterns           |
| `find_lines`         | Search for lines matching a pattern |

### Claude Agent SDK Integration

**Location**: `src/lib/claude-agent/tools/codespace-tools.ts`

When a user sends a message in the app workspace, the backend creates an MCP
server instance:

```typescript
export function createCodespaceServer(codespaceId: string) {
  return createSdkMcpServer({
    name: "codespace",
    version: "1.0.0",
    tools: [
      tool("read_code", "Read the current code...", {}, async () => {
        const code = await fetch(
          `https://testing.spike.land/live/${codespaceId}/session.json`,
        ).then((r) => r.json()).then((d) => d.code);
        return { content: [{ type: "text", text: code }] };
      }),
      tool(
        "update_code",
        "Replace the entire code...",
        { code: z.string() },
        async (args) => {
          await fetch(
            `https://testing.spike.land/live/${codespaceId}/api/code`,
            {
              method: "PUT",
              body: JSON.stringify({ code: args.code, run: true }),
            },
          );
          return { content: [{ type: "text", text: "success" }] };
        },
      ),
      // ... more tools
    ],
  });
}
```

### External MCP Server (@spike-npm-land/mcp-server)

**Location**: `packages/mcp-server/`

A standalone MCP server package for Claude Desktop and Claude Code.

**Installation**:

```bash
npx @spike-npm-land/mcp-server
```

**Configuration** (Claude Desktop):

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_your_key"
      }
    }
  }
}
```

**Codespace Tools**:

| Tool                     | Description                      |
| ------------------------ | -------------------------------- |
| `codespace_update`       | Create/update a live React app   |
| `codespace_run`          | Transpile without code change    |
| `codespace_screenshot`   | Get JPEG preview                 |
| `codespace_get`          | Fetch current code and metadata  |
| `codespace_link_app`     | Link codespace to user's My-Apps |
| `codespace_list_my_apps` | List user's apps                 |

**Example - Link codespace to app**:

```typescript
// Using the tool
await callTool("codespace_link_app", {
  codespace_id: "my-cool-app",
  app_name: "My Cool App",
  app_description: "A React app built with AI",
});
// Creates app in spike.land linked to the codespace
```

---

## Data Flow

### Creating an App

```
User visits /my-apps/new
        │
        ▼
Frontend generates random codespaceId
(e.g., "bright.nexus.launch.f3a2")
        │
        ▼
Redirects to /my-apps/new/[tempId]
        │
        ▼
User types prompt and clicks Send
        │
        ▼
POST /api/apps
{
  prompt: "Build a todo app",
  codespaceId: "bright.nexus.launch.f3a2"
}
        │
        ▼
Backend creates App record:
- codespaceId: "bright.nexus.launch.f3a2"
- codespaceUrl: "https://testing.spike.land/live/bright.nexus.launch.f3a2/"
- status: "WAITING"
- First message: USER with prompt
        │
        ▼
Redirects to /my-apps/[newAppId]
        │
        ▼
Workspace loads with chat + preview iframe
```

### AI Interaction Flow

```
User sends message in workspace
        │
        ▼
POST /api/apps/[id]/agent/chat
{ content: "Add a delete button" }
        │
        ▼
Backend:
1. Creates USER message in DB
2. Fetches current code from testing.spike.land
3. Initializes Claude Agent with MCP server
        │
        ▼
Claude Agent:
1. Calls read_code tool
2. Analyzes current code
3. Calls update_code or search_and_replace
4. Returns explanation
        │
        ▼
Backend:
1. Streams response chunks (SSE format)
2. Saves AGENT message to DB
3. Broadcasts "code_updated" event
        │
        ▼
Frontend:
1. Displays streaming response
2. Receives "code_updated" event
3. Refreshes preview iframe
```

---

## Local Development

### Running the Next.js App

```bash
cd /Users/z/Developer/spike-land-nextjs

# Install dependencies
yarn install

# Start dev server
yarn dev
# → http://localhost:3000
```

**What works locally**:

- My-Apps dashboard at `http://localhost:3000/my-apps`
- Database operations via local PostgreSQL
- Authentication flow

**What still uses production**:

- Live preview iframes load from `https://testing.spike.land`
- Code updates go to production Cloudflare Worker

### Running testing.spike.land Locally

```bash
cd packages/testing.spike.land

# Create environment file
cat > .dev.vars << EOF
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
EOF

# Start local worker
yarn dev
# → http://localhost:8787

# Or with remote bindings (uses production KV/R2)
yarn dev:remote
```

**Local URLs**:

- `http://localhost:8787/live/{codespaceId}/` - Live app preview
- `http://localhost:8787/live/{codespaceId}/api/code` - Code API
- `http://localhost:8787/mcp` - MCP endpoint

### Full Local Stack (End-to-End)

To test everything locally:

1. **Start testing.spike.land**:

```bash
cd packages/testing.spike.land
yarn dev  # http://localhost:8787
```

2. **Configure Next.js to use localhost** (modify URLs in code or use env vars):

```typescript
// In src/lib/claude-agent/tools/codespace-tools.ts
const TESTING_SPIKE_LAND = process.env.TESTING_SPIKE_LAND_URL ||
  "https://testing.spike.land";
```

3. **Start Next.js**:

```bash
yarn dev  # http://localhost:3000
```

4. **Test the flow**:

- Visit `http://localhost:3000/my-apps`
- Create a new app
- Preview should load from `http://localhost:8787`

### Testing

```bash
# Next.js tests
yarn test:coverage

# testing.spike.land tests
cd packages/testing.spike.land
yarn test:unit

# E2E tests (requires dev server running)
yarn test:e2e:local
```

---

## Production Architecture

### Deployment

| Component          | Platform           | URL                          |
| ------------------ | ------------------ | ---------------------------- |
| spike.land         | Vercel             | `https://spike.land`         |
| testing.spike.land | Cloudflare Workers | `https://testing.spike.land` |
| Database           | Managed PostgreSQL | (internal)                   |
| Storage            | Cloudflare R2      | (internal)                   |

### Deployment Commands

```bash
# Deploy Next.js (handled by Vercel on push to main)
git push origin main

# Deploy testing.spike.land
cd packages/testing.spike.land
yarn deploy:dev   # Testing environment
yarn deploy:prod  # Production
```

### Environment Variables

**Next.js (Vercel)**:

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
ANTHROPIC_API_KEY=...
SPIKE_LAND_API_KEY=sk_live_...
```

**testing.spike.land (Cloudflare)**:

```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Key Files Reference

| Purpose                | File Path                                           |
| ---------------------- | --------------------------------------------------- |
| **Next.js Pages**      |                                                     |
| Apps listing           | `src/app/my-apps/page.tsx`                          |
| App workspace          | `src/app/my-apps/[id]/page.tsx`                     |
| New app entry          | `src/app/my-apps/new/page.tsx`                      |
| Draft workspace        | `src/app/my-apps/new/[tempId]/page.tsx`             |
| **API Routes**         |                                                     |
| App CRUD               | `src/app/api/apps/route.ts`                         |
| App by ID              | `src/app/api/apps/[id]/route.ts`                    |
| Agent chat             | `src/app/api/apps/[id]/agent/chat/route.ts`         |
| SSE stream             | `src/app/api/apps/[id]/messages/stream/route.ts`    |
| Messages               | `src/app/api/apps/[id]/messages/route.ts`           |
| Images                 | `src/app/api/apps/[id]/images/route.ts`             |
| **Components**         |                                                     |
| App catalog            | `src/components/my-apps/AppCatalog.tsx`             |
| 3D card                | `src/components/my-apps/AppCard3D.tsx`              |
| **Database**           |                                                     |
| Prisma schema          | `prisma/schema.prisma`                              |
| **Cloudflare Worker**  |                                                     |
| Main entry             | `packages/testing.spike.land/src/cf-workers.ts`     |
| Request handler        | `packages/testing.spike.land/src/chat.ts`           |
| Durable Object         | `packages/testing.spike.land/src/chatRoom.ts`       |
| Route handler          | `packages/testing.spike.land/src/routeHandler.ts`   |
| MCP handler            | `packages/testing.spike.land/src/mcp/handler.ts`    |
| MCP tools              | `packages/testing.spike.land/src/mcp/tools/`        |
| **MCP Server Package** |                                                     |
| Main entry             | `packages/mcp-server/src/index.ts`                  |
| Codespace tools        | `packages/mcp-server/src/tools/codespace/index.ts`  |
| API client             | `packages/mcp-server/src/tools/codespace/client.ts` |
| **Claude Agent**       |                                                     |
| Codespace tools        | `src/lib/claude-agent/tools/codespace-tools.ts`     |
| **Config**             |                                                     |
| Wrangler               | `packages/testing.spike.land/wrangler.toml`         |

---

## Troubleshooting

### Common Issues

**Preview iframe not loading**:

- Check that `codespaceUrl` is set on the app
- Verify testing.spike.land is accessible
- Check browser console for CORS errors

**Agent not responding**:

- Verify `ANTHROPIC_API_KEY` is set
- Check `/api/apps/[id]/agent/chat` logs
- Ensure codespace exists on testing.spike.land

**SSE not working**:

- Check `/api/apps/[id]/messages/stream` endpoint
- Note: Doesn't scale across Vercel instances
- Check for client-side EventSource errors

**Local Cloudflare Worker issues**:

- Run `yarn dev:remote` to use production bindings
- Check `.dev.vars` has required API keys
- Verify Durable Objects are enabled in your account
