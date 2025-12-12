#!/usr/bin/env node
/**
 * Spike Land MCP Server CLI
 *
 * Usage:
 *   SPIKE_LAND_API_KEY=sk_live_... npx @spike-land/mcp-server
 *
 * Or in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "spike-land": {
 *         "command": "npx",
 *         "args": ["@spike-land/mcp-server"],
 *         "env": { "SPIKE_LAND_API_KEY": "sk_live_..." }
 *       }
 *     }
 *   }
 */

import "../dist/index.js";
