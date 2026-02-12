/**
 * Transpile helper — delegates to the js.spike.land Cloudflare Worker
 * which runs esbuild-wasm natively. This avoids WASM initialization
 * issues on Vercel's serverless runtime.
 *
 * Used by codespace API routes to convert raw source code into browser-ready JavaScript.
 */

const JS_SPIKE_LAND_URL = "https://js.spike.land";
const TRANSPILE_TIMEOUT_MS = 15_000;

export async function transpileCode(
  code: string,
  origin = "https://spike.land",
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSPILE_TIMEOUT_MS);

  try {
    const response = await fetch(JS_SPIKE_LAND_URL, {
      method: "POST",
      headers: { "TR_ORIGIN": origin },
      body: code,
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `Transpilation failed with status ${response.status}`);
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
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
