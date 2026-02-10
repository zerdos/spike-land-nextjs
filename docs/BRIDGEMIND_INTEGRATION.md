# Spike Land MCP Integration Guide for BridgeMind

> **Last Updated**: February 2026 | **Status**: Partnership Pitch
> **Audience**: Matthew Miller (Founder) + BridgeMind Engineering Team
> **Protocol**: JSON-RPC 2.0 (MCP Specification 2024-11-05)

---

## Table of Contents

1. [Why This Integration Matters](#why-this-integration-matters)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [MCP Tool Reference](#mcp-tool-reference)
5. [Integration Scenario 1: MCP-to-MCP Pipeline](#integration-scenario-1-mcp-to-mcp-pipeline)
6. [Integration Scenario 2: BridgeCode Live Preview](#integration-scenario-2-bridgecode-live-preview)
7. [Integration Scenario 3: BridgeSpace Embedding](#integration-scenario-3-bridgespace-embedding)
8. [Integration Scenario 4: BridgeVoice + Spike Land](#integration-scenario-4-bridgevoice--spike-land)
9. [Value Proposition Summary](#value-proposition-summary)
10. [Next Steps](#next-steps)

---

## Why This Integration Matters

BridgeMind builds the tools that plan and orchestrate code (BridgeMCP, BridgeCode, BridgeVoice). Spike Land provides the runtime that executes, transpiles, and renders code in the browser with live preview. These capabilities do not overlap -- they complete each other.

The integration unlocks a workflow that neither platform can deliver alone:

```
  PLAN (BridgeMind)          EXECUTE (Spike Land)         SEE (Live Preview)
  +-----------------+        +-------------------+        +------------------+
  | BridgeMCP task  | -----> | spike.land MCP    | -----> | Live app at URL  |
  | BridgeCode CLI  |        | tools/call        |        | Instant render   |
  | BridgeVoice cmd |        | Transpile + Store |        | Share anywhere   |
  +-----------------+        +-------------------+        +------------------+
```

Every BridgeMind product gains a live execution backend. Every spike.land codeSpace gains 20-40K potential users from the BridgeMind community.

---

## Quick Start

### Add spike.land MCP to Cursor

Add this to your Cursor MCP configuration (`~/.cursor/mcp.json` or project-level `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "spike-land": {
      "url": "https://testing.spike.land/mcp",
      "transport": "http"
    }
  }
}
```

### Add spike.land MCP to Claude Code

Add this to your Claude Code MCP configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spike-land": {
      "url": "https://testing.spike.land/mcp",
      "transport": "http"
    }
  }
}
```

### Run alongside BridgeMCP

Both servers can coexist in the same configuration. BridgeMCP handles task management and agent instructions; spike.land handles code execution and live preview:

```json
{
  "mcpServers": {
    "bridgemcp": {
      "command": "bridgemcp",
      "args": ["start"]
    },
    "spike-land": {
      "url": "https://testing.spike.land/mcp",
      "transport": "http"
    }
  }
}
```

### Verify the Connection

Send a GET request to the endpoint to confirm availability:

```bash
curl https://testing.spike.land/mcp
```

Expected response:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "capabilities": {
      "tools": { "listChanged": true }
    },
    "serverInfo": {
      "name": "spike.land-mcp-server",
      "version": "1.0.1"
    }
  }
}
```

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                        MCP Client Layer                           |
|  (Cursor, Claude Code, VS Code, BridgeSpace, custom clients)     |
+------------------------------------------------------------------+
        |                                          |
        | JSON-RPC 2.0                             | JSON-RPC 2.0
        v                                          v
+------------------+                    +-------------------------+
|   BridgeMCP      |                    | spike.land MCP Server   |
|                  |                    |                         |
| - Task mgmt     |    "Plan here,     | - read_code             |
| - Agent instr.  | -- execute there"  | - read_html             |
| - Knowledge     |  ----------------> | - read_session          |
|   accumulation  |                    | - update_code           |
+------------------+                    | - edit_code             |
                                       | - search_and_replace    |
                                       | - find_lines            |
                                       +-------------------------+
                                                |
                                                | Internal
                                                v
                                       +-------------------------+
                                       | Cloudflare Workers      |
                                       |                         |
                                       | testing.spike.land      |
                                       |   Durable Objects       |
                                       |   (session state)       |
                                       |                         |
                                       | js.spike.land           |
                                       |   (transpilation)       |
                                       +-------------------------+
                                                |
                                                v
                                       +-------------------------+
                                       | Live Preview            |
                                       | testing.spike.land      |
                                       |   /live/{codeSpace}/    |
                                       |                         |
                                       | - Full React runtime    |
                                       | - CDN-backed imports    |
                                       | - Hot reload via WS     |
                                       | - Shareable URLs        |
                                       +-------------------------+
```

### Key Infrastructure Details

- **Endpoint**: `https://testing.spike.land/mcp` (JSON-RPC 2.0 over HTTP POST)
- **Live Preview**: `https://testing.spike.land/live/{codeSpace}/`
- **Transpilation**: Server-side via `https://js.spike.land` (esbuild-based, handles JSX/TSX)
- **State**: Cloudflare Durable Objects maintain session per codeSpace
- **CORS**: Fully open (`Access-Control-Allow-Origin: *`) -- no proxy needed

---

## MCP Tool Reference

The server exposes 7 tools across three categories. All tools require a `codeSpace` parameter, which is a string identifier for the workspace.

### Protocol Handshake

Before calling tools, initialize the session:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true }
    },
    "serverInfo": {
      "name": "spike.land-mcp-server",
      "version": "1.0.1"
    }
  }
}
```

List all available tools:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

---

### Read Tools

These tools retrieve data without modifying state. Use them to inspect what currently exists in a codeSpace.

#### read_code

Returns the current source code from a codeSpace.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_code",
    "arguments": {
      "codeSpace": "my-landing-page"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"code\":\"import React from 'react';\\nexport default function App() {\\n  return <h1>Hello</h1>;\\n}\",\"codeSpace\":\"my-landing-page\"}"
    }]
  }
}
```

#### read_html

Returns the rendered HTML output. Lighter weight than `read_session` when you only need the visual result.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "read_html",
    "arguments": {
      "codeSpace": "my-landing-page"
    }
  }
}
```

#### read_session

Returns the full session: code, HTML, and CSS. Use sparingly -- prefer `read_code` or `read_html` for targeted reads.

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "read_session",
    "arguments": {
      "codeSpace": "my-landing-page"
    }
  }
}
```

