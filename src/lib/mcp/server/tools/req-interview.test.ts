import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerReqInterviewTools, _clearInterviews } from "./req-interview";

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

function createMockRegistry() {
  const tools = new Map<
    string,
    { handler: (...args: unknown[]) => Promise<ToolResult>; inputSchema: Record<string, unknown> }
  >();

  return {
    tools,
    register: vi.fn(
      ({
        name,
        handler,
        inputSchema,
      }: {
        name: string;
        handler: (...args: unknown[]) => Promise<ToolResult>;
        inputSchema: Record<string, unknown>;
      }) => {
        tools.set(name, { handler, inputSchema });
      },
    ),
  };
}

function getText(result: ToolResult): string {
  return result.content[0]?.text ?? "";
}

function isError(result: ToolResult): boolean {
  return result.isError === true;
}

describe("req-interview tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    _clearInterviews();
    registry = createMockRegistry();
    registerReqInterviewTools(
      registry as unknown as Parameters<typeof registerReqInterviewTools>[0],
      userId,
    );
  });

  it("should register 3 req-interview tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.tools.has("interview_start")).toBe(true);
    expect(registry.tools.has("interview_submit")).toBe(true);
    expect(registry.tools.has("interview_generate_spec")).toBe(true);
  });

  describe("interview_start", () => {
    it("creates an interview with 7 questions and returns interview_id", async () => {
      const handler = registry.tools.get("interview_start")!.handler;
      const result = await handler({
        project_name: "My Project",
        initial_description: "A widget builder",
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Interview started");
      expect(text).toContain("My Project");
      expect(text).toContain("A widget builder");
      expect(text).toContain("[problem]");
      expect(text).toContain("[data]");
      expect(text).toContain("[user_flow]");
      expect(text).toContain("[constraints]");
      expect(text).toContain("[failure]");
      expect(text).toContain("[verification]");
      expect(text).toContain("[explainability]");
      expect(text).toContain("Questions (7)");
    });
  });

  describe("interview_submit", () => {
    it("records answers and shows remaining questions", async () => {
      // Start an interview
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Test",
        initial_description: "Testing",
      });
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      const interviewId = idMatch![1]!;

      // Submit 4 answers
      const submitHandler = registry.tools.get("interview_submit")!.handler;
      const result = await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "problem", answer: "We need faster builds" },
          { question_id: "data", answer: "PostgreSQL is source of truth" },
          { question_id: "user_flow", answer: "Step 1: Open app\nStep 2: Click build" },
          { question_id: "constraints", answer: "API must not change" },
        ],
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Answered:** 4/7");
      expect(text).toContain("Remaining:** 3");
      expect(text).toContain("Complete:** false");
      expect(text).toContain("[failure]");
      expect(text).toContain("[verification]");
      expect(text).toContain("[explainability]");
    });

    it("marks interview complete when all 7 answered", async () => {
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Test",
        initial_description: "Testing",
      });
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      const interviewId = idMatch![1]!;

      const submitHandler = registry.tools.get("interview_submit")!.handler;

      // Submit first batch
      await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "problem", answer: "Problem answer" },
          { question_id: "data", answer: "Data answer" },
          { question_id: "user_flow", answer: "Flow answer" },
          { question_id: "constraints", answer: "Constraints answer" },
        ],
      });

      // Submit remaining
      const result = await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "failure", answer: "Failure answer" },
          { question_id: "verification", answer: "Verification answer" },
          { question_id: "explainability", answer: "Explainability answer" },
        ],
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Answered:** 7/7");
      expect(text).toContain("Remaining:** 0");
      expect(text).toContain("Complete:** true");
      expect(text).toContain("interview_generate_spec");
    });

    it("returns error for non-existent interview", async () => {
      const submitHandler = registry.tools.get("interview_submit")!.handler;
      const result = await submitHandler({
        interview_id: "nonexistent-id",
        answers: [{ question_id: "problem", answer: "answer" }],
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });

    it("returns error for invalid question_id", async () => {
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Test",
        initial_description: "Testing",
      });
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      const interviewId = idMatch![1]!;

      const submitHandler = registry.tools.get("interview_submit")!.handler;
      const result = await submitHandler({
        interview_id: interviewId,
        answers: [{ question_id: "invalid_question", answer: "answer" }],
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("Invalid question ID");
      expect(getText(result)).toContain("invalid_question");
    });
  });

  describe("interview_generate_spec", () => {
    it("generates structured spec from completed interview", async () => {
      // Start interview
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Widget Builder",
        initial_description: "Build widgets",
      });
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      const interviewId = idMatch![1]!;

      // Answer all 7 questions
      const submitHandler = registry.tools.get("interview_submit")!.handler;
      await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "problem", answer: "Users cannot build widgets efficiently" },
          { question_id: "data", answer: "Widget table in PostgreSQL" },
          { question_id: "user_flow", answer: "Open dashboard\nSelect template\nCustomize widget\nSave and deploy" },
          { question_id: "constraints", answer: "Existing API endpoints must not change" },
          { question_id: "failure", answer: "Show error toast on network failure" },
          { question_id: "verification", answer: "Unit tests for builder logic, E2E for full flow" },
          { question_id: "explainability", answer: "Yes, it follows standard CRUD patterns" },
        ],
      });

      // Generate spec
      const genHandler = registry.tools.get("interview_generate_spec")!.handler;
      const result = await genHandler({ interview_id: interviewId });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("# Specification: Widget Builder");
      expect(text).toContain("## Problem Statement");
      expect(text).toContain("Users cannot build widgets efficiently");
      expect(text).toContain("## Data Sources");
      expect(text).toContain("Widget table in PostgreSQL");
      expect(text).toContain("## User Flows");
      expect(text).toContain("Open dashboard");
      expect(text).toContain("## Constraints");
      expect(text).toContain("## Failure Modes");
      expect(text).toContain("## Test Plan");
      expect(text).toContain("## Explainability");
      expect(text).toContain("## Decomposed Tasks (4)");
      expect(text).toContain("1. Open dashboard");
      expect(text).toContain("2. Select template");
      expect(text).toContain("3. Customize widget");
      expect(text).toContain("4. Save and deploy");
    });

    it("returns error for incomplete interview", async () => {
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Test",
        initial_description: "Testing",
      });
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      const interviewId = idMatch![1]!;

      // Only answer 2 questions
      const submitHandler = registry.tools.get("interview_submit")!.handler;
      await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "problem", answer: "Problem" },
          { question_id: "data", answer: "Data" },
        ],
      });

      const genHandler = registry.tools.get("interview_generate_spec")!.handler;
      const result = await genHandler({ interview_id: interviewId });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("incomplete");
      expect(getText(result)).toContain("user_flow");
      expect(getText(result)).toContain("constraints");
      expect(getText(result)).toContain("failure");
      expect(getText(result)).toContain("verification");
      expect(getText(result)).toContain("explainability");
    });

    it("returns error for non-existent interview", async () => {
      const genHandler = registry.tools.get("interview_generate_spec")!.handler;
      const result = await genHandler({ interview_id: "nonexistent" });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });
  });

  describe("full lifecycle", () => {
    it("start -> partial submit -> remaining submit -> generate spec", async () => {
      // Step 1: Start
      const startHandler = registry.tools.get("interview_start")!.handler;
      const startResult = await startHandler({
        project_name: "Auth Service",
        initial_description: "OAuth2 authentication service",
      });
      expect(isError(startResult)).toBe(false);
      const idMatch = getText(startResult).match(/`([0-9a-f-]{36})`/);
      expect(idMatch).not.toBeNull();
      const interviewId = idMatch![1]!;

      // Step 2: Submit first 4 answers
      const submitHandler = registry.tools.get("interview_submit")!.handler;
      const partial = await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "problem", answer: "No centralized auth" },
          { question_id: "data", answer: "User table, session store" },
          { question_id: "user_flow", answer: "Login page\nEnter credentials\nRedirect to dashboard" },
          { question_id: "constraints", answer: "Existing JWT tokens must remain valid" },
        ],
      });
      expect(getText(partial)).toContain("Answered:** 4/7");
      expect(getText(partial)).toContain("Remaining:** 3");

      // Step 3: Submit remaining 3 answers
      const complete = await submitHandler({
        interview_id: interviewId,
        answers: [
          { question_id: "failure", answer: "Return 401, redirect to login" },
          { question_id: "verification", answer: "Unit tests for token validation" },
          { question_id: "explainability", answer: "Standard OAuth2 flow" },
        ],
      });
      expect(getText(complete)).toContain("Complete:** true");

      // Step 4: Generate spec
      const genHandler = registry.tools.get("interview_generate_spec")!.handler;
      const spec = await genHandler({ interview_id: interviewId });
      expect(isError(spec)).toBe(false);
      expect(getText(spec)).toContain("# Specification: Auth Service");
      expect(getText(spec)).toContain("No centralized auth");
      expect(getText(spec)).toContain("Decomposed Tasks (3)");
      expect(getText(spec)).toContain("Login page");
    });
  });
});
