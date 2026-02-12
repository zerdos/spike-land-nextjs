import { describe, expect, it } from "vitest";
import {
  buildAgentSystemPrompt,
  buildAgentUserPrompt,
  buildFixSystemPrompt,
  buildFixUserPrompt,
  type LearningNote,
  NOTE_EXTRACTION_PROMPT,
} from "./agent-prompts";

describe("buildAgentSystemPrompt", () => {
  it("should include identity, core prompt, and output spec with empty notes", () => {
    const result = buildAgentSystemPrompt("cooking/pasta", []);

    // Should return a SplitPrompt with stablePrefix and dynamicSuffix
    expect(result.stablePrefix).toBeDefined();
    expect(result.full).toBeDefined();

    // Check for identity layer
    expect(result.full).toContain("You are an expert React developer");
    expect(result.full).toContain("spike.land's app creator");

    // Check for output spec (markdown format)
    expect(result.full).toContain("## OUTPUT FORMAT");
    expect(result.full).toContain("TITLE: App Title");
    expect(result.full).toContain("DESCRIPTION:");
    expect(result.full).toContain("RELATED: path/one");
    expect(result.full).toContain("```tsx");
    expect(result.full).toContain("CRITICAL RULES:");

    // Should NOT include notes section
    expect(result.full).not.toContain("## Lessons Learned");
    expect(result.dynamicSuffix).toBe("");
  });

  it("should include formatted notes section when notes are provided", () => {
    const notes: LearningNote[] = [
      {
        id: "note1",
        trigger: "framer-motion AnimatePresence",
        lesson: "Always wrap children in motion.div with exit prop",
        confidenceScore: 0.9,
      },
      {
        id: "note2",
        trigger: "lucide-react imports",
        lesson: "Import only icons actually used in JSX",
        confidenceScore: 0.85,
      },
    ];

    const result = buildAgentSystemPrompt("tools/timer", notes);

    // Check for notes section in full and dynamicSuffix
    expect(result.full).toContain("## Lessons Learned");
    expect(result.full).toContain("Apply these lessons to avoid known issues:");
    expect(result.full).toContain("**framer-motion AnimatePresence**:");
    expect(result.full).toContain("Always wrap children in motion.div with exit prop");
    expect(result.full).toContain("**lucide-react imports**:");
    expect(result.full).toContain("Import only icons actually used in JSX");

    // Dynamic suffix should contain notes
    expect(result.dynamicSuffix).toContain("## Lessons Learned");
    // Stable prefix should NOT contain notes
    expect(result.stablePrefix).not.toContain("## Lessons Learned");
  });

  it("should sort notes by confidence score descending", () => {
    const notes: LearningNote[] = [
      {
        id: "note1",
        trigger: "low-confidence",
        lesson: "Low confidence lesson",
        confidenceScore: 0.3,
      },
      {
        id: "note2",
        trigger: "high-confidence",
        lesson: "High confidence lesson",
        confidenceScore: 0.95,
      },
      {
        id: "note3",
        trigger: "medium-confidence",
        lesson: "Medium confidence lesson",
        confidenceScore: 0.7,
      },
    ];

    const result = buildAgentSystemPrompt("games/chess", notes);

    // High confidence should appear first
    const highIndex = result.full.indexOf("high-confidence");
    const mediumIndex = result.full.indexOf("medium-confidence");
    const lowIndex = result.full.indexOf("low-confidence");

    expect(highIndex).toBeLessThan(mediumIndex);
    expect(mediumIndex).toBeLessThan(lowIndex);
  });

  it("should limit notes by token budget (not a hard count cap)", () => {
    // Create notes with long lessons to exceed the ~800 token budget
    const longLesson = "This is a detailed lesson with enough text to consume many tokens. ".repeat(3);
    const notes: LearningNote[] = Array.from({ length: 20 }, (_, i) => ({
      id: `note${i}`,
      trigger: `trigger-${i}-with-extra-context`,
      lesson: `${longLesson} Specific detail for note ${i}.`,
      confidenceScore: 1 - i * 0.01, // Descending scores
    }));

    const result = buildAgentSystemPrompt("data/charts", notes);

    // Should include some notes but not all 20 (token budget limits)
    const noteMatches = result.full.match(/\*\*trigger-\d+-with-extra-context\*\*/g);
    expect(noteMatches).toBeTruthy();
    expect(noteMatches!.length).toBeLessThan(20);
    expect(noteMatches!.length).toBeGreaterThan(0);

    // First notes should be present (highest confidence)
    expect(result.full).toContain("trigger-0-with-extra-context");
  });

  it("should include skill-matched content from buildSkillSystemPrompt", () => {
    // Test with a topic that matches known skills (e.g., "games" triggers game skills)
    const result = buildAgentSystemPrompt("games/tictactoe", []);

    // Should include core prompt content
    expect(result.full).toContain("React 19");
    expect(result.full).toContain("Tailwind CSS");
    expect(result.full).toContain("shadcn/ui");
  });
});

