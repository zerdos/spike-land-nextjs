/**
 * Create Agent Server — "Spike"
 *
 * Local streaming server that generates app code using Claude (Opus 4.6).
 * Uses OAuth stealth mode for Claude Max subscription.
 * Falls back to Gemini if Claude is unavailable.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env["CREATE_AGENT_PORT"] ?? "4892", 10);
const ANTHROPIC_TOKEN = process.env["CLAUDE_CODE_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_OAUTH_TOKEN"];
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const AGENT_NAME = "Spike";
const AGENT_MODEL = "claude-opus-4-6";
const AGENT_SECRET = process.env["CREATE_AGENT_SECRET"] ?? "spike-create-2026";
const CLAUDE_CODE_VERSION = "2.1.2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

if (!ANTHROPIC_TOKEN && !GEMINI_API_KEY) {
  console.error("Either CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_OAUTH_TOKEN or GEMINI_API_KEY is required");
  process.exit(1);
}

function isOAuthToken(token: string): boolean {
  return token.includes("sk-ant-oat");
}

function getAnthropicHeaders(): Record<string, string> {
  if (!ANTHROPIC_TOKEN) return {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };

  if (isOAuthToken(ANTHROPIC_TOKEN)) {
    headers["Authorization"] = `Bearer ${ANTHROPIC_TOKEN}`;
    headers["anthropic-beta"] = "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14";
    headers["user-agent"] = `claude-cli/${CLAUDE_CODE_VERSION} (external, cli)`;
    headers["x-app"] = "cli";
  } else {
    headers["x-api-key"] = ANTHROPIC_TOKEN;
  }

  return headers;
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

async function generateWithClaude(topic: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: getAnthropicHeaders(),
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(topic) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!)
    .join("");
}

async function generateWithGemini(topic: string): Promise<string> {
  const model = "gemini-2.5-flash-preview-05-20";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
      generationConfig: { maxOutputTokens: 32768, temperature: 0.5 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts
    ?.filter((p) => p.text)
    .map((p) => p.text!)
    .join("") ?? "";
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

  try {
    let text: string;
    let usedModel = "unknown";

    if (ANTHROPIC_TOKEN) {
      try {
        res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: AGENT_MODEL })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Claude Opus 4.6..." })}\n\n`);
        text = await generateWithClaude(topic);
        usedModel = AGENT_MODEL;
      } catch (claudeErr) {
        console.warn(`[${new Date().toISOString()}] Claude failed:`, (claudeErr as Error).message);
        if (!GEMINI_API_KEY) throw claudeErr;

        res.write(`data: ${JSON.stringify({ type: "status", message: "Claude unavailable, switching to Gemini..." })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash" })}\n\n`);
        text = await generateWithGemini(topic);
        usedModel = "gemini-2.5-flash";
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash" })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Gemini..." })}\n\n`);
      text = await generateWithGemini(topic);
      usedModel = "gemini-2.5-flash";
    }

    if (!text) throw new Error("Empty response from AI");

    // Parse JSON response
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

    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${text.length} chars, ${usedModel})`);
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
    model: AGENT_MODEL,
    providers: { claude: !!ANTHROPIC_TOKEN, gemini: !!GEMINI_API_KEY },
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
  console.log(`   Model: ${AGENT_MODEL} (Claude=${!!ANTHROPIC_TOKEN}, Gemini=${!!GEMINI_API_KEY})`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
