/**
 * Create Agent Server
 *
 * Local streaming server that generates app code using AI.
 * Exposed via Cloudflare Tunnel so Vercel can call it.
 * Falls back gracefully — if this server is down, Vercel uses Gemini directly.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { GoogleGenAI } from "@google/genai";

const PORT = parseInt(process.env["CREATE_AGENT_PORT"] ?? "4892", 10);
const API_KEY = process.env["GEMINI_API_KEY"];
const AGENT_NAME = "Spike";
const AGENT_SECRET = process.env["CREATE_AGENT_SECRET"] ?? "spike-create-2026";

if (!API_KEY) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Simplified version of the core prompt from content-generator.ts
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
  // CORS
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

  // Auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${AGENT_SECRET}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // Parse body
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
  const userPrompt = buildUserPrompt(topic);

  console.log(`[${new Date().toISOString()}] Generating app: ${topic}`);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // Send agent identity first
  res.write(
    `data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: "gemini-2.5-flash-preview-05-20" })}\n\n`,
  );

  try {
    res.write(`data: ${JSON.stringify({ type: "status", message: "Initializing app generation..." })}\n\n`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
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

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON response
    let appData: { title: string; description: string; code: string; relatedApps: string[] };
    try {
      // Try to extract JSON from the response (may have markdown fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      appData = JSON.parse(jsonMatch[0]) as typeof appData;
    } catch {
      // If JSON parsing fails, send the raw text as code
      appData = {
        title: path[path.length - 1]?.replace(/-/g, " ") ?? "App",
        description: "Generated application",
        code: text,
        relatedApps: [],
      };
    }

    res.write(`data: ${JSON.stringify({ type: "status", message: "Writing code..." })}\n\n`);

    // Send complete event — the route handler will handle codespace updates
    res.write(
      `data: ${
        JSON.stringify({
          type: "complete",
          slug: path.join("/").toLowerCase(),
          url: "", // Will be filled by route handler
          title: appData.title,
          description: appData.description,
          code: appData.code,
          relatedApps: appData.relatedApps,
        })
      }\n\n`,
    );

    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${text.length} chars)`);
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
    JSON.stringify({ status: "ok", agent: AGENT_NAME, timestamp: new Date().toISOString() }),
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
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
