/**
 * LearnIt Agent Server — "Spike"
 *
 * Generates LearnIt content via Anthropic SDK.
 * Auth: ANTHROPIC_AUTH_TOKEN > CLAUDE_CODE_OAUTH_TOKEN (OAuth-only)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env["LEARNIT_AGENT_PORT"] ?? "4891", 10);
const AGENT_NAME = "Spike";
const CLAUDE_MODEL = "claude-opus-4-6";
const AGENT_SECRET = process.env["LEARNIT_AGENT_SECRET"] ?? "spike-learnit-2026";

// Auth resolution: ANTHROPIC_AUTH_TOKEN > CLAUDE_CODE_OAUTH_TOKEN (OAuth-only)
const authToken = process.env["ANTHROPIC_AUTH_TOKEN"] ?? process.env["CLAUDE_CODE_OAUTH_TOKEN"];

if (!authToken) {
  console.error("No Anthropic credentials found. Set ANTHROPIC_AUTH_TOKEN or CLAUDE_CODE_OAUTH_TOKEN.");
  process.exit(1);
}

const authMethod = "oauth-token";

const anthropic = new Anthropic({
  apiKey: null,
  authToken,
  defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
});

const SYSTEM_PROMPT = `You are an expert technical educator creating a high-quality, interactive learning wiki called LearnIt.

The content should be:
1. **Beginner-friendly but deep**: targeted at developers learning this specific concept.
2. **Structured**: Broken into clear sections with H2 headings.
3. **Interactive**: Include code examples where relevant.
4. **Interconnected**: Use [[Wiki Link]] syntax to link to related concepts.

Format requirements:
- Start with a brief title and description
- Use ## for section headings
- Ensure code blocks have language tags (e.g. \`\`\`typescript).
- At the end, include a "Related Topics" section with 3-5 [[Wiki Links]] to related concepts.

Begin with the title on the first line (just the title text, no heading markup), followed by a brief description paragraph, then the main content.`;

function buildPrompt(topic: string): string {
  return `Generate a comprehensive tutorial for the topic: "${topic}".`;
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

  const topic = path.join(" > ");
  console.log(`[${new Date().toISOString()}] Generating: ${topic}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: CLAUDE_MODEL })}\n\n`);

  try {
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(topic) }],
    });

    let fullContent = "";
    let title = "";
    let description = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
        fullContent += text;

        if (!title) {
          const firstLine = fullContent.split("\n")[0];
          if (firstLine?.trim()) {
            title = firstLine.trim().replace(/^#*\s*/, "");
          }
        }

        if (!description && fullContent.includes("\n\n")) {
          const parts = fullContent.split("\n\n");
          if (parts[1]?.trim()) {
            description = parts[1].trim().substring(0, 200);
          }
        }

        res.write(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`);
      }
    }

    const finalTitle = title || path[path.length - 1]?.replace(/-/g, " ") || "Topic";
    const finalDesc = description || `Learn about ${finalTitle}`;

    let finalContent = fullContent;
    const firstNewline = fullContent.indexOf("\n");
    if (firstNewline > 0) {
      finalContent = fullContent.substring(firstNewline + 1).trim();
    }

    res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title: finalTitle, description: finalDesc })}\n\n`);
    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${fullContent.length} chars)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    if (message.includes("401") || message.includes("Invalid bearer token")) {
      console.error(`[AUTH] OAuth token may be expired. Update ANTHROPIC_AUTH_TOKEN in .env.local`);
    }
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
  }

  res.end();
}

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    agent: AGENT_NAME,
    model: CLAUDE_MODEL,
    authMethod,
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
  console.log(`LearnIt Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Model: ${CLAUDE_MODEL} via ${authMethod}`);
});
