import { SessionService } from "@/lib/codespace/session-service";
import { HTML_TEMPLATE, IMPORT_MAP } from "@/lib/codespace/html-template";
import { type NextRequest } from "next/server";

/**
 * GET /live/[codeSpace]
 * Renders the live application HTML
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ codeSpace: string; }>; },
) {
  const { codeSpace } = await context.params;

  // Validate codeSpace format
  if (!/^[a-zA-Z0-9_-]+$/.test(codeSpace)) {
    return new Response("Invalid codeSpace format", { status: 400 });
  }

  const session = await SessionService.getSession(codeSpace);

  if (!session) {
    return new Response("Codespace not found", { status: 404 });
  }

  // Perform replacements in the template
  let html = HTML_TEMPLATE
    .replace("// IMPORTMAP", JSON.stringify(IMPORT_MAP))
    .replace("<!-- HTML_CONTENT -->", session.html || "")
    .replace("/start.mjs", `/live/${codeSpace}/index.mjs`);

  // Inject CSS link
  const cssLink = `
    <link rel="preload" href="/live/${codeSpace}/index.css" as="style">
    <link rel="stylesheet" href="/live/${codeSpace}/index.css">
  `;
  html = html.replace("<!-- CSS_LINKS -->", cssLink);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
