# spike.land MCP Server -- The Execution Layer for Agentic Coding

**Vibeathon Submission | BridgeMind Vibeathon Feb 1-14, 2026**

> "Plan in BridgeMCP, build on spike.land, see results instantly."

---

## The Problem

AI agents have gotten very good at planning. They can break down tasks, reason about architecture, and generate code. But there is a massive gap between "the agent wrote some code" and "I can see it running in my browser."

Today, most vibe coding workflows look like this:

1. Agent generates code
2. You paste it into a local file
3. You restart the dev server
4. You alt-tab to the browser
5. You check if it worked
6. You copy the error back to the agent
7. Repeat

That loop is slow, brittle, and breaks the vibe. There is no production-grade execution environment where AI agents can write code AND see it render in real-time, with zero human copy-paste in between.

BridgeMCP solves the planning side brilliantly -- task management, agent instructions, workflow orchestration. But when it comes time to actually execute, to turn plans into running React apps, the agent hits a wall. It needs somewhere to run that code, transpile it, and show the result.

That is the gap spike.land fills.

---

## The Solution

spike.land provides a production MCP server with 7 tools that give any AI agent the ability to read, write, and preview React applications in real-time. No local dev server. No copy-paste. No manual transpilation. The agent writes code, spike.land transpiles it, and the result appears in a live URL instantly.

### MCP Tool Inventory

**Read Tools -- Understand the current state**

| Tool | Purpose | Use Case |
|------|---------|----------|
| `read_code` | Read current source code from a codespace | Agent inspects existing code before making changes |
| `read_html` | Read rendered HTML output | Lightweight check on what the user sees |
| `read_session` | Read ALL session data (code + html + css) | Full state dump for comprehensive understanding |

**Edit Tools -- Make changes at any granularity**

| Tool | Purpose | Use Case |
|------|---------|----------|
| `update_code` | Replace ALL code with new content | Wholesale rewrites, new apps from scratch |
| `edit_code` | Precise line-based edits (startLine, endLine, newContent) | Surgical changes to specific sections |
| `search_and_replace` | Pattern-based replacement, supports regex | Renaming, refactoring, find-and-fix across the file |

**Find Tools -- Navigate the code**

| Tool | Purpose | Use Case |
|------|---------|----------|
| `find_lines` | Find line numbers containing a pattern | Locate targets before using `edit_code` |

Every edit tool automatically triggers server-side transpilation via `js.spike.land` (React/JSX to vanilla JS) and broadcasts the result to all connected browsers over WebSocket. The live preview at `testing.spike.land/live/{codeSpace}/` updates in real-time.

---

## The BridgeMCP + spike.land Workflow

This is how it works end-to-end. One continuous flow from task planning to live app.

### Step 1: Plan in BridgeMCP

BridgeMCP creates and manages the task:

```
Task: "Build a pricing page with three tiers, toggle between monthly and annual billing,
animated card hover effects"
```

BridgeMCP breaks this down, assigns agent instructions, tracks progress.

### Step 2: Agent connects to spike.land MCP

The agent's MCP config includes spike.land alongside BridgeMCP:

```json
{
  "mcpServers": {
    "bridgemcp": {
      "url": "https://bridgemcp.example.com/mcp"
    },
    "spike-land": {
      "url": "https://testing.spike.land/mcp"
    }
  }
}
```

### Step 3: Read the current state

```json
{
  "method": "tools/call",
  "params": {
    "name": "read_code",
    "arguments": { "codeSpace": "pricing-page" }
  }
}
```

The agent sees what already exists in the codespace (or gets a blank canvas).

### Step 4: Write the code

```json
{
  "method": "tools/call",
  "params": {
    "name": "update_code",
    "arguments": {
      "codeSpace": "pricing-page",
      "code": "export default function PricingPage() { ... }"
    }
  }
}
```

spike.land receives the code, transpiles it server-side, saves a versioned snapshot, and broadcasts the result to all connected browsers.

### Step 5: See it live

The pricing page is immediately visible at:

```
https://testing.spike.land/live/pricing-page/
```

No build step. No deploy. No waiting. The browser connected via WebSocket gets the update in milliseconds.

### Step 6: Iterate with precision