Response payload includes:

| Field       | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `code`      | string | Source code (JSX/TSX)        |
| `html`      | string | Rendered HTML output         |
| `css`       | string | Extracted CSS                |
| `codeSpace` | string | The codeSpace identifier     |

---

### Edit Tools

These tools modify source code. After any edit, the server automatically transpiles the code via `js.spike.land` and broadcasts the update to all connected live preview clients via WebSocket.

#### update_code

Replaces ALL code in a codeSpace. Use for initial generation or full rewrites.

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "update_code",
    "arguments": {
      "codeSpace": "my-landing-page",
      "code": "import React from 'react';\n\nexport default function App() {\n  return (\n    <div className=\"p-8\">\n      <h1 className=\"text-4xl font-bold\">Welcome</h1>\n      <p>Built with BridgeCode + spike.land</p>\n    </div>\n  );\n}"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"message\":\"Code updated and transpiled successfully (195 chars).\",\"codeSpace\":\"my-landing-page\",\"requiresTranspilation\":false}"
    }]
  }
}
```

After this call, the live preview is immediately visible at:
`https://testing.spike.land/live/my-landing-page/`

#### edit_code

Precise line-based edits. More efficient than `update_code` for targeted changes. Use `find_lines` first to locate the target lines.

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "edit_code",
    "arguments": {
      "codeSpace": "my-landing-page",
      "edits": [
        {
          "startLine": 5,
          "endLine": 5,
          "newContent": "      <h1 className=\"text-5xl font-extrabold text-blue-600\">Welcome</h1>"
        },
        {
          "startLine": 6,
          "endLine": 6,
          "newContent": "      <p className=\"mt-4 text-lg\">Built with BridgeCode + spike.land</p>"
        }
      ]
    }
  }
}
```

Response includes a unified diff showing exactly what changed:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"message\":\"Code edited and transpiled successfully.\",\"codeSpace\":\"my-landing-page\",\"diff\":\"@@ -5,1 +5,1 @@\\n-      <h1 className=\\\"text-4xl font-bold\\\">Welcome</h1>\\n+      <h1 className=\\\"text-5xl font-extrabold text-blue-600\\\">Welcome</h1>\",\"linesChanged\":2,\"requiresTranspilation\":false}"
    }]
  }
}
```

Edit rules:
- Line numbers are **1-based**
- `startLine` must be less than or equal to `endLine`
- `endLine` must not exceed total line count
- Edits must not overlap
- Edits are applied in reverse order (bottom-up) to preserve line numbers

