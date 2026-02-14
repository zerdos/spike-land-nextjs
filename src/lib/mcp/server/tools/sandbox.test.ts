import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMockRegistry, getText, isError } from "../__test-utils__";
import { registerSandboxTools, _resetSandboxes } from "./sandbox";

describe("sandbox tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetSandboxes();
    registry = createMockRegistry();
    registerSandboxTools(registry, userId);
  });

  it("should register 5 sandbox tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("sandbox_create")).toBe(true);
    expect(registry.handlers.has("sandbox_exec")).toBe(true);
    expect(registry.handlers.has("sandbox_read_file")).toBe(true);
    expect(registry.handlers.has("sandbox_write_file")).toBe(true);
    expect(registry.handlers.has("sandbox_destroy")).toBe(true);
  });

  describe("sandbox_create", () => {
    it("should create a sandbox with default language", async () => {
      const handler = registry.handlers.get("sandbox_create")!;
      const result = await handler({ language: "typescript" });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Sandbox created");
      expect(text).toContain("typescript");
      expect(text).toContain("active");
    });

    it("should create a sandbox with custom name", async () => {
      const handler = registry.handlers.get("sandbox_create")!;
      const result = await handler({ name: "my-sandbox", language: "python" });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("my-sandbox");
      expect(text).toContain("python");
    });

    it("should create a sandbox with auto-generated name when none provided", async () => {
      const handler = registry.handlers.get("sandbox_create")!;
      const result = await handler({ language: "javascript" });

      const text = getText(result);
      expect(text).toContain("sandbox-");
      expect(text).toContain("javascript");
    });
  });

  describe("sandbox_exec", () => {
    it("should execute code in a sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const execHandler = registry.handlers.get("sandbox_exec")!;
      const result = await execHandler({
        sandbox_id: sandboxId,
        code: "console.log('hello');",
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Execution result");
      expect(text).toContain("Exit code:** 0");
      expect(text).toContain("typescript");
    });

    it("should use language override", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const execHandler = registry.handlers.get("sandbox_exec")!;
      const result = await execHandler({
        sandbox_id: sandboxId,
        code: "print('hello')",
        language: "python",
      });

      const text = getText(result);
      expect(text).toContain("python");
    });

    it("should return error for non-existent sandbox", async () => {
      const handler = registry.handlers.get("sandbox_exec")!;
      const result = await handler({
        sandbox_id: "nonexistent",
        code: "test",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });

    it("should return error for destroyed sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const destroyHandler = registry.handlers.get("sandbox_destroy")!;
      await destroyHandler({ sandbox_id: sandboxId });

      const execHandler = registry.handlers.get("sandbox_exec")!;
      const result = await execHandler({
        sandbox_id: sandboxId,
        code: "test",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("destroyed");
    });
  });

  describe("sandbox_write_file", () => {
    it("should write a file to the sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const writeHandler = registry.handlers.get("sandbox_write_file")!;
      const result = await writeHandler({
        sandbox_id: sandboxId,
        file_path: "index.ts",
        content: "export const x = 1;",
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("File written");
      expect(text).toContain("index.ts");
      expect(text).toContain("bytes");
    });

    it("should return error for non-existent sandbox", async () => {
      const handler = registry.handlers.get("sandbox_write_file")!;
      const result = await handler({
        sandbox_id: "nonexistent",
        file_path: "test.ts",
        content: "test",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });

    it("should return error for destroyed sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      await registry.handlers.get("sandbox_destroy")!({ sandbox_id: sandboxId });

      const writeHandler = registry.handlers.get("sandbox_write_file")!;
      const result = await writeHandler({
        sandbox_id: sandboxId,
        file_path: "test.ts",
        content: "test",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("destroyed");
    });
  });

  describe("sandbox_read_file", () => {
    it("should read a file from the sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const writeHandler = registry.handlers.get("sandbox_write_file")!;
      await writeHandler({
        sandbox_id: sandboxId,
        file_path: "hello.ts",
        content: "const msg = 'hello';",
      });

      const readHandler = registry.handlers.get("sandbox_read_file")!;
      const result = await readHandler({
        sandbox_id: sandboxId,
        file_path: "hello.ts",
      });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("hello.ts");
      expect(text).toContain("const msg = 'hello'");
    });

    it("should return error for non-existent file", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const readHandler = registry.handlers.get("sandbox_read_file")!;
      const result = await readHandler({
        sandbox_id: sandboxId,
        file_path: "missing.ts",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });

    it("should return error for non-existent sandbox", async () => {
      const handler = registry.handlers.get("sandbox_read_file")!;
      const result = await handler({
        sandbox_id: "nonexistent",
        file_path: "test.ts",
      });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });
  });

  describe("sandbox_destroy", () => {
    it("should destroy a sandbox and return stats", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ name: "doomed", language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      // Write a file and run a command
      const writeHandler = registry.handlers.get("sandbox_write_file")!;
      await writeHandler({
        sandbox_id: sandboxId,
        file_path: "index.ts",
        content: "export default 42;",
      });

      const execHandler = registry.handlers.get("sandbox_exec")!;
      await execHandler({
        sandbox_id: sandboxId,
        code: "console.log(42)",
      });

      const destroyHandler = registry.handlers.get("sandbox_destroy")!;
      const result = await destroyHandler({ sandbox_id: sandboxId });

      expect(isError(result)).toBe(false);
      const text = getText(result);
      expect(text).toContain("Sandbox destroyed");
      expect(text).toContain("doomed");
      expect(text).toContain("Files created:** 1");
      expect(text).toContain("Commands run:** 1");
    });

    it("should return error for non-existent sandbox", async () => {
      const handler = registry.handlers.get("sandbox_destroy")!;
      const result = await handler({ sandbox_id: "nonexistent" });

      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("not found");
    });

    it("should return error when destroying already destroyed sandbox", async () => {
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ language: "typescript" });
      const sandboxId = extractId(getText(createResult));

      const destroyHandler = registry.handlers.get("sandbox_destroy")!;
      await destroyHandler({ sandbox_id: sandboxId });

      const result = await destroyHandler({ sandbox_id: sandboxId });
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("destroyed");
    });
  });

  describe("full lifecycle", () => {
    it("should support create -> write -> read -> exec -> destroy", async () => {
      // Create
      const createHandler = registry.handlers.get("sandbox_create")!;
      const createResult = await createHandler({ name: "lifecycle-test", language: "typescript" });
      expect(isError(createResult)).toBe(false);
      const sandboxId = extractId(getText(createResult));
      expect(sandboxId).toBeTruthy();

      // Write
      const writeHandler = registry.handlers.get("sandbox_write_file")!;
      const writeResult = await writeHandler({
        sandbox_id: sandboxId,
        file_path: "app.ts",
        content: "export function add(a: number, b: number) { return a + b; }",
      });
      expect(isError(writeResult)).toBe(false);
      expect(getText(writeResult)).toContain("app.ts");

      // Read
      const readHandler = registry.handlers.get("sandbox_read_file")!;
      const readResult = await readHandler({
        sandbox_id: sandboxId,
        file_path: "app.ts",
      });
      expect(isError(readResult)).toBe(false);
      expect(getText(readResult)).toContain("export function add");

      // Exec
      const execHandler = registry.handlers.get("sandbox_exec")!;
      const execResult = await execHandler({
        sandbox_id: sandboxId,
        code: "import { add } from './app'; console.log(add(1, 2));",
      });
      expect(isError(execResult)).toBe(false);
      expect(getText(execResult)).toContain("Exit code:** 0");

      // Destroy
      const destroyHandler = registry.handlers.get("sandbox_destroy")!;
      const destroyResult = await destroyHandler({ sandbox_id: sandboxId });
      expect(isError(destroyResult)).toBe(false);
      expect(getText(destroyResult)).toContain("lifecycle-test");
      expect(getText(destroyResult)).toContain("Files created:** 1");
      expect(getText(destroyResult)).toContain("Commands run:** 1");

      // Verify destroyed sandbox cannot be used
      const postDestroyResult = await readHandler({
        sandbox_id: sandboxId,
        file_path: "app.ts",
      });
      expect(isError(postDestroyResult)).toBe(true);
      expect(getText(postDestroyResult)).toContain("destroyed");
    });
  });
});

/**
 * Extract the sandbox ID from a creation result text.
 * Looks for the pattern `ID:** \`<uuid>\`
 */
function extractId(text: string): string {
  const match = text.match(/ID:\*\*\s*`([^`]+)`/);
  if (!match?.[1]) throw new Error("Could not extract sandbox ID from result");
  return match[1];
}
