# System Architecture

This document provides an overview of the spike.land architecture, explaining
how the different packages and services work together.

---

## Table of Contents

- [Overview](#overview)
- [Package Structure](#package-structure)
- [Request Flow](#request-flow)
- [Storage Architecture](#storage-architecture)
- [Real-Time Collaboration](#real-time-collaboration)
- [Deployment](#deployment)

---

## Overview

spike.land is a monorepo containing multiple packages that work together to
provide a real-time collaborative code editing environment.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Browser                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Monaco Editor  │    │  React Preview   │    │   MCP Client    │ │
│  │  (packages/code) │    │    (iframe)      │    │   (AI Agent)    │ │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼────────────┘
            │                     │                     │
            │ WebSocket           │ HTTP                │ JSON-RPC
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼────────────┐
│           ▼                     ▼                     ▼            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              testing.spike.land (Cloudflare Worker)          │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │                    Code (Durable Object)            │    │  │
│  │  │  - Session Storage    - WebSocket Hub               │    │  │
│  │  │  - MCP Server         - Version History             │    │  │
│  │  └─────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              js.spike.land (Cloudflare Worker)               │  │
│  │              - esbuild-wasm transpilation                    │  │
│  │              - Import map transformation                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                         Cloudflare Edge                            │
└────────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
     ┌──────────┐          ┌──────────┐          ┌──────────┐
     │    KV    │          │    R2    │          │   D1     │
     │ (Static) │          │ (Assets) │          │  (SQL)   │
     └──────────┘          └──────────┘          └──────────┘
```

---

## Package Structure

### packages/testing.spike.land (Backend Worker)

The main backend Cloudflare Worker that handles:

- **Durable Objects**: `Code` class for session management
- **API Routes**: REST endpoints for various operations
- **MCP Server**: Model Context Protocol implementation
- **WebSocket**: Real-time collaboration hub
- **Static Serving**: Asset delivery from KV

**Key Files**:

```
src/
├── cf-workers.ts       # Main worker entry point
├── chatRoom.ts         # Code Durable Object class
├── mcp/
│   ├── index.ts        # MCP server implementation
│   ├── handler.ts      # Tool execution handler
│   └── tools/
│       ├── read-tools.ts
│       ├── edit-tools.ts
│       └── find-tools.ts
├── routes/
│   ├── liveRoutes.ts   # /live/* endpoints
│   ├── codeRoutes.ts   # Code-related routes
│   └── aiRoutes.ts     # AI integration routes
└── websocketHandler.ts # WebSocket connection handler
```

### packages/code (Editor Frontend)

React-based code editor built with Vite:

- **Monaco Editor**: Full-featured code editing
- **Live Preview**: Real-time component rendering
- **AI Chat**: Assistant UI for AI interactions
- **Web Workers**: Background processing (ATA, esbuild)

**Key Files**:

```
src/
├── @/
│   ├── components/
│   │   ├── app/
│   │   │   ├── monaco/         # Monaco editor integration
│   │   │   └── assistant-ui-*.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── importmap-utils.ts  # Import transformation
│   │   ├── transpile.ts        # esbuild integration
│   │   ├── use-archive.ts      # HTML generation
│   │   └── render-app.tsx      # React rendering
│   ├── services/
│   │   ├── CodeProcessor.ts
│   │   └── WebSocketManager.ts
│   └── workers/
│       └── ata.worker.ts       # Type acquisition
├── hooks/
│   ├── useDownload.ts
│   └── useCodeHistory.ts
└── workflows/
    └── chat-langchain*.ts      # AI workflows
```

### packages/js.spike.land (Transpiler Worker)

Lightweight Cloudflare Worker for code transpilation:

- **esbuild-wasm**: WebAssembly-based transpilation
- **Import Map**: Path transformations
- **API**: POST for code, GET for codeSpace builds

**Key Files**:

```
src/
├── index.ts            # Worker entry point
└── wasm.d.ts           # Type definitions
```

### packages/shared

Shared utilities and types:

- **Types**: TypeScript interfaces
- **Constants**: Shared configuration
- **Validations**: Zod schemas
- **Utils**: Common utilities

---

## Request Flow

### Page Load Flow

```
1. Browser requests /live/{codeSpace}
2. Worker routes to liveRoutes.ts
3. Durable Object (Code class) instantiated
4. Session loaded from storage
5. HTML page returned with:
   - Embedded session data
   - Monaco editor scripts
   - WebSocket connection info
6. Editor initializes with session code
7. Preview iframe renders component
```

### Code Edit Flow (MCP)

```
1. AI agent sends JSON-RPC to /live/{codeSpace}/mcp
2. MCP handler parses request
3. Tool executed (e.g., edit_code)
4. Code modified in Durable Object
5. Server-side transpilation via js.spike.land
6. Session updated with transpiled code
7. WebSocket broadcasts to all clients
8. Connected editors/previews update
```

### Transpilation Flow

```
1. Code change triggers transpilation
2. Source code sent to js.spike.land
3. importMapReplace transforms imports
4. esbuild-wasm compiles TSX → JS
5. Result returned to calling worker
6. Transpiled code stored in session
7. Preview iframe refreshes
```

---

## Storage Architecture

### Durable Object Storage

Each codeSpace has its own Durable Object instance:

```typescript
class Code implements DurableObject {
  private session: ICodeSession;
  private versionCount: number;

  // Stored in DO storage:
  // - session: Current session state
  // - version_N: Version snapshots
  // - version_count: Total versions
}
```

### Session Structure

```typescript
interface ICodeSession {
  codeSpace: string; // Unique identifier
  code: string; // Source TSX/TS
  transpiled: string; // Compiled JS
  html: string; // SSR HTML
  css: string; // Extracted CSS
}
```

### KV Storage

Used for static assets:

- **ASSET_MANIFEST**: File hashes for cache busting
- **Static files**: JS, CSS, images
- **Service worker config**: sw-config.json

### R2 Storage

Used for user-generated content:

- **live-cms/**: Mutable named files
- **my-cms/**: Content-addressed archives

### D1 Database

Used for structured data:

- User accounts
- Analytics
- Metadata

---

## Real-Time Collaboration

### WebSocket Hub

Each Durable Object manages WebSocket connections:

```typescript
class WebSocketHandler {
  private sessions: Map<WebSocket, WebsocketSession>;

  async handleMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);

    switch (data.type) {
      case "session-update":
        // Validate and broadcast to other clients
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
    }
  }

  broadcast(message: object, exclude?: WebSocket) {
    for (const [ws] of this.sessions) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}
```

### Update Flow

```
Client A edits code
       │
       ▼
┌─────────────────┐
│  Durable Object │
│  (Code class)   │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │  Broadcast │
    └────┬───────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Client B   Client C
(updates)  (updates)
```

---

## Deployment

### Cloudflare Workers

Workers are deployed via Wrangler:

```bash
# Development
yarn dev        # Local development
yarn dev:remote # With remote DO binding

# Production
yarn deploy:prod
```

### wrangler.toml Configuration

```toml
name = "testing-spike-land"
main = "src/cf-workers.ts"

[durable_objects]
bindings = [
  { name = "CODE", class_name = "Code" },
]

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "spike-land-assets"
```

### Environment Variables

```bash
# .dev.vars for local development
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
```

### CI/CD Pipeline

```yaml
# GitHub Actions
- Run tests (yarn test:api)
- Type check (yarn types:check)
- Lint (yarn lint)
- Deploy to Cloudflare (wrangler deploy)
```

---

## Security Considerations

### Authentication

- JWT tokens for user sessions
- API key validation for AI endpoints

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://esm.sh 'unsafe-eval' 'unsafe-inline';
  ...
">
```

### Input Validation

- MCP tools validate all parameters
- Code sanitization before storage
- Rate limiting on write operations

---

## Related Documentation

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) - Agent usage guide
- [MCP_TOOLS.md](./MCP_TOOLS.md) - MCP tool reference
- [TRANSPILATION_PIPELINE.md](./TRANSPILATION_PIPELINE.md) - Code transformation
- [README.md](../README.md) - Package-specific setup
