---
applyTo: "packages/testing.spike.land/**,packages/js.spike.land/**"
---

# Cloudflare Workers Standards

## Runtime Constraints

- **Web APIs only** — no Node.js built-ins (fs, path, crypto from node:)
- Use Web Crypto API instead of `node:crypto`
- Use `fetch()` for HTTP requests (no axios/node-fetch)
- Use `Response`, `Request`, `Headers` from web standards
- Workers have 128MB memory limit and CPU time limits

## Architecture

- `testing.spike.land` — Backend worker with Durable Objects
  - `Code` class is the main Durable Object (chatRoom.ts)
  - Routes in `src/routes/` (live, auth, AI)
  - MCP server in `src/mcp/`
  - Acts as caching proxy for esm.sh via `esm-worker`

- `js.spike.land` — Transpiler worker
  - esbuild-based TypeScript/JSX transpilation
  - Stateless request/response

## Durable Objects

- Use `state.storage` for persistence
- Handle WebSocket connections for real-time features
- Implement `fetch()` handler for HTTP routing
- Use `state.blockConcurrencyWhile()` for initialization

## Testing

- Use `vitest` with miniflare for worker testing
- Run: `yarn test:unit` in the package directory