describe("buildAgentUserPrompt", () => {
  it("should delegate to buildSkillUserPrompt correctly", () => {
    const path = ["cooking", "pasta"];
    const result = buildAgentUserPrompt(path);

    // Should contain the topic joined with /
    expect(result).toContain("cooking/pasta");

    // Should contain standard user prompt content
    expect(result).toContain("Build an interactive app for:");
    expect(result).toContain("/create/cooking/pasta");
    expect(result).toContain("Interpret this path as user intent");
    expect(result).toContain("EXAMPLE RESPONSES");
  });

  it("should handle single-level paths", () => {
    const path = ["calculator"];
    const result = buildAgentUserPrompt(path);

    expect(result).toContain("calculator");
    expect(result).toContain("/create/calculator");
  });

  it("should handle deep paths", () => {
    const path = ["tools", "finance", "mortgage", "calculator"];
    const result = buildAgentUserPrompt(path);

    expect(result).toContain("tools/finance/mortgage/calculator");
  });

  it("should include URL params instruction for relevant topics", () => {
    const path = ["dashboard", "analytics"];
    const result = buildAgentUserPrompt(path);

    // Dashboard/analytics topics should trigger URL params skill
    expect(result).toContain("IMPORTANT:");
    expect(result).toContain("URL search params");
    expect(result).toContain("new URLSearchParams");
  });

  it("should not include URL params instruction for non-relevant topics", () => {
    const path = ["art", "painting"];
    const result = buildAgentUserPrompt(path);

    // Art topics should NOT trigger URL params skill
    expect(result).not.toContain("IMPORTANT:");
    expect(result).not.toContain("URL search params");
  });
});

describe("buildFixSystemPrompt", () => {
  it("should include fix output spec without notes", () => {
    const result = buildFixSystemPrompt("tools/timer", []);

    // Should return a SplitPrompt
    expect(result.stablePrefix).toBeDefined();
    expect(result.full).toBeDefined();

    // Check for fix-specific identity (now using lightweight fix prompt)
    expect(result.full).toContain("You are an expert React/TypeScript debugger");
    expect(result.full).toContain("fix transpilation errors");

    // Check for fix output spec
    expect(result.full).toContain("## OUTPUT FORMAT");
    expect(result.full).toContain("Respond with ONLY the fixed React component code");
    expect(result.full).toContain("Do NOT wrap it in markdown fences or JSON");
    expect(result.full).toContain("Only fix the specific error mentioned");

    // Should NOT include notes section
    expect(result.full).not.toContain("## Lessons Learned");
    expect(result.dynamicSuffix).toBe("");
  });

  it("should include notes section when notes are provided", () => {
    const notes: LearningNote[] = [
      {
        id: "note1",
        trigger: "import error",
        lesson: "Check for missing dependencies",
        confidenceScore: 0.8,
      },
    ];

    const result = buildFixSystemPrompt("games/snake", notes);

    // Check for notes section
    expect(result.full).toContain("## Lessons Learned");
    expect(result.full).toContain("**import error**:");
    expect(result.full).toContain("Check for missing dependencies");
    expect(result.dynamicSuffix).toContain("## Lessons Learned");
  });

  it("should include lightweight fix prompt content", () => {
    const result = buildFixSystemPrompt("charts/analytics", []);

    // Lightweight fix prompt includes environment basics but not full skill catalogue
    expect(result.full).toContain("React 19");
    expect(result.full).toContain("Tailwind CSS");
    expect(result.full).toContain("FIX STRATEGY");
  });

  it("should sort notes by confidence score", () => {
    const notes: LearningNote[] = [
      {
        id: "note1",
        trigger: "low-priority-fix",
        lesson: "Low confidence fix",
        confidenceScore: 0.4,
      },
      {
        id: "note2",
        trigger: "high-priority-fix",
        lesson: "High confidence fix",
        confidenceScore: 0.92,
      },
    ];

    const result = buildFixSystemPrompt("tools/calculator", notes);

    const highIndex = result.full.indexOf("**high-priority-fix**");
    const lowIndex = result.full.indexOf("**low-priority-fix**");

    expect(highIndex).toBeLessThan(lowIndex);
  });
});

