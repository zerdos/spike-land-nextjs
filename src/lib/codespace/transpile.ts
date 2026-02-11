/**
 * Transpile helper — calls js.spike.land to transpile JSX/TSX code via esbuild.
 *
 * Used by codespace API routes to convert raw source code into browser-ready JavaScript.
 */

export async function transpileCode(
  code: string,
  origin?: string,
): Promise<string> {
  const response = await fetch("https://js.spike.land", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      ...(origin ? { TR_ORIGIN: origin } : {}),
    },
    body: code,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transpilation failed: ${errorText}`);
  }

  return response.text();
}
