import { auth } from "@/auth";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST, GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock other dependencies to avoid running them
vi.mock("@/lib/claude-agent/tools/codespace-tools", () => ({
  createCodespaceServer: vi.fn(),
  CODESPACE_TOOL_NAMES: [],
}));

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

describe("POST /api/test/agent-debug", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars before each test to ensure clean slate
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("should return 404 in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const request = new Request("http://localhost/api/test/agent-debug", {
            method: "POST",
            body: JSON.stringify({ codespaceId: "123", prompt: "test" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "Not found" });
    });

    it("should return 401 if unauthenticated in development", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.mocked(auth).mockResolvedValue(null);

        const request = new Request("http://localhost/api/test/agent-debug", {
            method: "POST",
            body: JSON.stringify({ codespaceId: "123", prompt: "test" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if authenticated but missing body params in development", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);

        const request = new Request("http://localhost/api/test/agent-debug", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Missing codespaceId or prompt" });
    });
});

describe("GET /api/test/agent-debug", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("should return 404 in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const request = new Request("http://localhost/api/test/agent-debug?codespaceId=123", {
            method: "GET",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "Not found" });
    });

    it("should return 401 if unauthenticated in development", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.mocked(auth).mockResolvedValue(null);

        const request = new Request("http://localhost/api/test/agent-debug?codespaceId=123", {
            method: "GET",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
    });
});