describe("buildFixUserPrompt", () => {
  it("should format prompt with no previous errors", () => {
    const code = `import { useState } from "react";
export default function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}`;
    const error = "Unexpected token '<'";
    const previousErrors: Array<{ error: string; iteration: number }> = [];

    const result = buildFixUserPrompt(code, error, previousErrors);

    // Check for main components
    expect(result).toContain("The following React component failed transpilation");
    expect(result).toContain("ERROR: Unexpected token '<'");
    expect(result).toContain("CURRENT CODE:");
    expect(result).toContain(code);
    expect(result).toContain("Return ONLY the fixed code");

    // Should NOT include previous errors section
    expect(result).not.toContain("Previous errors in this session:");
  });

  it("should include previous errors history when provided", () => {
    const code = 'const App = () => <div>Hello</div>';
    const error = "Missing default export";
    const previousErrors = [
      { error: "Import statement missing", iteration: 0 },
      { error: "Syntax error in JSX", iteration: 1 },
    ];

    const result = buildFixUserPrompt(code, error, previousErrors);

    // Check for history block
    expect(result).toContain("Previous errors in this session:");
    expect(result).toContain("Attempt 1: Import statement missing");
    expect(result).toContain("Attempt 2: Syntax error in JSX");
  });

  it("should truncate long previous errors to 200 characters", () => {
    const longError = "A".repeat(300);
    const code = "const App = () => <div>Test</div>";
    const error = "Current error";
    const previousErrors = [
      { error: longError, iteration: 0 },
    ];

    const result = buildFixUserPrompt(code, error, previousErrors);

    // Check that error is truncated
    const errorMatch = result.match(/Attempt 1: (A+)/);
    expect(errorMatch).toBeTruthy();
    expect(errorMatch?.[1]?.length).toBeLessThanOrEqual(200);
  });

  it("should handle multiple previous errors with correct iteration numbers", () => {
    const code = "const App = () => null";
    const error = "Final error";
    const previousErrors = [
      { error: "First error", iteration: 0 },
      { error: "Second error", iteration: 1 },
      { error: "Third error", iteration: 2 },
    ];

    const result = buildFixUserPrompt(code, error, previousErrors);

    expect(result).toContain("Attempt 1: First error");
    expect(result).toContain("Attempt 2: Second error");
    expect(result).toContain("Attempt 3: Third error");
  });

  it("should include all required sections in correct order", () => {
    const code = "const App = () => <div>Test</div>";
    const error = "Test error";
    const previousErrors = [{ error: "Previous", iteration: 0 }];

    const result = buildFixUserPrompt(code, error, previousErrors);

    const sections = [
      "The following React component failed transpilation",
      "ERROR: Test error",
      "Previous errors in this session:",
      "CURRENT CODE:",
      "Return ONLY the fixed code",
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = result.indexOf(section);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});

describe("NOTE_EXTRACTION_PROMPT", () => {
  it("should be a non-empty string", () => {
    expect(NOTE_EXTRACTION_PROMPT).toBeTruthy();
    expect(typeof NOTE_EXTRACTION_PROMPT).toBe("string");
    expect(NOTE_EXTRACTION_PROMPT.length).toBeGreaterThan(0);
  });

  it("should contain required JSON structure documentation", () => {
    expect(NOTE_EXTRACTION_PROMPT).toContain("trigger");
    expect(NOTE_EXTRACTION_PROMPT).toContain("triggerType");
    expect(NOTE_EXTRACTION_PROMPT).toContain("lesson");
    expect(NOTE_EXTRACTION_PROMPT).toContain("libraries");
    expect(NOTE_EXTRACTION_PROMPT).toContain("errorPatterns");
    expect(NOTE_EXTRACTION_PROMPT).toContain("tags");
  });

  it("should describe trigger types", () => {
    expect(NOTE_EXTRACTION_PROMPT).toContain("library");
    expect(NOTE_EXTRACTION_PROMPT).toContain("pattern");
    expect(NOTE_EXTRACTION_PROMPT).toContain("error_class");
    expect(NOTE_EXTRACTION_PROMPT).toContain("component_type");
  });

  it("should contain rules for extraction", () => {
    expect(NOTE_EXTRACTION_PROMPT).toContain("Rules:");
    expect(NOTE_EXTRACTION_PROMPT).toContain("2-5 words");
    expect(NOTE_EXTRACTION_PROMPT).toContain("under 100 characters");
    expect(NOTE_EXTRACTION_PROMPT).toContain('{ "skip": true }');
  });

  it("should describe the purpose", () => {
    expect(NOTE_EXTRACTION_PROMPT).toContain("extract");
    expect(NOTE_EXTRACTION_PROMPT).toContain("learning notes");
    expect(NOTE_EXTRACTION_PROMPT).toContain("error");
  });
});

describe("LearningNote interface", () => {
  it("should accept valid learning note objects", () => {
    const validNote: LearningNote = {
      id: "test-id",
      trigger: "test trigger",
      lesson: "test lesson",
      confidenceScore: 0.85,
    };

    // If this compiles without TypeScript errors, the interface is correctly defined
    expect(validNote.id).toBe("test-id");
    expect(validNote.trigger).toBe("test trigger");
    expect(validNote.lesson).toBe("test lesson");
    expect(validNote.confidenceScore).toBe(0.85);
  });
});
