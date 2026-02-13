import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("@/lib/codespace/bundle-cache", () => ({
  deleteBundleCache: vi.fn(),
  deleteBundleFallbackCache: vi.fn(),
  getBundleCache: vi.fn(),
  getBundleFallbackCache: vi.fn(),
  setBundleCache: vi.fn(),
  setBundleFallbackCache: vi.fn(),
}));

vi.mock("@/lib/codespace/bundle-template", () => ({
  buildBundleHtml: vi.fn(),
}));

vi.mock("@/lib/codespace/html-template", () => ({
  buildEmbedHtml: vi.fn(),
}));

vi.mock("@/lib/codespace/bundler", () => ({
  bundleCodespace: vi.fn(),
}));

vi.mock("@/lib/codespace/session-service", () => ({
  getOrCreateSession: vi.fn(),
  upsertSession: vi.fn(),
}));

vi.mock("@/lib/codespace/transpile", () => ({
  transpileCode: vi.fn(),
}));

import {
  deleteBundleCache,
  deleteBundleFallbackCache,
  getBundleCache,
  getBundleFallbackCache,
  setBundleCache,
  setBundleFallbackCache,
} from "@/lib/codespace/bundle-cache";
import { buildBundleHtml } from "@/lib/codespace/bundle-template";
import { bundleCodespace } from "@/lib/codespace/bundler";
import { buildEmbedHtml } from "@/lib/codespace/html-template";
import {
  getOrCreateSession,
  upsertSession,
} from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import { GET, OPTIONS } from "./route";

const mockGetOrCreateSession = vi.mocked(getOrCreateSession);
const mockTranspileCode = vi.mocked(transpileCode);
const mockDeleteBundleCache = vi.mocked(deleteBundleCache);
const mockDeleteBundleFallbackCache = vi.mocked(deleteBundleFallbackCache);
const mockGetBundleCache = vi.mocked(getBundleCache);
const mockGetBundleFallbackCache = vi.mocked(getBundleFallbackCache);
const mockSetBundleCache = vi.mocked(setBundleCache);
const mockSetBundleFallbackCache = vi.mocked(setBundleFallbackCache);
const mockBundleCodespace = vi.mocked(bundleCodespace);
const mockBuildBundleHtml = vi.mocked(buildBundleHtml);
const mockBuildEmbedHtml = vi.mocked(buildEmbedHtml);
const mockUpsertSession = vi.mocked(upsertSession);

function makeRequest(url = "http://localhost/api/codespace/test-cs/bundle") {
  return {
    nextUrl: new URL(url),
  } as unknown as import("next/server").NextRequest;
}

function makeContext(codeSpace = "test-cs") {
  return { params: Promise.resolve({ codeSpace }) };
}

const baseSession = {
  code: "const App = () => <div>Hello</div>;",
  codeSpace: "test-cs",
  transpiled:
    'import{jsx}from"@emotion/react/jsx-runtime";export{App as default};',
  html: "<div>Hello</div>",
  css: "body{}",
  messages: [],
  hash: "abc123",
  requiresReRender: false,
};

