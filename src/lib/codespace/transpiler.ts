export async function transpileCode(code: string, origin: string): Promise<string> {
  const response = await fetch("https://js.spike.land", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "TR_ORIGIN": origin,
    },
    body: code,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transpilation failed: ${errorText}`);
  }

  return await response.text();
}

/**
 * Parse transpilation error messages to extract line numbers and structured errors.
 * Ported from packages/testing.spike.land/src/routes/apiRoutes.ts
 */
export function parseTranspileErrors(
  errorMessage: string,
): Array<{ line?: number; column?: number; message: string; }> {
  const errors: Array<{ line?: number; column?: number; message: string; }> = [];
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