#### search_and_replace

Pattern-based replacement. The most efficient tool for simple text swaps -- no line numbers needed.

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "search_and_replace",
    "arguments": {
      "codeSpace": "my-landing-page",
      "search": "Welcome",
      "replace": "Hello from BridgeMind",
      "isRegex": false,
      "global": true
    }
  }
}
```

| Parameter | Type    | Required | Default | Description                          |
| --------- | ------- | -------- | ------- | ------------------------------------ |
| codeSpace | string  | yes      | --      | Target codeSpace                     |
| search    | string  | yes      | --      | Text or regex pattern to find        |
| replace   | string  | yes      | --      | Replacement text                     |
| isRegex   | boolean | no       | false   | Treat `search` as a regular expression |
| global    | boolean | no       | true    | Replace all occurrences              |

Regex example -- rename a component:

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "search_and_replace",
    "arguments": {
      "codeSpace": "my-landing-page",
      "search": "function\\s+App\\b",
      "replace": "function LandingPage",
      "isRegex": true,
      "global": true
    }
  }
}
```

---

### Find Tools

#### find_lines

Find lines matching a pattern. Returns line numbers, content, and matched text. Use this before `edit_code` to locate target lines precisely.

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "find_lines",
    "arguments": {
      "codeSpace": "my-landing-page",
      "pattern": "className",
      "isRegex": false
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"pattern\":\"className\",\"isRegex\":false,\"matches\":[{\"lineNumber\":4,\"content\":\"    <div className=\\\"p-8\\\">\",\"matchText\":\"className\"},{\"lineNumber\":5,\"content\":\"      <h1 className=\\\"text-5xl font-extrabold text-blue-600\\\">Hello from BridgeMind</h1>\",\"matchText\":\"className\"}],\"totalMatches\":2,\"codeSpace\":\"my-landing-page\"}"
    }]
  }
}
```

Regex example -- find all import statements:

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "find_lines",
    "arguments": {
      "codeSpace": "my-landing-page",
      "pattern": "^import\\s+",
      "isRegex": true
    }
  }
}
```

---

### Complete Tool Summary

| Tool                | Category | Description                                    | Key Parameters                                  |
| ------------------- | -------- | ---------------------------------------------- | ----------------------------------------------- |
| `read_code`         | Read     | Get current source code                        | `codeSpace`                                     |
| `read_html`         | Read     | Get rendered HTML                              | `codeSpace`                                     |
| `read_session`      | Read     | Get full session (code + HTML + CSS)           | `codeSpace`                                     |
| `update_code`       | Edit     | Replace all code                               | `codeSpace`, `code`                             |
| `edit_code`         | Edit     | Line-based precision edits                     | `codeSpace`, `edits[]`                          |
| `search_and_replace`| Edit     | Pattern-based find and replace                 | `codeSpace`, `search`, `replace`, `isRegex?`, `global?` |
| `find_lines`        | Find     | Search for lines matching a pattern            | `codeSpace`, `pattern`, `isRegex?`              |

---

## Integration Scenario 1: MCP-to-MCP Pipeline

**BridgeMCP + spike.land MCP working together in a single agent session.**

This is the highest-impact integration. An AI agent (in Cursor, Claude Code, or BridgeSpace) has access to both MCP servers simultaneously. BridgeMCP manages the task; spike.land executes the code.

### Flow

```
  User: "Build me a pricing page for my SaaS"
                |
                v
  +---------------------------+
  | AI Agent (Cursor / Claude)|
  | Both MCPs configured      |
  +---------------------------+
        |                |
        v                v
  +-----------+    +-------------+
  | BridgeMCP |    | spike.land  |
  | tasks/add |    | MCP         |
  +-----------+    +-------------+
        |                |
        v                v
  Task created:      tools/call:
  "Pricing page       update_code
   with 3 tiers"      (generated JSX)
        |                |
        v                v
  Task knowledge     Live preview:
  updated with       testing.spike.land
  result URL         /live/pricing-page/
```

### Concrete Example

Step 1 -- The agent receives a user request and creates a BridgeMCP task:

```
User prompt: "Build a pricing page with Free, Pro, and Enterprise tiers"
```

Step 2 -- The agent calls spike.land MCP to create the app:

```json
{
  "jsonrpc": "2.0",
  "id": 100,
  "method": "tools/call",
  "params": {
    "name": "update_code",
    "arguments": {
      "codeSpace": "bridgemind-pricing",
      "code": "import React from 'react';\n\nconst tiers = [\n  { name: 'Free', price: '$0/mo', features: ['5 projects', 'Community support'] },\n  { name: 'Pro', price: '$20/mo', features: ['Unlimited projects', 'Priority support', 'BridgeVoice'] },\n  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated agent', 'SLA'] },\n];\n\nexport default function PricingPage() {\n  return (\n    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', justifyContent: 'center' }}>\n      {tiers.map(tier => (\n        <div key={tier.name} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem', width: '280px', textAlign: 'center' }}>\n          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tier.name}</h2>\n          <p style={{ fontSize: '2rem', margin: '1rem 0' }}>{tier.price}</p>\n          <ul style={{ listStyle: 'none', padding: 0 }}>\n            {tier.features.map(f => <li key={f} style={{ padding: '0.5rem 0' }}>{f}</li>)}\n          </ul>\n          <button style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Get Started</button>\n        </div>\n      ))}\n    </div>\n  );\n}"
    }
  }
}
```

Step 3 -- The live preview is now available:

```
https://testing.spike.land/live/bridgemind-pricing/
```

Step 4 -- The agent iterates using lightweight edits:

```json
{
  "jsonrpc": "2.0",
  "id": 101,
  "method": "tools/call",
  "params": {
    "name": "search_and_replace",
    "arguments": {
      "codeSpace": "bridgemind-pricing",
      "search": "Get Started",
      "replace": "Start Building",
      "global": true
    }
  }
}
```

Each edit triggers automatic transpilation and live preview update over WebSocket. No page refresh needed.

### What BridgeMind Gains

- BridgeMCP tasks gain real execution power: "Plan here, build there"
- Task knowledge can store the live preview URL as an artifact
- The agent loop (plan, execute, review, iterate) becomes visual

### What spike.land Gains

- Distribution to BridgeMind's builder community
- Every BridgeMCP user can create live apps through spike.land

---

## Integration Scenario 2: BridgeCode Live Preview

**BridgeCode CLI generates code. spike.land shows it live.**

BridgeCode is a CLI tool for AI-powered code generation. It produces code files but currently has no built-in live preview. spike.land fills that gap with zero additional infrastructure for BridgeMind to build or maintain.

### Flow

```
  Terminal                   spike.land API              Browser
  +------------------+      +-------------------+       +------------------+
  | $ bridgecode     |      |                   |       |                  |
  |   generate       | ---> | POST /mcp         | ----> | Live preview at  |
  |   "pricing page" |      | tools/call:       |       | /live/bc-xxxx/   |
  |                  |      | update_code       |       |                  |
  | Output:          | <--- |                   |       | Auto-refreshes   |
  | Live: https://   |      | { success: true } |       | on every edit    |
  | testing.spike... |      +-------------------+       +------------------+
  +------------------+
```

### Implementation in BridgeCode

BridgeCode would make a single HTTP POST to the spike.land MCP endpoint after generating code:

```typescript
// Inside BridgeCode CLI after code generation
async function publishToSpikeLand(
  generatedCode: string,
  projectName: string,
): Promise<string> {
  const codeSpace = `bc-${projectName}-${Date.now()}`;

  const response = await fetch("https://testing.spike.land/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "update_code",
        arguments: {
          codeSpace,
          code: generatedCode,
        },
      },
    }),
  });

  const result = await response.json();
  const liveUrl = `https://testing.spike.land/live/${codeSpace}/`;

  console.log(`Live preview: ${liveUrl}`);
  return liveUrl;
}
```

Subsequent edits from BridgeCode can use `search_and_replace` or `edit_code` for efficient incremental updates instead of replacing the entire codebase each time.

### BridgeCode CLI Output (proposed UX)

```
$ bridgecode generate "pricing page with 3 tiers"

Generating...  done (2.1s)

  Files created:
    src/PricingPage.tsx

  Live preview:
    https://testing.spike.land/live/bc-pricing-1707436800/

  Iterate:
    bridgecode edit "make the Pro tier highlighted"
```

### What BridgeMind Gains

- A flagship differentiator for BridgeCode: instant live preview from CLI
- No preview infrastructure to build, host, or maintain
- Works with any React/JSX code BridgeCode generates

### What spike.land Gains

- Every `bridgecode generate` command creates a spike.land codeSpace
- Usage scales linearly with BridgeCode adoption

---

## Integration Scenario 3: BridgeSpace Embedding

**Dedicated spike.land live preview pane inside BridgeSpace (the desktop ADE).**

BridgeSpace is BridgeMind's desktop terminal and Agentic Development Environment. Embedding spike.land's live preview gives developers a real-time visual feedback loop without leaving their workspace.

### Iframe Embedding

spike.land live previews are standard web pages served with permissive CORS headers. They can be embedded as iframes in any application:

```html
<iframe
  src="https://testing.spike.land/live/my-project/"
  style="width: 100%; height: 100%; border: none;"
  sandbox="allow-scripts allow-same-origin"
  title="Live Preview"