describe("GET /api/codespace/[codeSpace]/bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateSession.mockResolvedValue(baseSession);
    mockGetBundleCache.mockResolvedValue(null);
    mockGetBundleFallbackCache.mockResolvedValue(null);
    mockBundleCodespace.mockResolvedValue({ js: "bundled()", css: "body{}" });
    mockBuildBundleHtml.mockReturnValue("<html>bundle</html>");
    mockBuildEmbedHtml.mockReturnValue("<html><body></body></html>");
    mockSetBundleCache.mockResolvedValue(undefined);
    mockSetBundleFallbackCache.mockResolvedValue(undefined);
    mockDeleteBundleCache.mockResolvedValue(undefined);
    mockDeleteBundleFallbackCache.mockResolvedValue(undefined);
    mockUpsertSession.mockResolvedValue(baseSession as ReturnType<typeof upsertSession> extends Promise<infer T> ? T : never);
  });

  it("returns bundled HTML on cache miss", async () => {
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("<html>bundle</html>");
    expect(mockBundleCodespace).toHaveBeenCalled();
    expect(mockBuildBundleHtml).toHaveBeenCalled();
  });

  it("returns cached HTML on cache hit", async () => {
    mockGetBundleCache.mockResolvedValue("<html>cached</html>");
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("<html>cached</html>");
    expect(mockBundleCodespace).not.toHaveBeenCalled();
  });

  it("sets correct Content-Type header", async () => {
    const response = await GET(makeRequest(), makeContext());
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
  });

  it("sets Content-Security-Policy header", async () => {
    const response = await GET(makeRequest(), makeContext());
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("script-src 'unsafe-inline' 'wasm-unsafe-eval'");
    expect(csp).toContain("connect-src *");
  });

  it("adds Content-Disposition for download=true", async () => {
    const req = makeRequest(
      "http://localhost/api/codespace/test-cs/bundle?download=true",
    );
    const response = await GET(req, makeContext());
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="test-cs.html"',
    );
  });

  it("auto-transpiles when no transpiled code", async () => {
    mockGetOrCreateSession.mockResolvedValue({
      ...baseSession,
      transpiled: "",
    });
    mockTranspileCode.mockResolvedValue("transpiled code");

    await GET(makeRequest(), makeContext());
    expect(mockTranspileCode).toHaveBeenCalledWith(baseSession.code);
  });

  it("returns 404 when no transpiled code available", async () => {
    mockGetOrCreateSession.mockResolvedValue({
      ...baseSession,
      transpiled: "",
      code: "",
    });

    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(404);
  });

  it("returns 500 on persistent session error", async () => {
    mockGetOrCreateSession.mockRejectedValue(new Error("DB error"));
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(500);
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  it("returns 503 with Retry-After on transient session error (ECONNREFUSED)", async () => {
    mockGetOrCreateSession.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:6379"));
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("returns 503 with Retry-After on transient session error (timeout)", async () => {
    mockGetOrCreateSession.mockRejectedValue(new Error("Request timeout"));
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("returns 503 with Retry-After on transient session error (redis)", async () => {
    mockGetOrCreateSession.mockRejectedValue(new Error("Redis connection lost"));
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("returns 200 with fallback HTML on build timeout", async () => {
    mockBundleCodespace.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Bundle build timed out")),
            50,
          ),
        ),
    );

    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    expect(mockBuildEmbedHtml).toHaveBeenCalled();
    const text = await response.text();
    expect(text).toContain("spike-land-bundle");
  });

  it("returns 200 with fallback HTML on build failure", async () => {
    mockBundleCodespace.mockRejectedValue(new Error("Build failed"));
    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    expect(mockBuildEmbedHtml).toHaveBeenCalledWith(
      expect.objectContaining({ codeSpace: "test-cs" }),
    );
  });

  it("uses fallback cache on repeated build failures", async () => {
    mockBundleCodespace.mockRejectedValue(new Error("Build failed"));
    mockGetBundleFallbackCache.mockResolvedValue("<html>cached-fallback</html>");

    const response = await GET(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("<html>cached-fallback</html>");
    // Should not rebuild embed HTML when fallback cache exists
    expect(mockBuildEmbedHtml).not.toHaveBeenCalled();
  });

  it("caches fallback HTML after build failure", async () => {
    mockBundleCodespace.mockRejectedValue(new Error("Build failed"));
    await GET(makeRequest(), makeContext());
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSetBundleFallbackCache).toHaveBeenCalledWith(
      "test-cs",
      "abc123",
      expect.any(String),
    );
  });

  it("caches bundle in background after build", async () => {
    await GET(makeRequest(), makeContext());
    // Give background task time to execute
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSetBundleCache).toHaveBeenCalledWith(
      "test-cs",
      "abc123",
      "<html>bundle</html>",
    );
  });
});

describe("GET /api/codespace/[codeSpace]/bundle?rebuild=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateSession.mockResolvedValue(baseSession);
    mockGetBundleCache.mockResolvedValue(null);
    mockGetBundleFallbackCache.mockResolvedValue(null);
    mockBundleCodespace.mockResolvedValue({ js: "bundled()", css: "body{}" });
    mockBuildBundleHtml.mockReturnValue("<html>bundle</html>");
    mockBuildEmbedHtml.mockReturnValue("<html><body></body></html>");
    mockSetBundleCache.mockResolvedValue(undefined);
    mockSetBundleFallbackCache.mockResolvedValue(undefined);
    mockDeleteBundleCache.mockResolvedValue(undefined);
    mockDeleteBundleFallbackCache.mockResolvedValue(undefined);
    mockUpsertSession.mockResolvedValue(baseSession as ReturnType<typeof upsertSession> extends Promise<infer T> ? T : never);
    mockTranspileCode.mockResolvedValue("re-transpiled code");
  });

  it("skips cache lookup and deletes old cache on rebuild", async () => {
    mockGetBundleCache.mockResolvedValue("<html>stale</html>");

    const req = makeRequest(
      "http://localhost/api/codespace/test-cs/bundle?rebuild=true",
    );
    const response = await GET(req, makeContext());
    expect(response.status).toBe(200);

    // Should NOT use cached HTML
    const text = await response.text();
    expect(text).toBe("<html>bundle</html>");

    // Cache lookup should be skipped
    expect(mockGetBundleCache).not.toHaveBeenCalled();

    // Old cache should be deleted
    expect(mockDeleteBundleCache).toHaveBeenCalledWith("test-cs", "abc123");
  });

  it("clears fallback cache on rebuild", async () => {
    const req = makeRequest(
      "http://localhost/api/codespace/test-cs/bundle?rebuild=true",
    );
    await GET(req, makeContext());
    await new Promise((r) => setTimeout(r, 10));
    expect(mockDeleteBundleFallbackCache).toHaveBeenCalledWith("test-cs", "abc123");
  });

  it("force re-transpiles from source code on rebuild", async () => {
    const req = makeRequest(
      "http://localhost/api/codespace/test-cs/bundle?rebuild=true",
    );
    await GET(req, makeContext());

    // Should call transpileCode even though session.transpiled exists
    expect(mockTranspileCode).toHaveBeenCalledWith(baseSession.code);
  });
});

describe("OPTIONS /api/codespace/[codeSpace]/bundle", () => {
  it("returns 204 with CORS headers", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
