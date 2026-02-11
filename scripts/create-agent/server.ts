/**
 * Create Agent Server — "Spike"
 *
 * Generates app code via Claude Code OAuth token (Max subscription).
 * Uses stealth mode headers matching pi-ai/Claude Code exactly.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env["CREATE_AGENT_PORT"] ?? "4892", 10);
const OAUTH_TOKEN = process.env["CLAUDE_CODE_OAUTH_TOKEN"];
const AGENT_NAME = "Spike";
const CLAUDE_MODEL = "claude-opus-4-6";
const AGENT_SECRET = process.env["CREATE_AGENT_SECRET"] ?? "spike-create-2026";

if (!OAUTH_TOKEN) {
  console.error("CLAUDE_CODE_OAUTH_TOKEN is required");
  process.exit(1);
}

const SYSTEM_PROMPT = `You are an expert React developer building polished, production-quality micro-apps.

## RUNTIME ENVIRONMENT
- React 19 with JSX runtime
- Tailwind CSS 4 (all utility classes available)
- Component receives optional \`width\` and \`height\` props (number, pixels)
- npm packages load from CDN automatically
- Component must be DEFAULT EXPORT
- Light theme by default

## SHADCN/UI DESIGN SYSTEM (import from "@/components/ui/...")
Available: Button, Card, Input, Label, Badge, Dialog, Tabs, Select, Tooltip, Alert, Separator, ScrollArea, Skeleton, DropdownMenu, Sheet, Progress

## PRE-LOADED LIBRARIES
- react (useState, useEffect, useCallback, useMemo, useRef, useReducer)
- framer-motion (motion, AnimatePresence)
- lucide-react (icons)
- clsx, tailwind-merge (via @/lib/utils cn())

## CDN LIBRARIES
- date-fns, zustand, sonner, recharts, react-hook-form, zod, three, @dnd-kit/core, @dnd-kit/sortable, roughjs, howler, react-markdown, canvas-confetti

## CODE RULES
1. Use shadcn/ui components over raw HTML
2. Never call hooks conditionally
3. Handle edge cases: empty, loading, error states
4. Use semantic colors: text-foreground, bg-background, bg-card
5. Responsive design with sm:, md:, lg: classes
6. Single default export
7. No inline styles — Tailwind only`;

function buildUserPrompt(topic: string): string {
  return `Build an interactive app for: "/create/${topic}"

Interpret this path as user intent. Create a polished, fully functional micro-app.

Respond with JSON: { "title": "...", "description": "...", "code": "...", "relatedApps": ["path1", "path2", ...] }
- code: raw string (no markdown fences), single default-exported React component
- relatedApps: 3-5 related paths without "/create/" prefix`;
}

async function handleGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (req.headers.authorization !== `Bearer ${AGENT_SECRET}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  let body = "";
  for await (const chunk of req) { body += chunk; }

  let path: string[];
  try {
    const parsed = JSON.parse(body) as { path: unknown };
    if (!Array.isArray(parsed.path) || parsed.path.length === 0) throw new Error("Invalid path");
    path = parsed.path as string[];
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
    return;
  }

  const topic = path.join("/");
  console.log(`[${new Date().toISOString()}] Generating app: ${topic}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: CLAUDE_MODEL })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Claude Opus 4.6..." })}\n\n`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "Authorization": `Bearer ${OAUTH_TOKEN}`,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-beta": "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14,interleaved-thinking-2025-05-14",
        "user-agent": "claude-cli/2.1.2 (external, cli)",
        "x-app": "cli",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 16384,
        stream: true,
        system: [
          { type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." },
          { type: "text", text: SYSTEM_PROMPT },
        ],
        messages: [{ role: "user", content: buildUserPrompt(topic) }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude ${response.status}: ${errText}`);
    }

    // Parse streaming response to collect full text
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as Record<string, unknown>;
          if (event["type"] === "content_block_delta") {
            const delta = event["delta"] as Record<string, unknown> | undefined;
            const chunk = delta?.["text"] as string | undefined;
            if (chunk) text += chunk;
          }
        } catch {
          // skip
        }
      }
    }

    if (!text) throw new Error("Empty response from Claude");

    let appData: { title: string; description: string; code: string; relatedApps: string[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      appData = JSON.parse(jsonMatch[0]) as typeof appData;
    } catch {
      appData = {
        title: path[path.length - 1]?.replace(/-/g, " ") ?? "App",
        description: "Generated application",
        code: text,
        relatedApps: [],
      };
    }

    res.write(`data: ${JSON.stringify({ type: "status", message: "Writing code..." })}\n\n`);
    res.write(`data: ${JSON.stringify({
      type: "complete",
      slug: path.join("/").toLowerCase(),
      url: "",
      title: appData.title,
      description: appData.description,
      code: appData.code,
      relatedApps: appData.relatedApps,
    })}\n\n`);

    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${text.length} chars)`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Generation failed" })}\n\n`);
  }

  res.end();
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    agent: AGENT_NAME,
    model: CLAUDE_MODEL,
    provider: "claude-code-oauth",
    timestamp: new Date().toISOString(),
  }));
}

const server = createServer((req, res) => {
  if (req.url === "/health") { handleHealth(req, res); return; }
  if (req.url === "/generate") { void handleGenerate(req, res); return; }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🤖 Create Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Model: ${CLAUDE_MODEL} via Claude Code OAuth`);
});