Agent spots something to fix -- uses `search_and_replace` for a quick tweak:

```json
{
  "method": "tools/call",
  "params": {
    "name": "search_and_replace",
    "arguments": {
      "codeSpace": "pricing-page",
      "search": "background: \"#1a1a2e\"",
      "replace": "background: \"linear-gradient(135deg, #0a0a0f, #1a1a2e)\""
    }
  }
}
```

Live preview updates again. The loop is tight -- seconds, not minutes.

### Step 7: BridgeMCP marks task complete

BridgeMCP's task management records the completion. The live URL serves as proof of execution.

---

## Technical Architecture

```
+------------------+       +-------------------+       +------------------+
|   BridgeMCP      |       |  AI Agent         |       |  spike.land MCP  |
|   (Planning)     |<----->|  (Claude, GPT,    |<----->|  (Execution)     |
|                  |       |   Cursor, etc.)   |       |                  |
|  - Task mgmt     |       |  - Reads tasks    |       |  - 7 MCP tools   |
|  - Instructions  |       |  - Writes code    |       |  - Transpilation |
|  - Progress      |       |  - Verifies       |       |  - WebSocket     |
+------------------+       +-------------------+       +------------------+
                                                              |
                                                              v
                                                  +---------------------+
                                                  |  Cloudflare Edge    |
                                                  |                     |
                                                  |  Durable Objects    |
                                                  |  - Session state    |
                                                  |  - Version history  |
                                                  |  - WebSocket hub    |
                                                  |                     |
                                                  |  R2 Storage         |
                                                  |  - Large values     |
                                                  |  - Overflow data    |
                                                  |                     |
                                                  |  js.spike.land      |
                                                  |  - JSX transpiler   |
                                                  |  - esbuild-based    |
                                                  +---------------------+
                                                              |
                                                              v
                                                  +---------------------+
                                                  |  Live Preview       |
                                                  |  Browser clients    |
                                                  |  connected via WS   |
                                                  |                     |
                                                  |  testing.spike.land |
                                                  |  /live/{codeSpace}/ |
                                                  +---------------------+
```

### Key Infrastructure Decisions

**Cloudflare Workers + Durable Objects**: Each codespace is a Durable Object instance. This means the code state, version history, and WebSocket connections all live in the same process. No database round-trips for real-time operations. Sub-millisecond reads.

**Server-Side Transpilation**: When an agent writes JSX, spike.land sends it to `js.spike.land` (a separate Cloudflare Worker running esbuild) and stores the transpiled output alongside the source. The browser never has to transpile. This makes live preview instant.

**Import Maps for npm Packages**: React, Emotion, Framer Motion, and other npm packages resolve through an import map system. The agent writes standard `import React from "react"` and the browser resolves it to the correct CDN URL. No bundler config needed.

**Version History with Immutable Snapshots**: Every code change creates a versioned snapshot (code, transpiled output, HTML, CSS, hash). Agents can explore history. Nothing is lost.

**WebSocket Broadcasting**: All connected browsers receive updates in real-time. Open the live preview URL on your phone, your laptop, and a projector -- they all update simultaneously when the agent writes new code.

---

## Why This Matters for Vibe Coders

### Usefulness (40% of judging)

The spike.land MCP server solves the most frustrating part of agentic coding: the last mile. Every vibe coder has experienced the pain of an agent generating beautiful code that then takes 10 minutes to manually test, debug, and iterate on. spike.land collapses that to seconds.

Concrete use cases:
- **Rapid prototyping**: Tell an agent to build a landing page. See it live in under 5 seconds.
- **Live debugging**: Agent reads the current HTML output, spots the issue, makes a surgical `edit_code` fix, preview updates.
- **Client demos**: Share the live URL with a client. Have the agent iterate in real-time while they watch.
- **Learning and teaching**: Students describe what they want, the agent builds it, the result is immediately visible. Zero setup friction.

### Impact (25% of judging)

spike.land fills a gap in the vibe coding ecosystem that nobody else has addressed at the MCP protocol level. There are code generators. There are preview tools. There is nothing that connects AI agents directly to a live execution environment through a standardized MCP interface.

