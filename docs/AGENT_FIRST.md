# Agent-First Platform

## CEO Decision

> **CEO Decision: Agent-First Platform**
>
> 1. Every UI action MUST have an MCP tool equivalent. No feature ships without MCP coverage.
> 2. Tool descriptions are marketing copy for agents — they must prime correct behavior.
> 3. Reasonable defaults everywhere. If a param can default, it must.
> 4. Every error response includes a Suggestion for recovery.
> 5. Error investigation principle: "Even if the agent made the mistake — what could WE do to prevent it?"
> 6. Agent-exclusive batch operations are a competitive advantage, not an afterthought.
> 7. MCP is the primary API. The web UI is a client of the same capabilities.

## Architecture

The MCP server at `src/lib/mcp/server/` uses progressive disclosure:

- **5 always-on gateway-meta tools** for discovery
- **All other tools are discoverable** via `search_tools` and `enable_category`
- **OAuth 2.1 + API key auth** via `src/lib/mcp/auth.ts`

### Tool Categories

| Category | Description | Tool Count |
|---|---|---|
| `gateway-meta` | Discovery tools (always enabled) | 5 |
| `image` | AI image generation and management | varies |
| `codespace` | Live React app development | 6 |
| `apps` | Full My-Apps lifecycle | 11 |
| `orbit-workspace` | Workspace listing and pulse | 3 |
| `orbit-inbox` | Social media inbox management | 7 |
| `orbit-relay` | AI response draft management | 5 |
| `vault` | Encrypted secret storage | 4 |
| `bootstrap` | One-session workspace setup | 4 |
| `tools` | Dynamic tool registration | varies |

### Error Prevention Strategy

Every tool handler is wrapped with `safeToolCall()` which:

1. Catches all errors
2. Classifies them into structured `McpErrorCode` values
3. Returns a formatted response with:
   - Error code
   - Human-readable message
   - **Suggestion** telling the agent what to do next
   - **Retryable** flag

### Tool Description Priming Rules

1. First sentence = what it does (visible in tool listings)
2. Second sentence = when to use it vs alternatives
3. `WARNING:` prefix for destructive operations
4. Parameter `.describe()` includes format examples and defaults

## Implementation Phases

### Phase 1: Core Platform Parity (Completed)
- 26 new tools across 4 modules
- `apps.ts` — 11 My-Apps tools
- `orbit-workspace.ts` — 3 workspace tools
- `orbit-inbox.ts` — 7 inbox tools
- `orbit-relay.ts` — 5 relay tools
- `tool-helpers.ts` — shared error wrapper and utilities

### Phase 2: Content + Creative (Planned)
- `orbit-calendar.ts` — scheduling and content planning
- `orbit-scout.ts` — competitor monitoring
- `orbit-crisis.ts` — crisis management
- `pixel.ts` — image library management
- `vibe.ts` — content generation
- `settings.ts` — profile and API key management

### Phase 3: Full Coverage (Planned)
- `orbit-boost.ts` — post boosting
- `orbit-connections.ts` — relationship management
- `orbit-ab-testing.ts` — A/B testing
- `orbit-allocator.ts` — budget allocation
- `admin.ts` — admin-tier operations
