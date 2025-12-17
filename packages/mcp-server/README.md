# @spike-npm-land/mcp-server

MCP (Model Context Protocol) server for Spike Land image generation and
modification. Use this server to generate and modify images with AI directly
from Claude Desktop or Claude Code.

## Installation

```bash
npx @spike-npm-land/mcp-server
```

Or install globally:

```bash
npm install -g @spike-npm-land/mcp-server
```

## Setup

### 1. Get an API Key

1. Sign in at [spike.land](https://spike.land)
2. Go to [Settings > API Keys](https://spike.land/settings)
3. Click "Create API Key"
4. Copy your key (starts with `sk_live_`)

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

- **macOS**: `~/.config/claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

### 3. Configure Claude Code

Add to your project's `.claude/settings.json` or global
`~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

Or via CLI:

```bash
claude mcp add spike-land -- npx @spike-npm-land/mcp-server
```

## Available Tools

### generate_image

Generate a new image from a text prompt.

**Parameters:**

- `prompt` (required): Text description of the image to generate
- `tier` (optional): Quality tier - `TIER_1K` (1024px), `TIER_2K` (2048px), or
  `TIER_4K` (4096px)
- `negative_prompt` (optional): Things to avoid in the generated image
- `wait_for_completion` (optional): Wait for job completion (default: true)

**Example:**

```
Generate an image of a serene mountain landscape at sunset with a calm lake
```

### modify_image

Modify an existing image using a text prompt.

**Parameters:**

- `prompt` (required): Text description of how to modify the image
- `image_url` (optional): URL of the image to modify
- `image_base64` (optional): Base64-encoded image data
- `mime_type` (optional): MIME type of the image (default: image/jpeg)
- `tier` (optional): Quality tier
- `wait_for_completion` (optional): Wait for job completion (default: true)

**Example:**

```
Add a rainbow to this image: [image URL]
```

### check_job

Check the status of an image generation or modification job.

**Parameters:**

- `job_id` (required): The job ID to check

### get_balance

Get your current token balance.

## Token Costs

| Tier    | Resolution | Tokens |
| ------- | ---------- | ------ |
| TIER_1K | 1024px     | 2      |
| TIER_2K | 2048px     | 5      |
| TIER_4K | 4096px     | 10     |

Tokens regenerate automatically (1 per 15 minutes, max 100). You can also
purchase more at [spike.land/settings](https://spike.land/settings).

## Environment Variables

| Variable              | Description                                |
| --------------------- | ------------------------------------------ |
| `SPIKE_LAND_API_KEY`  | Your API key (required)                    |
| `SPIKE_LAND_BASE_URL` | API base URL (default: https://spike.land) |

## Usage Examples

### In Claude Desktop

Simply ask Claude to generate or modify images:

> "Generate an image of a cute robot gardening in a futuristic greenhouse"

> "Take this image and add a sunset sky behind the mountains"

### In Claude Code

Use the MCP tools in your development workflow:

> "Generate a placeholder hero image for the landing page - something abstract
> and modern"

> "Create a logo concept for my project - minimalist, uses geometric shapes"

## Testing

You can test the API directly in your browser at
[spike.land/apps/pixel/mcp-tools](https://spike.land/apps/pixel/mcp-tools).

## Support

- [Documentation](https://spike.land/apps/pixel/mcp-tools)
- [Report Issues](https://github.com/zerdos/spike-land-nextjs/issues)

## License

MIT
