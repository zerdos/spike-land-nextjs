import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as renderHTML } from "@/app/live/[codeSpace]/route";
import { GET as renderAsset } from "@/app/live/[codeSpace]/[asset]/route";
import { SessionService } from "@/lib/codespace/session-service";
import { NextRequest } from "next/server";

// Mock SessionService
vi.mock("@/lib/codespace/session-service", () => ({
  SessionService: {
    getSession: vi.fn(),
    updateSession: vi.fn(),
  },
}));

// Mock transpileCode
vi.mock("@/lib/codespace/transpiler", () => ({
  transpileCode: vi.fn(() => Promise.resolve({ js: "console.log('test')", html: "<div>test</div>", css: "" })),
}));

describe("Live App Integration", () => {
  const codeSpace = "test-cs";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render HTML correctly", async () => {
    const mockSession = {
      codeSpace,
      code: "export default () => <div>test</div>",
      transpiled: "console.log('test')",
      html: "<div>test</div>",
      css: "body { color: red; }",
    };

    (SessionService.getSession as any).mockResolvedValue(mockSession);

    const request = new NextRequest(`http://localhost/live/${codeSpace}`);
    const response = await renderHTML(request, { params: Promise.resolve({ codeSpace }) });

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>spike.land</title>");
    expect(html).toContain("<div>test</div>");
    expect(html).toContain(`import App from "/live/${codeSpace}/index.mjs"`);
    expect(html).toContain("createRoot");
    // Import map should use absolute esm.sh URLs, not relative .mjs paths
    expect(html).toContain("https://esm.sh/react@");
    expect(html).not.toContain("/reactMod.mjs");
  });

  it("should serve assets correctly", async () => {
    const mockSession = {
      codeSpace,
      transpiled: "console.log('test')",
      css: "body { color: red; }",
    };

    (SessionService.getSession as any).mockResolvedValue(mockSession);

    // Test JS asset
    const jsRequest = new NextRequest(`http://localhost/live/${codeSpace}/index.mjs`);
    const jsResponse = await renderAsset(jsRequest, { params: Promise.resolve({ codeSpace, asset: "index.mjs" }) });
    expect(jsResponse.status).toBe(200);
    expect(await jsResponse.text()).toBe(mockSession.transpiled);

    // Test CSS asset
    const cssRequest = new NextRequest(`http://localhost/live/${codeSpace}/index.css`);
    const cssResponse = await renderAsset(cssRequest, { params: Promise.resolve({ codeSpace, asset: "index.css" }) });
    expect(cssResponse.status).toBe(200);
    expect(await cssResponse.text()).toBe(mockSession.css);
  });
});
