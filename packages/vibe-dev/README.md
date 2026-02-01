# vibe-dev

Lightweight Docker-based development workflow for vibe-coded apps.

## Features

- 📁 Downloads agent files locally for fast reads
- 🔄 Auto-syncs code changes to testing.spike.land
- ♻️ Auto-reloads preview iframe when files change
- 🤖 Claude Code integration via MCP tools
- 📬 Redis queue polling for agent message processing
- 🐳 Runs in Docker for isolation and portability

## Quick Start

```bash
# 1. Start the dev container
cd packages/vibe-dev
docker compose up -d

# 2. Open a codespace for development
docker compose exec vibe-dev yarn dev --codespace my-app

# 3. Edit files in ./live/ directory
# Changes auto-sync to https://testing.spike.land/live/my-app
```

## Environment Variables

Create a `.env` file:

```bash
# Required: Claude Code OAuth token (from spike-land-nextjs/.env.local)
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-xxx

# Required: spike.land API key (for MCP tools)
SPIKE_LAND_API_KEY=your-spike-land-key

# Optional: Custom testing.spike.land URL
TESTING_SPIKE_LAND_URL=https://testing.spike.land
```

## MCP Tools Available

### spike-land MCP

- `codespace_update`: Create/update React code in codespaces
- `codespace_run`: Transpile and run code
- `codespace_screenshot`: Get a screenshot of the app
- `codespace_link`: Get shareable link

### Playwright MCP

- Browser automation for testing and screenshots
- Navigate, click, type, screenshot
- Full Chromium support

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Container                   │
│  ┌─────────────┐     ┌──────────────┐              │
│  │ Claude Code │────▶│ vibe-dev CLI │              │
│  │    (MCP)    │     │              │              │
│  └─────────────┘     └──────┬───────┘              │
│                             │                       │
│  ┌─────────────┐     ┌──────▼───────┐              │
│  │ Local Files │◀───▶│ File Watcher │              │
│  │  ./live/    │     │  (chokidar)  │              │
│  └─────────────┘     └──────┬───────┘              │
└─────────────────────────────│───────────────────────┘
                              │ PUT /live/{id}/api/code
                              ▼
                    ┌─────────────────────┐
                    │ testing.spike.land  │
                    │ (Cloudflare Worker) │
                    │         │           │
                    │    WebSocket        │
                    │    Broadcast        │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Preview Iframe    │
                    │   (auto-reload)     │
                    └─────────────────────┘
```

## CLI Commands

### `yarn dev`

Start the development watcher.

```bash
# Start with existing codespace
yarn dev --codespace my-app

# Create new codespace
yarn dev --codespace my-new-app --create

# Watch multiple codespaces
yarn dev --codespace app1 --codespace app2
```

### `yarn sync`

One-shot sync (no watching).

```bash
# Sync local to remote
yarn sync push --codespace my-app

# Sync remote to local
yarn sync pull --codespace my-app
```

### `yarn poll`

Poll Redis queue and process agent messages. Replaces `scripts/agent-poll.ts`.

```bash
# Start continuous polling (runs in Docker)
docker compose up vibe-agent

# Run once and exit
yarn poll --once

# Show queue statistics
yarn poll --stats

# Custom polling interval
yarn poll --interval 10000
```

### `yarn claude`

Run Claude Code with MCP tools configured.

```bash
# Interactive mode
yarn claude

# One-shot command
yarn claude -p "Update the button color to blue"
```

## File Structure

```
packages/vibe-dev/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── watcher.ts       # File watcher
│   ├── sync.ts          # Sync to testing.spike.land
│   ├── agent.ts         # Agent processing logic
│   ├── api.ts           # API client for spike.land
│   └── redis.ts         # Redis client for queue polling
└── live/                # Local code files (volume mount)
    ├── my-app.tsx
    └── my-app.meta.json
```

## Integration with Chat UI

When running inside the chat workflow:

1. User sends a message in /my-apps
2. Backend queues the message
3. vibe-dev container picks up the message
4. Claude Code edits the local file
5. Watcher syncs to testing.spike.land
6. WebSocket broadcast triggers iframe reload
7. User sees live preview update

## Development

```bash
# Build the package
yarn build

# Run tests
yarn test

# Build Docker image
docker compose build
```
