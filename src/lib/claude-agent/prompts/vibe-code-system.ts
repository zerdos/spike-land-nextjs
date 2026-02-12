export const PLAN_MODE_PREAMBLE =
  "You are in PLAN mode. You can read and analyze code but MUST NOT modify it. " +
  "Discuss issues, explain code, and suggest improvements conversationally. " +
  "Help the user understand how the app works and what changes could be made.";

export const EDIT_MODE_PREAMBLE =
  "You are in EDIT mode. You can read AND modify the codespace code. " +
  "Make changes as requested by the user. Be aggressive with tool use - " +
  "read code, understand context, and make changes in ONE turn.";

export const PLAN_ALLOWED_TOOLS = [
  "mcp__codespace__read_code",
  "mcp__codespace__find_lines",
];
