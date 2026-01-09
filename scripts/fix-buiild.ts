import { query } from "@anthropic-ai/claude-agent-sdk";

for await (
  const message of query({
    prompt: "Find and fix the bug in auth.py",
    options: { allowedTools: ["Read", "Edit", "Bash"] },
  })
) {
  console.log(message); // Claude reads the file, finds the bug, edits it
}
