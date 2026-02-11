/**
 * LearnIt Agent Server — "Spike"
 *
 * Local streaming server that generates LearnIt content using Claude.
 * Exposed via Cloudflare Tunnel so Vercel can call it.
 * Falls back gracefully — if this server is down, Vercel uses Gemini directly.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env.LEARNIT_AGENT_PORT ?? "4891", 10);
const ANTHROPIC_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
const AGENT_NAME = "Spike";
const AGENT_MODEL = "claude-opus-4-6";
const AGENT_SECRET = process.env.LEARNIT_AGENT_SECRET ?? "spike-learnit-2026";

if (!ANTHROPIC_TOKEN) {
  console.error("CLAUDE_CODE_OAUTH_TOKEN is required");
  process.exit(1);
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function buildPrompt(topic: string): string {
  return `You are an expert technical educator creating a high-quality, interactive learning wiki called LearnIt.

Your task is to generate a comprehensive tutorial for the topic: "${topic}".

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
}

async function handleGenerate(req: IncomingMessage, res: ServerResponse) {
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
    const parsed = JSON.parse(body);
    path = parsed.path;
    if (!Array.isArray(path) || path.length === 0) {
      throw new Error("Invalid path");
    }
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
    return;
  }

  const topic = path.join(" > ");
  const prompt = buildPrompt(topic);

  console.log(`[${new Date().toISOString()}] Generating: ${topic}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // Send agent identity
  res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: AGENT_MODEL })}\n\n`);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANTHROPIC_TOKEN}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        max_tokens: 8192,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status} ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let title = "";
    let description = "";

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
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.text) {
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
        } catch {
          // skip unparseable lines
        }
      }
    }

    if (!title) title = path[path.length - 1]?.replace(/-/g, " ") ?? "Topic";
    if (!description) description = `Learn about ${title}`;

    let finalContent = fullContent;
    const firstNewline = fullContent.indexOf("\n");
    if (firstNewline > 0) {
      finalContent = fullContent.substring(firstNewline + 1).trim();
    }

    res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title, description })}\n\n`);
    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${fullContent.length} chars)`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Generation failed" })}\n\n`);
  }

  res.end();
}

async function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", agent: AGENT_NAME, model: AGENT_MODEL, timestamp: new Date().toISOString() }));
}

const server = createServer((req, res) => {
  if (req.url === "/health") return handleHealth(req, res);
  if (req.url === "/generate") return handleGenerate(req, res);

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🤖 LearnIt Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Model: ${AGENT_MODEL}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
