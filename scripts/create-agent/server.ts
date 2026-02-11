/**
 * Create Agent Server
 *
 * Local streaming server that generates app code using AI.
 * Uses Claude (via OAuth token / Claude Max subscription) as primary,
 * falls back to Gemini if Claude is unavailable.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

const PORT = parseInt(process.env["CREATE_AGENT_PORT"] ?? "4892", 10);
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const ANTHROPIC_TOKEN = process.env["ANTHROPIC_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_API_KEY"];
const AGENT_NAME = "Spike";
const AGENT_SECRET = process.env["CREATE_AGENT_SECRET"] ?? "spike-create-2026";
const CLAUDE_CODE_VERSION = "2.1.2";

if (!ANTHROPIC_TOKEN && !GEMINI_API_KEY) {
  console.error("Either ANTHROPIC_OAUTH_TOKEN/ANTHROPIC_API_KEY or GEMINI_API_KEY is required");
  process.exit(1);
}

// Initialize Claude client (stealth mode for OAuth tokens)
let claude: Anthropic | null = null;
let claudeModel = "claude-sonnet-4-20250514";

if (ANTHROPIC_TOKEN) {
  const isOAuth = ANTHROPIC_TOKEN.includes("sk-ant-oat");
  if (isOAuth) {
    claude = new Anthropic({
      apiKey: "",
      authToken: ANTHROPIC_TOKEN,
      defaultHeaders: {
        "accept": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-beta": "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14",
        "user-agent": `claude-cli/${CLAUDE_CODE_VERSION} (external, cli)`,
        "x-app": "cli",
      },
      dangerouslyAllowBrowser: true,
    });
    console.log("🔑 Claude initialized with OAuth token (stealth mode)");
  } else {
    claude = new Anthropic({ apiKey: ANTHROPIC_TOKEN });
    console.log("🔑 Claude initialized with API key");
  }
}

// Initialize Gemini client (fallback)
let gemini: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  console.log("🔑 Gemini initialized as fallback");
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

async function generateWithClaude(topic: string): Promise<{
  text: string;
  model: string;
}> {
  if (!claude) throw new Error("Claude not available");

  const response = await claude.messages.create({
    model: claudeModel,
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(topic) }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return { text, model: claudeModel };
}

async function generateWithGemini(topic: string): Promise<{
  text: string;
  model: string;
}> {
  if (!gemini) throw new Error("Gemini not available");

  const geminiModel = "gemini-2.5-flash-preview-05-20";
  const response = await gemini.models.generateContent({
    model: geminiModel,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
    config: {
      maxOutputTokens: 32768,
      temperature: 0.5,
      thinkingConfig: { thinkingBudget: 32768 },
    },
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p): p is { text: string } => "text" in p && typeof p.text === "string")
    .map((p) => p.text)
    .join("") ?? "";

  return { text, model: geminiModel };
}

async function handleGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

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
  for await (const chunk of req) {
    body += chunk;
  }

  let path: string[];
  try {
    const parsed = JSON.parse(body) as { path: unknown };
    if (!Array.isArray(parsed.path) || parsed.path.length === 0) {
      throw new Error("Invalid path");
    }
    path = parsed.path as string[];
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
    return;
  }

  const topic = path.join("/");
  console.log(`[${new Date().toISOString()}] Generating app: ${topic}`);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  let usedModel = "unknown";

  try {
    // Try Claude first, fall back to Gemini
    let text: string;

    if (claude) {
      try {
        res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: claudeModel })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Claude..." })}\n\n`);

        const result = await generateWithClaude(topic);
        text = result.text;
        usedModel = result.model;
        console.log(`[${new Date().toISOString()}] Claude succeeded for: ${topic}`);
      } catch (claudeError) {
        console.warn(`[${new Date().toISOString()}] Claude failed, falling back to Gemini:`,
          claudeError instanceof Error ? claudeError.message : claudeError);

        if (!gemini) throw claudeError;

        res.write(`data: ${JSON.stringify({ type: "status", message: "Claude unavailable, switching to Gemini..." })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash-preview-05-20" })}\n\n`);

        const result = await generateWithGemini(topic);
        text = result.text;
        usedModel = result.model;
      }
    } else if (gemini) {
      res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash-preview-05-20" })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "status", message: "Generating with Gemini..." })}\n\n`);

      const result = await generateWithGemini(topic);
      text = result.text;
      usedModel = result.model;
    } else {
      throw new Error("No AI provider available");
    }

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON response
    let appData: { title: string; description: string; code: string; relatedApps: string[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
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

    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        slug: path.join("/").toLowerCase(),
        url: "",
        title: appData.title,
        description: appData.description,
        code: appData.code,
        relatedApps: appData.relatedApps,
      })}\n\n`,
    );

    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${text.length} chars, model: ${usedModel})`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Generation failed" })}\n\n`,
    );
  }

  res.end();
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      agent: AGENT_NAME,
      providers: {
        claude: !!claude,
        gemini: !!gemini,
      },
      timestamp: new Date().toISOString(),
    }),
  );
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    handleHealth(req, res);
    return;
  }
  if (req.url === "/generate") {
    void handleGenerate(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🤖 Create Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Providers: Claude=${!!claude}, Gemini=${!!gemini}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