></iframe>
```

### Architecture Inside BridgeSpace

```
  +---------------------------------------------------------------+
  |  BridgeSpace Desktop App                                       |
  |                                                                |
  |  +-------------------+  +--------------------+  +------------+ |
  |  |                   |  |                    |  |            | |
  |  |  Code Editor      |  |  Terminal          |  |  spike.land| |
  |  |  (Monaco/similar) |  |  (BridgeCode CLI)  |  |  Live      | |
  |  |                   |  |                    |  |  Preview   | |
  |  |  Edit code here   |  |  $ bridgecode     |  |            | |
  |  |  via spike.land   |  |    generate ...    |  |  <iframe>  | |
  |  |  MCP calls        |  |                    |  |  auto-     | |
  |  |                   |  |  $ bridgecode     |  |  refreshes | |
  |  |                   |  |    edit ...        |  |  via WS    | |
  |  |                   |  |                    |  |            | |
  |  +-------------------+  +--------------------+  +------------+ |
  |                                                                |
  +---------------------------------------------------------------+
```

### Sync Protocol

spike.land live previews update in real time via WebSocket. BridgeSpace does not need to manage refresh logic. The embedded iframe receives updates automatically when code changes are pushed through any MCP tool call.

The sync flow:

1. BridgeSpace calls `update_code` or `edit_code` via MCP
2. spike.land Durable Object transpiles the code server-side
3. Durable Object broadcasts the update to all WebSocket connections
4. The iframe's client-side code receives the update and re-renders
5. No manual refresh or polling needed

### Listening for Updates (optional)

If BridgeSpace wants to react to code changes (for example, to update a status indicator), it can connect a WebSocket directly:

```typescript
const ws = new WebSocket(
  "wss://testing.spike.land/live/my-project/websocket"
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data contains updated session info
  console.log("Code updated:", data.codeSpace);
};
```

### What BridgeMind Gains

- A live preview pane in BridgeSpace with zero rendering infrastructure
- Real-time updates without polling
- Works with any React component out of the box

### What spike.land Gains

- Deep product integration: spike.land becomes part of the BridgeSpace experience
- Every BridgeSpace user session creates spike.land codeSpaces

---

## Integration Scenario 4: BridgeVoice + Spike Land

**Voice command to live preview in seconds. "Say it, see it."**

BridgeVoice converts voice commands into code. Adding spike.land as the execution layer creates the most intuitive development workflow possible: speak what you want, watch it appear.

### Flow

```
  Voice Input          BridgeVoice           spike.land MCP         Browser
  +------------+       +-------------+       +----------------+     +----------+
  |            |       |             |       |                |     |          |
  | "Make the  | ----> | Speech-to-  | ----> | tools/call:    | --> | Live     |
  |  header    |       | text +      |       | search_and_    |     | preview  |
  |  blue and  |       | AI code     |       | replace        |     | updates  |
  |  bigger"   |       | generation  |       |                |     | in real  |
  |            |       |             |       | OR edit_code   |     | time     |
  +------------+       +-------------+       +----------------+     +----------+
