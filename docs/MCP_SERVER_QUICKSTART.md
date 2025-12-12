# MCP Server Quick Start Guide

## For Repository Owner: Publishing the Package

**Current Status**: The `@spike-land/mcp-server` package is ready to publish but requires npm credentials.

### One-Time Setup

1. **Install the GitHub Actions workflow** (if not already done):
   ```bash
   cp docs/workflows/publish-mcp-server.yml .github/workflows/
   git add .github/workflows/publish-mcp-server.yml
   git commit -m "chore: Add MCP server publishing workflow"
   git push
   ```

2. **Create npm account and organization**:
   ```bash
   # Visit https://www.npmjs.com/signup
   # Create account or login
   # Create @spike-land organization or request access
   ```

3. **Generate npm access token**:
   ```bash
   # Go to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   # Create "Automation" token
   # Copy the token (npm_...)
   ```

4. **Add token to GitHub Secrets**:
   ```bash
   # Go to: https://github.com/zerdos/spike-land-nextjs/settings/secrets/actions
   # Create new secret:
   #   Name: NPM_TOKEN
   #   Value: <your npm token>
   ```

### Publishing Options

#### Option 1: Automated via Git Tag (Recommended)

```bash
# Publish version 0.1.0
git tag mcp-server-v0.1.0
git push origin mcp-server-v0.1.0

# GitHub Actions will automatically:
# - Build the package
# - Publish to npm
# - Create GitHub release
```

#### Option 2: Manual Workflow Trigger

```bash
# Via GitHub CLI
gh workflow run publish-mcp-server.yml \
  --ref main \
  --field version=0.1.0

# Or via GitHub UI:
# https://github.com/zerdos/spike-land-nextjs/actions/workflows/publish-mcp-server.yml
# Click "Run workflow" and enter version
```

#### Option 3: Local Publishing

```bash
cd packages/mcp-server
npm install
npm run build
npm login
npm publish
```

### Verification

After publishing, test the package:

```bash
# Get API key from https://spike.land/settings
SPIKE_LAND_API_KEY=sk_test_... npx @spike-land/mcp-server

# Should start MCP server without errors
```

## For End Users: Installing and Using

### Prerequisites

1. **Get API Key**:
   - Visit https://spike.land/settings
   - Create new API key
   - Copy the key (starts with `sk_live_...`)

### Installation Methods

#### Method 1: npx (No Installation Required)

```bash
SPIKE_LAND_API_KEY=sk_live_YOUR_KEY npx @spike-land/mcp-server
```

#### Method 2: Global Install

```bash
npm install -g @spike-land/mcp-server
SPIKE_LAND_API_KEY=sk_live_YOUR_KEY spike-mcp
```

### Claude Desktop Configuration

Add to `~/.config/claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_YOUR_KEY"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code Configuration

Add to your Claude Code configuration:

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_YOUR_KEY"
      }
    }
  }
}
```

### Available Tools

Once configured, Claude will have access to these tools:

1. **generate_image**: Create new images from text prompts
   - Tiers: TIER_1K (2 tokens), TIER_2K (5 tokens), TIER_4K (10 tokens)

2. **modify_image**: Modify existing images with text prompts
   - Accepts image URL or base64 data
   - Same tier pricing as generation

3. **check_job**: Check status of generation/modification jobs

4. **get_balance**: Check your current token balance

### Example Usage

Ask Claude:

```
"Generate a landscape image of mountains at sunset using the Spike Land MCP server"

"Modify this image to add a rainbow in the sky"

"Check my Spike Land token balance"
```

## Troubleshooting

### Package Not Found

**Error**: `404 Not Found - @spike-land/mcp-server`

**Solution**: The package hasn't been published yet. Follow the publishing steps above.

### API Key Invalid

**Error**: `Error: Invalid API key`

**Solution**: Get a valid API key from https://spike.land/settings

### Insufficient Tokens

**Error**: `Error: Insufficient token balance`

**Solution**: Purchase more tokens at https://spike.land/settings

### MCP Server Won't Start

**Error**: `SPIKE_LAND_API_KEY environment variable is required`

**Solution**: Ensure the API key is set in your MCP configuration.

## Links

- **Package Registry**: https://www.npmjs.com/package/@spike-land/mcp-server
- **Documentation**: https://spike.land/apps/pixel/mcp-tools
- **API Keys**: https://spike.land/settings
- **Support**: https://github.com/zerdos/spike-land-nextjs/issues