The impact compounds when combined with BridgeMCP. Together, they create a complete pipeline: plan the work, execute the work, see the result. Every tool in the BridgeMind ecosystem benefits from having spike.land as the execution layer.

For the broader ecosystem: any MCP-compatible agent (Claude, GPT, Cursor, Windsurf, or custom agents) can use these tools. It is not locked to one IDE or one model. The execution layer is open infrastructure.

### Execution (20% of judging)

This is not a hackathon prototype. spike.land has been in production since 2024. The MCP server runs on Cloudflare's global edge network. The codebase has 100% test coverage with CI/CD through GitHub Actions + Vercel.

Technical quality markers:
- **TypeScript strict mode** throughout
- **JSON-RPC 2.0 compliant** MCP protocol implementation (protocol version `2024-11-05`)
- **Comprehensive error handling** with typed error codes (-32700 Parse error, -32603 Internal error)
- **CORS headers** for cross-origin MCP access from any client
- **Modular tool architecture**: read-tools, edit-tools, find-tools in separate modules with clean interfaces
- **Input validation** on every tool call with descriptive error messages
- **Immutable version history** with hash-based integrity checks

The MCP handler class (`McpHandler`) supports dynamic tool registration via `addTool()` and `removeTool()`, making it extensible for future tools without modifying the core handler.

### Innovation (15% of judging)

The novel insight is treating the browser as the agent's output device. Most agentic coding tools treat code as the final output. spike.land treats the rendered, running application as the output.

This is a subtle but important distinction:
- **Code-as-output**: Agent generates text. Human evaluates text.
- **App-as-output**: Agent generates text. Infrastructure renders it. Human evaluates the running application.

The second model is what vibe coding actually needs. You do not want to read 200 lines of JSX to know if the pricing page looks right. You want to see the pricing page.

The technical innovation is the tight coupling of MCP tools with server-side transpilation and WebSocket broadcasting. One `tools/call` request triggers the full pipeline: validation, transpilation, storage, versioning, and live broadcast. The agent makes one call and the world updates.

---

## Demo Links

| Resource | URL |
|----------|-----|
| Live Preview (any codespace) | `https://testing.spike.land/live/{codeSpace}/` |
| MCP Endpoint | `https://testing.spike.land/mcp` |
| GitHub Repository | [github.com/zerdos/spike-land-nextjs](https://github.com/zerdos/spike-land-nextjs) |
| Platform Home | [spike.land](https://spike.land) |
| Transpiler Worker | [js.spike.land](https://js.spike.land) |

### Try It Right Now

Point any MCP-compatible client at `https://testing.spike.land/mcp` and call:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

You will get back the full tool inventory. Then create something:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "update_code",
    "arguments": {
      "codeSpace": "vibeathon-demo",
      "code": "export default function App() {\n  return <h1 style={{color: 'cyan'}}>Built with vibes</h1>\n}"
    }
  }
}
```

Then open `https://testing.spike.land/live/vibeathon-demo/` in your browser.

---

## About the Builder

**Zoltan Erdos** -- Solo founder and director of SPIKE LAND LTD (UK Company #16906682), based in Brighton, UK.

spike.land is itself a product of vibe coding. The entire platform -- MCP server, Cloudflare Workers, transpiler, live preview system, Next.js web app -- was built by one person working with AI agents. The codebase maintains 100% test coverage with automated CI/CD. It is the proof that the agentic coding workflow works at production scale.

The MCP server is not a side project bolted on for a hackathon. It is core infrastructure that has been running in production, serving real codespaces, and handling real code updates from AI agents.

**Tech stack**: TypeScript, Next.js 15, Cloudflare Workers, Durable Objects, R2, esbuild, Vitest, Playwright, GitHub Actions.

---

## One Last Thing

The best way to evaluate this submission is not to read about it. It is to use it.

Connect your agent to `https://testing.spike.land/mcp`. Give it a codespace name. Tell it to build something. Open the live preview URL. Watch it appear.

That is the vibe.

---

**Project**: spike.land MCP Server
**Builder**: Zoltan Erdos / SPIKE LAND LTD
**Event**: BridgeMind Vibeathon, February 1-14, 2026
**Contact**: [github.com/zerdos](https://github.com/zerdos)