```

### Implementation Sketch

BridgeVoice processes the voice command into an intent, then selects the appropriate spike.land MCP tool:

```typescript
// Pseudocode for BridgeVoice integration
async function handleVoiceCommand(
  transcript: string,
  codeSpace: string,
) {
  // Step 1: BridgeVoice converts voice to structured intent
  const intent = await bridgeVoiceParseIntent(transcript);
  // intent = { action: "style_change", target: "header", changes: { color: "blue", size: "larger" } }

  // Step 2: Read current code to understand context
  const currentCode = await mcpCall("read_code", { codeSpace });

  // Step 3: AI generates the specific edit
  const edit = await generateEdit(intent, currentCode);

  // Step 4: Apply via spike.land MCP
  if (edit.type === "search_and_replace") {
    await mcpCall("search_and_replace", {
      codeSpace,
      search: edit.search,
      replace: edit.replace,
    });
  } else if (edit.type === "line_edit") {
    await mcpCall("edit_code", {
      codeSpace,
      edits: edit.edits,
    });
  }

  // Step 5: Live preview updates automatically
  return `https://testing.spike.land/live/${codeSpace}/`;
}
```

### Optimal Tool Selection by Voice Command Type

| Voice Command Type           | Best spike.land Tool    | Why                                              |
| ---------------------------- | ----------------------- | ------------------------------------------------ |
| "Change X to Y"             | `search_and_replace`    | Direct text swap, no line numbers needed          |
| "Make the header bigger"    | `find_lines` + `edit_code` | Find the element, then edit specific lines     |
| "Build me a new component"  | `update_code`           | Full code replacement for new content             |
| "What does the page look like?" | `read_html`          | Quick check without modifying anything            |
| "Show me the code"          | `read_code`             | Inspect current state                             |

### Demo Script for "Say It, See It"

This sequence demonstrates the full voice-to-preview loop:

1. Voice: "Create a contact form with name, email, and message fields"
   - Tool: `update_code` -- generates full React component
   - Result: Contact form appears at live URL

2. Voice: "Make the submit button green"
   - Tool: `search_and_replace` -- swaps button color
   - Result: Preview updates instantly

3. Voice: "Add a phone number field after email"
   - Tool: `find_lines` to locate the email field, then `edit_code` to insert
   - Result: New field appears in the form

4. Voice: "What does it look like now?"
   - Tool: `read_html` -- returns rendered HTML for voice readback or display

### What BridgeMind Gains

- The most compelling demo possible: voice to live app in seconds
- Differentiates BridgeVoice from every other voice-to-code tool
- Real-time visual feedback makes voice coding practical, not just a novelty

### What spike.land Gains

- Association with an innovative interaction paradigm
- Viral demo potential: "Say it, see it" is inherently shareable

---

## Value Proposition Summary

| BridgeMind Product | What spike.land Adds                               | Integration Effort |
| ------------------- | --------------------------------------------------- | ------------------ |
| **BridgeMCP**       | Real code execution behind task management           | Low (config only)  |
| **BridgeCode**      | Instant live preview from CLI output                 | Medium (HTTP POST) |
| **BridgeSpace**     | Embedded live preview pane with auto-refresh         | Low (iframe)       |
| **BridgeVoice**     | Visual feedback loop for voice commands              | Medium (API calls) |

### For BridgeMind as a whole:

- No infrastructure to build or maintain for live preview
- Production-grade execution layer (Cloudflare Workers, edge-deployed globally)
- Server-side transpilation handles JSX/TSX without client-side build tools
- Every BridgeMind user interaction creates spike.land usage (aligned incentives)

### For spike.land:

- Distribution to 20-40K active builders
- Integration into 4 products across CLI, desktop, voice, and MCP
- Technical validation from a revenue-generating platform

---

## Next Steps

1. **Try it now**: Add the spike.land MCP config to Cursor or Claude Code (see Quick Start above) and run a `tools/call` with `update_code`. Verify the live preview URL works.

2. **Prototype the pipeline**: Configure both BridgeMCP and spike.land MCP in the same client. Have an agent plan a task in BridgeMCP and execute it through spike.land.

3. **Discuss integration scope**: Which scenario should we build first? The MCP-to-MCP pipeline (Scenario 1) requires zero code changes from either side -- it works today with configuration alone.

4. **Technical call**: Walk through the architecture, discuss codeSpace naming conventions, rate limits, and any custom requirements from BridgeMind's side.

### Contact

| Field        | Value                            |
| ------------ | -------------------------------- |
| **Name**     | Zoltan Erdos                     |
| **Company**  | SPIKE LAND LTD (UK #16906682)   |
| **Platform** | https://spike.land              |
| **MCP Endpoint** | https://testing.spike.land/mcp |

---

## Related Documentation

| Document                                              | Description                                    |
| ----------------------------------------------------- | ---------------------------------------------- |
| [BRIDGEMIND_COLLABORATION.md](./BRIDGEMIND_COLLABORATION.md) | Full collaboration strategy and outreach plan |
| [API_REFERENCE.md](./API_REFERENCE.md)                | Complete spike.land API reference               |
| [FEATURES.md](./FEATURES.md)                          | Platform features overview                      |
| [MY_APPS_ARCHITECTURE.md](./MY_APPS_ARCHITECTURE.md)  | My-Apps (0-shot app builder) architecture       |

---

**Document Version**: 1.0
**Created**: February 2026
**Maintained By**: Zoltan Erdos
