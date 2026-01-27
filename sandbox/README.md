# Vercel Sandbox Agent Scripts

This directory contains standalone scripts that run inside Vercel Sandbox VMs for agent execution.

## Architecture

When `AGENT_USE_SANDBOX=true`, the system:

1. Spawns a Vercel Sandbox VM
2. Writes `context.json` with job details
3. Installs `@anthropic-ai/claude-agent-sdk`
4. Runs `agent-executor.js`
5. The executor POSTs results to `/api/agent/sandbox/callback`

## Files

- `package.json` - Minimal dependencies for the sandbox
- `agent-executor.js` - Main entry point, runs Claude Agent SDK
- `codespace-tools.js` - HTTP API client for testing.spike.land

## Testing Locally

```bash
# Create a context file
cat > context.json << 'EOF'
{
  "appId": "test-app",
  "messageId": "test-msg",
  "jobId": "test-job",
  "codespaceId": "your-codespace-id",
  "userMessage": "Change the background color to blue",
  "callbackUrl": "http://localhost:3000/api/agent/sandbox/callback",
  "callbackSecret": "your-secret"
}
EOF

# Install dependencies
npm install

# Set API key and run
ANTHROPIC_API_KEY=your-key node agent-executor.js
```

## Note

These scripts are also embedded in `/src/lib/sandbox/agent-sandbox.ts` as string constants.
The files here are for reference and local testing.
