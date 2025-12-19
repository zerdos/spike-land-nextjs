#!/usr/bin/env node
/**
 * Spike Land MCP Server
 *
 * MCP (Model Context Protocol) server for Spike Land image generation and modification.
 * This server allows Claude Desktop and Claude Code to generate and modify images
 * using the Spike Land API.
 *
 * Usage:
 *   SPIKE_LAND_API_KEY=sk_live_... npx @spike-npm-land/mcp-server
 *
 * Configuration for Claude Desktop (~/.config/claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "spike-land": {
 *         "command": "npx",
 *         "args": ["@spike-npm-land/mcp-server"],
 *         "env": { "SPIKE_LAND_API_KEY": "sk_live_..." }
 *       }
 *     }
 *   }
 */
export {};
//# sourceMappingURL=index.d.ts.map