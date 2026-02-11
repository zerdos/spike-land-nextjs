/**
 * LearnIt Agent Server — "Spike"
 *
 * Local streaming server that generates LearnIt content using Claude (Opus 4.6).
 * Uses OAuth stealth mode for Claude Max subscription.
 * Falls back to Gemini if Claude is unavailable.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env["LEARNIT_AGENT_PORT"] ?? "4891", 10);
const ANTHROPIC_TOKEN = process.env["CLAUDE_CODE_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_OAUTH_TOKEN"];
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const AGENT_NAME = "Spike";
const AGENT_MODEL = "claude-opus-4-6";
const AGENT_SECRET = process.env["LEARNIT_AGENT_SECRET"] ?? "spike-learnit-2026";
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
    // Stealth mode: mimic Claude Code headers for OAuth tokens
    headers["Authorization"] = `Bearer ${ANTHROPIC_TOKEN}`;
    headers["anthropic-beta"] = "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14";
    headers["user-agent"] = `claude-cli/${CLAUDE_CODE_VERSION} (external, cli)`;
    headers["x-app"] = "cli";
  } else {
    headers["x-api-key"] = ANTHROPIC_TOKEN;
  }

  return headers;
}

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

async function streamWithClaude(
  topic: string,
  res: ServerResponse,
): Promise<{ title: string; description: string; content: string }> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: getAnthropicHeaders(),
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: 8192,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(topic) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude ${response.status}: ${errText}`);
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
          const text = event.delta.text as string;
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

  return { title, description, content: fullContent };
}

async function streamWithGemini(
  topic: string,
  res: ServerResponse,
): Promise<{ title: string; description: string; content: string }> {
  // Use Gemini REST API directly (no SDK needed)
  const model = "gemini-2.5-flash-preview-05-20";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildPrompt(topic) }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errText}`);
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

      try {
        const event = JSON.parse(data);
        const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
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
        // skip
      }
    }
  }

  return { title, description, content: fullContent };
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

  const topic = path.join(" > ");
  console.log(`[${new Date().toISOString()}] Generating: ${topic}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    let result: { title: string; description: string; content: string };
    let usedModel = "unknown";

    if (ANTHROPIC_TOKEN) {
      try {
        res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: AGENT_MODEL })}\n\n`);
        result = await streamWithClaude(topic, res);
        usedModel = AGENT_MODEL;
      } catch (claudeErr) {
        console.warn(`[${new Date().toISOString()}] Claude failed:`, (claudeErr as Error).message);
        if (!GEMINI_API_KEY) throw claudeErr;

        res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash" })}\n\n`);
        result = await streamWithGemini(topic, res);
        usedModel = "gemini-2.5-flash";
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: "gemini-2.5-flash" })}\n\n`);
      result = await streamWithGemini(topic, res);
      usedModel = "gemini-2.5-flash";
    }

    const { title, description, content } = result;
    const finalTitle = title || path[path.length - 1]?.replace(/-/g, " ") || "Topic";
    const finalDesc = description || `Learn about ${finalTitle}`;

    let finalContent = content;
    const firstNewline = content.indexOf("\n");
    if (firstNewline > 0) {
      finalContent = content.substring(firstNewline + 1).trim();
    }

    res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title: finalTitle, description: finalDesc })}\n\n`);
    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${content.length} chars, ${usedModel})`);
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
  console.log(`🤖 LearnIt Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Model: ${AGENT_MODEL} (Claude=${!!ANTHROPIC_TOKEN}, Gemini=${!!GEMINI_API_KEY})`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
