import { describe, expect, it, vi, beforeEach } from "vitest";
import { arenaGenerateFromPrompt } from "./arena-generator";

const { mockPrismaObj } = vi.hoisted(() => ({
  mockPrismaObj: {
    arenaSubmission: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock all dependencies
vi.mock("@/lib/prisma", () => ({ default: mockPrismaObj }));

vi.mock("@/lib/create/agent-client", () => ({
  callClaude: vi.fn(),
  extractCodeFromResponse: vi.fn(),
}));

vi.mock("@/lib/create/codespace-service", () => ({
  updateCodespace: vi.fn(),
}));

vi.mock("@/lib/create/agent-prompts", () => ({
  buildFixSystemPrompt: vi.fn().mockReturnValue({ full: "fix system", stablePrefix: "fix", dynamicSuffix: "" }),
  buildFixUserPrompt: vi.fn().mockReturnValue("fix user"),
}));

vi.mock("@/lib/create/error-parser", () => ({
  parseTranspileError: vi.fn().mockReturnValue({ message: "error", type: "transpile", severity: "fixable", fixStrategy: "patch" }),
  isUnrecoverableError: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/create/content-generator", () => ({
  cleanCode: vi.fn((code: string) => code),
}));

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), warn: vi.fn() },
}));

vi.mock("./redis", () => ({
  publishArenaEvent: vi.fn().mockResolvedValue(undefined),
  setSubmissionState: vi.fn().mockResolvedValue(undefined),
  setSubmissionWorking: vi.fn().mockResolvedValue(undefined),
}));

import { callClaude, extractCodeFromResponse } from "@/lib/create/agent-client";
import { updateCodespace } from "@/lib/create/codespace-service";
import { publishArenaEvent, setSubmissionState, setSubmissionWorking } from "./redis";

const mockPrisma = mockPrismaObj;
const mockCallClaude = vi.mocked(callClaude);
const mockExtractCode = vi.mocked(extractCodeFromResponse);
const mockUpdateCodespace = vi.mocked(updateCodespace);
const mockPublishEvent = vi.mocked(publishArenaEvent);
const mockSetState = vi.mocked(setSubmissionState);
const mockSetWorking = vi.mocked(setSubmissionWorking);

describe("Arena Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.arenaSubmission.findUniqueOrThrow.mockResolvedValue({
      id: "sub1",
      prompt: "Create a counter app",
      systemPrompt: null,
      challengeId: "ch1",
      challenge: { title: "Counter Challenge", category: "basics" },
    } as never);

    mockPrisma.arenaSubmission.update.mockResolvedValue({} as never);
  });

  it("generates code and updates submission on successful transpile", async () => {
    mockCallClaude.mockResolvedValue({
      text: "```tsx\nexport default function App() { return <div>Hello</div> }\n```",
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      truncated: false,
    } as never);

    mockExtractCode.mockReturnValue(
      'export default function App() { return <div>Hello</div> }',
    );

    mockUpdateCodespace.mockResolvedValue({ success: true });

    await arenaGenerateFromPrompt("sub1");

    // Should set working
    expect(mockSetWorking).toHaveBeenCalledWith("sub1", true);

    // Should publish phase events
    const eventTypes = mockPublishEvent.mock.calls.map((c) => c[1].type);
    expect(eventTypes).toContain("phase_update");
    expect(eventTypes).toContain("code_generated");
    expect(eventTypes).toContain("transpile_success");

    // Should update submission to REVIEWING
    expect(mockPrisma.arenaSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REVIEWING",
          transpileSuccess: true,
        }),
      }),
    );

    // Should clear working flag
    expect(mockSetWorking).toHaveBeenCalledWith("sub1", false);
  });

  it("marks as FAILED when code extraction fails", async () => {
    mockCallClaude.mockResolvedValue({
      text: "Sorry, I can't do that",
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      truncated: false,
    } as never);

    mockExtractCode.mockReturnValue(null);

    await arenaGenerateFromPrompt("sub1");

    // Should update to FAILED
    expect(mockPrisma.arenaSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );

    expect(mockSetState).toHaveBeenCalledWith("sub1", "FAILED");
  });

  it("attempts to fix transpile errors", async () => {
    mockCallClaude
      .mockResolvedValueOnce({
        text: "```tsx\nconst broken = \n```",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        truncated: false,
      } as never)
      .mockResolvedValueOnce({
        text: "```tsx\nexport default function App() { return <div>Fixed</div> }\n```",
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        truncated: false,
      } as never);

    mockExtractCode
      .mockReturnValueOnce("const broken = ")
      .mockReturnValueOnce('export default function App() { return <div>Fixed</div> }');

    mockUpdateCodespace
      .mockResolvedValueOnce({ success: false, error: "Syntax error" })
      .mockResolvedValueOnce({ success: true });

    await arenaGenerateFromPrompt("sub1");

    // Should have published error and fix events
    const eventTypes = mockPublishEvent.mock.calls.map((c) => c[1].type);
    expect(eventTypes).toContain("error_detected");
    expect(eventTypes).toContain("error_fixed");
    expect(eventTypes).toContain("transpile_success");
  });

  it("marks as FAILED after max iterations", async () => {
    mockCallClaude.mockResolvedValue({
      text: "```tsx\nconst broken = \n```",
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      truncated: false,
    } as never);

    mockExtractCode.mockReturnValue("const broken = ");

    mockUpdateCodespace.mockResolvedValue({
      success: false,
      error: "Syntax error",
    });

    await arenaGenerateFromPrompt("sub1");

    // Should be FAILED
    expect(mockPrisma.arenaSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          transpileSuccess: false,
        }),
      }),
    );
  });
});
