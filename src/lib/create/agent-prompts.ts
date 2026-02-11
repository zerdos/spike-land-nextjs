import {
  buildSystemPrompt as buildSkillSystemPrompt,
  buildUserPrompt as buildSkillUserPrompt,
} from "./content-generator";

// Layer 1: Identity — stable across all generations (cacheable)
const AGENT_IDENTITY =
  `You are an expert React developer and the core generation engine for spike.land's app creator.
Your job is to generate complete, self-contained React components that transpile and run correctly on the first attempt.
You learn from your mistakes — pay close attention to the lessons learned section below.`;

// Layer 5: Output specification — stable (cacheable)
const OUTPUT_SPEC = `## OUTPUT FORMAT
You MUST respond with a JSON object. Do NOT wrap it in markdown code fences.

{
  "title": "App Title",
  "description": "A concise 1-sentence description",
  "code": "// Complete React component code as a raw string",
  "relatedApps": ["path/one", "path/two", "path/three"]
}

CRITICAL RULES for the "code" field:
- Must be a raw string value (use \\n for newlines since it's JSON)
- The component MUST have exactly one default export
- All imports must be at the top of the code
- Do NOT wrap the code in markdown fences inside the JSON string
- The JSON must be parseable — escape special characters properly`;

// Layer 5: Fix output specification — stable (cacheable)
const FIX_OUTPUT_SPEC = `## OUTPUT FORMAT
Respond with ONLY the fixed React component code.
Do NOT wrap it in markdown fences or JSON. Just the raw TypeScript/JSX code.

RULES:
- Only fix the specific error mentioned
- Do NOT redesign or restructure the component
- Preserve all existing functionality
- Ensure all imports are correct`;

export interface LearningNote {
  id: string;
  trigger: string;
  lesson: string;
  confidenceScore: number;
}

/**
 * Build the full system prompt for generation.
 *
 * Structure optimized for KV cache hits:
 * - Stable prefix (identity + core prompt + skills + output spec) → cached
 * - Dynamic suffix (learning notes) → computed fresh per request
 */
export function buildAgentSystemPrompt(
  topic: string,
  notes: LearningNote[],
): string {
  // Stable prefix: layers 1, 3, 5 (identity + core + output spec)
  const coreWithSkills = buildSkillSystemPrompt(topic);
  const stablePrefix = `${AGENT_IDENTITY}\n\n${coreWithSkills}\n\n${OUTPUT_SPEC}`;

  // Dynamic suffix: layers 2, 4 (learning notes)
  const noteBlock = formatNotes(notes);

  return noteBlock ? `${stablePrefix}\n\n${noteBlock}` : stablePrefix;
}

/**
 * Build the user prompt for generation.
 * Reuses the existing skill-aware user prompt from content-generator.
 */
export function buildAgentUserPrompt(path: string[]): string {
  const topic = path.join("/");
  return buildSkillUserPrompt(topic);
}

/**
 * Build the system prompt for fix attempts.
 * Uses a lighter identity focused on debugging + the same skill context.
 */
export function buildFixSystemPrompt(
  topic: string,
  notes: LearningNote[],
): string {
  const coreWithSkills = buildSkillSystemPrompt(topic);
  const noteBlock = formatNotes(notes);
  const base =
    `You are an expert React/TypeScript debugger. Fix transpilation errors precisely.\n\n${coreWithSkills}\n\n${FIX_OUTPUT_SPEC}`;
  return noteBlock ? `${base}\n\n${noteBlock}` : base;
}

/**
 * Build the user prompt for fix attempts.
 * Includes the failing code, error message, and history of previous errors.
 */
export function buildFixUserPrompt(
  code: string,
  error: string,
  previousErrors: Array<{ error: string; iteration: number }>,
): string {
  const historyBlock = previousErrors.length > 0
    ? `\n\nPrevious errors in this session:\n${
      previousErrors
        .map((e) => `- Attempt ${e.iteration + 1}: ${e.error.slice(0, 200)}`)
        .join("\n")
    }`
    : "";

  return `The following React component failed transpilation. Fix it.

ERROR: ${error}
${historyBlock}

CURRENT CODE:
${code}

Return ONLY the fixed code. No explanations, no markdown fences.`;
}

/**
 * Format learning notes for inclusion in the system prompt.
 * Sorted by confidence score, capped to fit within ~800 token budget.
 */
function formatNotes(notes: LearningNote[]): string {
  if (notes.length === 0) return "";

  const sorted = [...notes].sort((a, b) => b.confidenceScore - a.confidenceScore);
  const selected = sorted.slice(0, 15); // ~800 tokens max

  return `## Lessons Learned (from previous generations)
Apply these lessons to avoid known issues:

${selected.map((n) => `- **${n.trigger}**: ${n.lesson}`).join("\n")}`;
}

/**
 * System prompt for extracting learning notes from error/fix pairs.
 * Used with Claude Haiku for cost efficiency.
 */
export const NOTE_EXTRACTION_PROMPT =
  `You extract structured learning notes from code errors and their fixes.
Given an error and the code that caused it (plus optionally the fix), produce a JSON object:

{
  "trigger": "short phrase describing when this note applies (e.g., 'framer-motion AnimatePresence')",
  "triggerType": "library" | "pattern" | "error_class" | "component_type",
  "lesson": "concise actionable instruction (e.g., 'Always wrap children in motion.div with exit prop')",
  "libraries": ["library1", "library2"],
  "errorPatterns": ["key error substring"],
  "tags": ["relevant", "tags"]
}

Rules:
- trigger should be 2-5 words, specific enough to match relevant future generations
- lesson should be a direct instruction, under 100 characters
- libraries should list npm package names involved
- errorPatterns should contain distinctive substrings from the error message
- tags should be broad categories (e.g., "animation", "layout", "imports", "types")
- If the error is too generic or not useful as a lesson, respond with: { "skip": true }`;
