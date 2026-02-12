/**
 * Transpile helper — uses esbuild-wasm locally to transpile JSX/TSX code.
 *
 * Used by codespace API routes to convert raw source code into browser-ready JavaScript.
 * Transform options match packages/code/src/@/lib/transpile.ts:65-81 (same as js.spike.land).
 */

export async function transpileCode(
  code: string,
  _origin?: string,
): Promise<string> {
  const { transform } = await import("esbuild-wasm");
  const result = await transform(code, {
    loader: "tsx",
    format: "esm",
    treeShaking: true,
    platform: "browser",
    minify: false,
    charset: "utf8",
    keepNames: true,
    tsconfigRaw: {
      compilerOptions: {
        jsx: "react-jsx",
        jsxFragmentFactory: "Fragment",
        jsxImportSource: "@emotion/react",
      },
    },
    target: "es2024",
  });
  return result.code;
}

/**
 * Parse transpilation error messages to extract line numbers and structured errors.
 * Ported from packages/testing.spike.land/src/routes/apiRoutes.ts
 */
export function parseTranspileErrors(
  errorMessage: string,
): Array<{ line?: number; column?: number; message: string }> {
  const errors: Array<{ line?: number; column?: number; message: string }> = [];
  const lines = errorMessage.split("\n");

  for (const line of lines) {
    if (/^\d+ error\(s\)/.test(line.trim())) continue;

    const lineColMatch = line.match(/:(\d+):(\d+):\s*(error|warning)?:?\s*(.+)/i);
    if (lineColMatch) {
      errors.push({
        line: parseInt(lineColMatch[1]!, 10),
        column: parseInt(lineColMatch[2]!, 10),
        message: lineColMatch[4]?.trim() || "Unknown error",
      });
      continue;
    }

    const lineMatch = line.match(/line\s+(\d+):\s*(.+)/i);
    if (lineMatch) {
      errors.push({
        line: parseInt(lineMatch[1]!, 10),
        message: lineMatch[2]?.trim() || "Unknown error",
      });
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !errors.some((e) => e.message === trimmed)) {
      errors.push({ message: trimmed });
    }
  }

  if (errors.length === 0 && errorMessage.trim()) {
    errors.push({ message: errorMessage.trim() });
  }

  return errors;
}
