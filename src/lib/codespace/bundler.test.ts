import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock esbuild
vi.mock("esbuild", () => ({
  build: vi.fn(),
}));

// Mock fetch for the plugin
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import * as esbuild from "esbuild";
import { bundleCodespace } from "./bundler";

const mockBuild = vi.mocked(esbuild.build);

function makeBuildResult(
  files: { path: string; text: string }[],
): esbuild.BuildResult {
  return {
    outputFiles: files.map((f) => ({
      path: f.path,
      text: f.text,
      contents: new Uint8Array(),
      hash: "",
    })),
    errors: [],
    warnings: [],
    metafile: undefined,
    mangleCache: undefined,
  } as unknown as esbuild.BuildResult;
}

describe("bundleCodespace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns js and css from esbuild output", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([
        { path: "stdin.js", text: "(function(){console.log('hello')})();" },
        { path: "stdin.css", text: "body{color:red}" },
      ]),
    );

    const result = await bundleCodespace({
      transpiled:
        'import{jsx}from"@emotion/react/jsx-runtime";const App=()=>jsx("div",{});export { App as default };',
      codeSpace: "test-cs",
    });

    expect(result.js).toContain("hello");
    expect(result.css).toBe("body{color:red}");
  });

  it("calls esbuild.build with correct options", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "bundled" }]),
    );

    await bundleCodespace({
      transpiled: "export { App as default };",
      codeSpace: "test-cs",
    });

    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2022",
        treeShaking: true,
        write: false,
        minify: true,
        logLevel: "silent",
        stdin: expect.objectContaining({
          loader: "js",
          resolveDir: "/",
        }),
      }),
    );
  });

  it("rewrites export default to createRoot render call", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "ok" }]),
    );

    await bundleCodespace({
      transpiled: "const App = () => null;\nexport { App as default };",
      codeSpace: "test-cs",
    });

    const stdinContents = mockBuild.mock.calls[0]![0]!.stdin
      ?.contents as string;
    expect(stdinContents).toContain("createRoot");
    expect(stdinContents).toContain('getElementById("embed")');
    expect(stdinContents).toContain("react-dom/client");
    expect(stdinContents).not.toContain("export");
  });

  it("preserves the component name in the render call", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "ok" }]),
    );

    await bundleCodespace({
      transpiled: "const MyWidget = () => null;\nexport { MyWidget as default };",
      codeSpace: "test-cs",
    });

    const stdinContents = mockBuild.mock.calls[0]![0]!.stdin
      ?.contents as string;
    expect(stdinContents).toContain("MyWidget");
    expect(stdinContents).toContain("createRoot");
  });

  it("returns empty css when no css output files", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "bundled" }]),
    );

    const result = await bundleCodespace({
      transpiled: "export { App as default };",
      codeSpace: "test-cs",
    });

    expect(result.css).toBe("");
  });

  it("concatenates multiple js output files", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([
        { path: "chunk1.js", text: "var a=1;" },
        { path: "chunk2.js", text: "var b=2;" },
      ]),
    );

    const result = await bundleCodespace({
      transpiled: "console.log('hi');",
      codeSpace: "test-cs",
    });

    expect(result.js).toBe("var a=1;var b=2;");
  });

  it("concatenates multiple css output files", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([
        { path: "stdin.js", text: "code" },
        { path: "a.css", text: "body{}" },
        { path: "b.css", text: "h1{color:red}" },
      ]),
    );

    const result = await bundleCodespace({
      transpiled: "console.log('hi');",
      codeSpace: "test-cs",
    });

    expect(result.css).toBe("body{}h1{color:red}");
  });

  it("throws on esbuild build failure", async () => {
    mockBuild.mockRejectedValue(new Error("Build error: syntax issue"));

    await expect(
      bundleCodespace({
        transpiled: "invalid code",
        codeSpace: "test-cs",
      }),
    ).rejects.toThrow("Bundle failed for test-cs: Build error: syntax issue");
  });

  it("wraps non-Error throw in error message", async () => {
    mockBuild.mockRejectedValue("string error");

    await expect(
      bundleCodespace({
        transpiled: "code",
        codeSpace: "my-space",
      }),
    ).rejects.toThrow("Bundle failed for my-space: string error");
  });

  it("handles empty transpiled code", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "" }]),
    );

    const result = await bundleCodespace({
      transpiled: "",
      codeSpace: "test-cs",
    });

    expect(result.js).toBe("");
    expect(result.css).toBe("");
  });

  it("handles transpiled code without export default", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "executed" }]),
    );

    await bundleCodespace({
      transpiled: "console.log('hello');",
      codeSpace: "test-cs",
    });

    const stdinContents = mockBuild.mock.calls[0]![0]!.stdin
      ?.contents as string;
    expect(stdinContents).toBe("console.log('hello');");
  });

  it("includes server-fetch plugin in build options", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "ok" }]),
    );

    await bundleCodespace({
      transpiled: "export { App as default };",
      codeSpace: "test-cs",
    });

    const plugins = mockBuild.mock.calls[0]![0]!.plugins;
    expect(plugins).toHaveLength(1);
    expect(plugins![0]!.name).toBe("server-fetch");
  });

  it("passes BROWSER_DEFINE in build options", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "ok" }]),
    );

    await bundleCodespace({
      transpiled: "export { App as default };",
      codeSpace: "test-cs",
    });

    const define = mockBuild.mock.calls[0]![0]!.define;
    expect(define).toBeDefined();
    expect(define!["global"]).toBe("globalThis");
    expect(define!["process.env['NODE_ENV']"]).toBe('"production"');
  });

  it("handles null/undefined outputFiles gracefully", async () => {
    mockBuild.mockResolvedValue({
      outputFiles: undefined,
      errors: [],
      warnings: [],
    } as unknown as esbuild.BuildResult);

    const result = await bundleCodespace({
      transpiled: "console.log('hi');",
      codeSpace: "test-cs",
    });

    expect(result.js).toBe("");
    expect(result.css).toBe("");
  });

  it("includes codeSpace name in error message", async () => {
    mockBuild.mockRejectedValue(new Error("crash"));

    await expect(
      bundleCodespace({
        transpiled: "x",
        codeSpace: "workspace-42",
      }),
    ).rejects.toThrow("Bundle failed for workspace-42: crash");
  });

  it("uses empty string when transpiled is falsy", async () => {
    mockBuild.mockResolvedValue(
      makeBuildResult([{ path: "stdin.js", text: "ok" }]),
    );

    await bundleCodespace({
      transpiled: "",
      codeSpace: "test-cs",
    });

    const stdinContents = mockBuild.mock.calls[0]![0]!.stdin
      ?.contents as string;
    expect(stdinContents).toBe("");
  });
});
