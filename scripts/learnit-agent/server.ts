/**
 * LearnIt Agent Server
 *
 * Local streaming server that generates LearnIt content using AI.
 * Uses Claude (via OAuth token / Claude Max subscription) as primary,
 * falls back to Gemini if Claude is unavailable.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

const PORT = parseInt(process.env["LEARNIT_AGENT_PORT"] ?? "4891", 10);
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const ANTHROPIC_TOKEN = process.env["ANTHROPIC_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_API_KEY"];
const AGENT_NAME = "Spike";
const AGENT_SECRET = process.env["LEARNIT_AGENT_SECRET"] ?? "spike-learnit-2026";
const CLAUDE_CODE_VERSION = "2.1.2";

if (!ANTHROPIC_TOKEN && !GEMINI_API_KEY) {
  console.error("Either ANTHROPIC_OAUTH_TOKEN/ANTHROPIC_API_KEY or GEMINI_API_KEY is required");
  process.exit(1);
}

// Initialize Claude client (stealth mode for OAuth tokens)
let claude: Anthropic | null = null;
const claudeModel = "claude-sonnet-4-20250514";

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

async function generateWithClaude(topic: string, res: ServerResponse): Promise<void> {
  if (!claude) throw new Error("Claude not available");

  res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: claudeModel })}\n\n`);

  const stream = claude.messages.stream({
    model: claudeModel,
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

  if (!title) title = "Topic";
  if (!description) description = `Learn about ${title}`;

  let finalContent = fullContent;
  const firstNewline = fullContent.indexOf("\n");
  if (firstNewline > 0) {
    finalContent = fullContent.substring(firstNewline + 1).trim();
  }

  res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title, description })}\n\n`);
}

async function generateWithGemini(topic: string, res: ServerResponse): Promise<void> {
  if (!gemini) throw new Error("Gemini not available");

  const geminiModel = "gemini-3-flash-preview";
  res.write(`data: ${JSON.stringify({ type: "agent", name: "Gemini Flash", model: geminiModel })}\n\n`);

  const response = await gemini.models.generateContentStream({
    model: geminiModel,
    contents: [{ role: "user", parts: [{ text: buildPrompt(topic) }] }],
    config: {
      maxOutputTokens: 8192,
      temperature: 0.3,
    },
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
  });

  let fullContent = "";
  let title = "";
  let description = "";

  for await (const chunk of response) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
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
  }

  if (!title) title = "Topic";
  if (!description) description = `Learn about ${title}`;

  let finalContent = fullContent;
  const firstNewline = fullContent.indexOf("\n");
  if (firstNewline > 0) {
    finalContent = fullContent.substring(firstNewline + 1).trim();
  }

  res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title, description })}\n\n`);
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

  const topic = path.join(" > ");
  console.log(`[${new Date().toISOString()}] Generating: ${topic}`);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    if (claude) {
      try {
        await generateWithClaude(topic, res);
        console.log(`[${new Date().toISOString()}] Completed with Claude: ${topic}`);
      } catch (claudeError) {
        console.warn(`[${new Date().toISOString()}] Claude failed, falling back to Gemini:`,
          claudeError instanceof Error ? claudeError.message : claudeError);

        if (!gemini) throw claudeError;

        res.write(`data: ${JSON.stringify({ type: "status", message: "Claude unavailable, switching to Gemini..." })}\n\n`);
        await generateWithGemini(topic, res);
        console.log(`[${new Date().toISOString()}] Completed with Gemini (fallback): ${topic}`);
      }
    } else if (gemini) {
      await generateWithGemini(topic, res);
      console.log(`[${new Date().toISOString()}] Completed with Gemini: ${topic}`);
    } else {
      throw new Error("No AI provider available");
    }
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
    providers: { claude: !!claude, gemini: !!gemini },
    timestamp: new Date().toISOString(),
  }));
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
  console.log(`🤖 LearnIt Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Providers: Claude=${!!claude}, Gemini=${!!gemini}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Generate: POST http://localhost:${PORT}/generate`);
});
