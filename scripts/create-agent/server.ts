/**
 * Create Agent Server — "Spike"
 *
 * Generates app code via Claude Code CLI (Claude Max subscription).
 * No API keys needed — uses the locally authenticated claude CLI.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";

const PORT = parseInt(process.env["CREATE_AGENT_PORT"] ?? "4892", 10);
const CLAUDE_PATH = process.env["CLAUDE_PATH"] ?? "/opt/homebrew/bin/claude";
const CLAUDE_MODEL = "claude-opus-4-6";
const AGENT_NAME = "Spike";
const AGENT_SECRET = process.env["CREATE_AGENT_SECRET"] ?? "spike-create-2026";

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
  return `${SYSTEM_PROMPT}

Build an interactive app for: "/create/${topic}"

Interpret this path as user intent. Create a polished, fully functional micro-app.

Respond with JSON: { "title": "...", "description": "...", "code": "...", "relatedApps": ["path1", "path2", ...] }
- code: raw string (no markdown fences), single default-exported React component
- relatedApps: 3-5 related paths without "/create/" prefix`;
}

function generateWithClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_PATH, [
      "-p", "--model", CLAUDE_MODEL, "--output-format", "text",
    ], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        HOME: "/Users/z",
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        XDG_CONFIG_HOME: "/Users/z/.config",
        LANG: "en_US.UTF-8",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("close", (code: number | null) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited ${code}: stdout=${stdout.slice(0, 200)} stderr=${stderr.slice(0, 500)}`));
    });

    child.on("error", reject);

    child.stdin.write(prompt);
    child.stdin.end();

    setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Claude CLI timed out after 120s"));
    }, 120_000);
  });
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

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${AGENT_SECRET}`) {
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
  res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Claude Opus 4.6 (Max subscription)..." })}\n\n`);

  try {
    const text = await generateWithClaude(buildUserPrompt(topic));
    if (!text.trim()) throw new Error("Empty response from Claude");

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
    provider: "claude-cli (Max subscription)",
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
  console.log(`   Model: ${CLAUDE_MODEL} via Claude CLI (Max subscription)`);
});
