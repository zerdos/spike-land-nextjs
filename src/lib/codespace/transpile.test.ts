import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock esbuild-init
const mockEnsureEsbuildReady = vi.fn();
vi.mock("./esbuild-init", () => ({
  ensureEsbuildReady: mockEnsureEsbuildReady,
}));

// Mock esbuild-wasm
const mockTransform = vi.fn();
vi.mock("esbuild-wasm", () => ({
  transform: mockTransform,
}));

import { transpileCode, parseTranspileErrors } from "./transpile";

describe("transpileCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureEsbuildReady.mockResolvedValue(undefined);
  });

  it("calls ensureEsbuildReady before transform", async () => {
    const callOrder: string[] = [];
    mockEnsureEsbuildReady.mockImplementation(async () => {
      callOrder.push("init");
    });
    mockTransform.mockImplementation(async () => {
      callOrder.push("transform");
      return { code: "output" };
    });

    await transpileCode("const x = 1;");

    expect(callOrder).toEqual(["init", "transform"]);
  });

  it("returns transpiled code", async () => {
    mockTransform.mockResolvedValue({ code: "const x = 1;\n" });

    const result = await transpileCode("const x: number = 1;");

    expect(result).toBe("const x = 1;\n");
  });

  it("passes correct transform options", async () => {
    mockTransform.mockResolvedValue({ code: "" });

    await transpileCode("code");

    expect(mockTransform).toHaveBeenCalledWith(
      "code",
      expect.objectContaining({
        loader: "tsx",
        format: "esm",
        platform: "browser",
        target: "es2024",
        treeShaking: true,
        keepNames: true,
        tsconfigRaw: expect.objectContaining({
          compilerOptions: expect.objectContaining({
            jsx: "react-jsx",
            jsxImportSource: "@emotion/react",
          }),
        }),
      }),
    );
  });

  it("propagates transform errors", async () => {
    mockTransform.mockRejectedValue(new Error("Syntax error at line 5"));

    await expect(transpileCode("bad code")).rejects.toThrow(
      "Syntax error at line 5",
    );
  });

  it("propagates init errors", async () => {
    mockEnsureEsbuildReady.mockRejectedValue(new Error("WASM failed"));

    await expect(transpileCode("code")).rejects.toThrow("WASM failed");
    expect(mockTransform).not.toHaveBeenCalled();
  });
});

describe("parseTranspileErrors", () => {
  it("parses line:col format errors", () => {
    const errors = parseTranspileErrors("file.tsx:5:10: error: Unexpected token");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      line: 5,
      column: 10,
      message: "Unexpected token",
    });
  });

  it("parses 'line N' format errors", () => {
    const errors = parseTranspileErrors("line 42: Missing semicolon");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      line: 42,
      message: "Missing semicolon",
    });
  });

  it("returns raw message for unstructured errors", () => {
    const errors = parseTranspileErrors("Something went wrong");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({ message: "Something went wrong" });
  });

  it("skips error count summary lines", () => {
    const errors = parseTranspileErrors(
      "file.tsx:1:1: error: Bad\n2 error(s)",
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe("Bad");
  });

  it("handles multiline error messages", () => {
    const errors = parseTranspileErrors(
      "file.tsx:1:5: error: Missing bracket\nfile.tsx:3:10: warning: Unused var",
    );

    expect(errors).toHaveLength(2);
  });

  it("handles empty string", () => {
    const errors = parseTranspileErrors("");
    expect(errors).toEqual([]);
  });

  it("deduplicates identical plain messages", () => {
    const errors = parseTranspileErrors("error\nerror");
    expect(errors).toHaveLength(1);
  });

  it("returns whole message when no structured errors found", () => {
    const errors = parseTranspileErrors("  \n  some issue  \n  ");
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message === "some issue")).toBe(true);
  });
});
