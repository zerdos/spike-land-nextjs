/**
 * LearnIt Agent Server — "Spike"
 *
 * Generates LearnIt content via Claude Code CLI (Claude Max subscription).
 * No API keys needed — uses the locally authenticated claude CLI.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";

const PORT = parseInt(process.env["LEARNIT_AGENT_PORT"] ?? "4891", 10);
const CLAUDE_PATH = process.env["CLAUDE_PATH"] ?? "/opt/homebrew/bin/claude";
const CLAUDE_MODEL = "claude-opus-4-6";
const AGENT_NAME = "Spike";
const AGENT_SECRET = process.env["LEARNIT_AGENT_SECRET"] ?? "spike-learnit-2026";

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
  return `${SYSTEM_PROMPT}\n\nGenerate a comprehensive tutorial for the topic: "${topic}".`;
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

    // Timeout after 120s
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

  const topic = path.join(" > ");
  console.log(`[${new Date().toISOString()}] Generating: ${topic}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "agent", name: AGENT_NAME, model: CLAUDE_MODEL })}\n\n`);

  try {
    const fullContent = await generateWithClaude(buildPrompt(topic));

    if (!fullContent.trim()) throw new Error("Empty response from Claude");

    let title = "";
    let description = "";

    const firstLine = fullContent.split("\n")[0];
    if (firstLine?.trim()) {
      title = firstLine.trim().replace(/^#*\s*/, "");
    }

    if (fullContent.includes("\n\n")) {
      const parts = fullContent.split("\n\n");
      if (parts[1]?.trim()) {
        description = parts[1].trim().substring(0, 200);
      }
    }

    const finalTitle = title || path[path.length - 1]?.replace(/-/g, " ") || "Topic";
    const finalDesc = description || `Learn about ${finalTitle}`;

    let finalContent = fullContent;
    const firstNewline = fullContent.indexOf("\n");
    if (firstNewline > 0) {
      finalContent = fullContent.substring(firstNewline + 1).trim();
    }

    // Send as chunks for SSE compatibility
    const chunkSize = 200;
    for (let i = 0; i < finalContent.length; i += chunkSize) {
      const chunk = finalContent.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "complete", content: finalContent, title: finalTitle, description: finalDesc })}\n\n`);
    console.log(`[${new Date().toISOString()}] Completed: ${topic} (${fullContent.length} chars, ${CLAUDE_MODEL})`);
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
  console.log(`🤖 LearnIt Agent (${AGENT_NAME}) listening on http://localhost:${PORT}`);
  console.log(`   Model: ${CLAUDE_MODEL} via Claude CLI (Max subscription)`);
});
