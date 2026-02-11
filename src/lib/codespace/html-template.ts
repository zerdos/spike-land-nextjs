/**
 * HTML Template Builder for Live App Embeds
 *
 * Builds a complete HTML page from codespace session data,
 * replacing the Cloudflare Worker's liveRoutes HTML rendering.
 *
 * The template includes:
 * - An import map mapping bare specifiers to esm.sh CDN URLs
 * - Inline CSS from the session
 * - The user's HTML content in the body
 * - A module script that imports the transpiled code and renders it
 */

import { REACT_VERSION } from "./constants";

// ---------------------------------------------------------------------------
// Import map for embedded apps
// ---------------------------------------------------------------------------

export interface ImportMap {
  imports: Record<string, string>;
}

/**
 * Build a minimal import map for standalone embedded apps.
 *
 * This is a simplified server-side version of the client-side import map
 * from packages/code/src/@/lib/importmap-utils.ts. The embedded app only
 * needs the core React + UI library mappings since all other dependencies
 * are bundled via ?bundle=true on esm.sh.
 */
function buildImportMap(): ImportMap {
  return {
    imports: {
      "react": `https://esm.sh/react@${REACT_VERSION}?bundle=true`,
      "react/": `https://esm.sh/react@${REACT_VERSION}/`,
      "react/jsx-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-runtime?bundle=true`,
      "react/jsx-dev-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-dev-runtime?bundle=true`,
      "react-dom": `https://esm.sh/react-dom@${REACT_VERSION}?bundle=true`,
      "react-dom/": `https://esm.sh/react-dom@${REACT_VERSION}/`,
      "react-dom/client": `https://esm.sh/react-dom@${REACT_VERSION}/client?bundle=true`,
      "react-dom/server": `https://esm.sh/react-dom@${REACT_VERSION}/server?bundle=true`,
      "@emotion/react": "https://esm.sh/@emotion/react@11?bundle=true",
      "@emotion/react/jsx-runtime": "https://esm.sh/@emotion/react@11/jsx-runtime?bundle=true",
      "@emotion/react/jsx-dev-runtime": "https://esm.sh/@emotion/react@11/jsx-dev-runtime?bundle=true",
      "@emotion/styled": "https://esm.sh/@emotion/styled@11?bundle=true",
      "@emotion/cache": "https://esm.sh/@emotion/cache@11?bundle=true",
      "framer-motion": "https://esm.sh/framer-motion@12?bundle=true",
      "recharts": "https://esm.sh/recharts@2?bundle=true",
    },
  };
}

// ---------------------------------------------------------------------------
// Embed HTML builder
// ---------------------------------------------------------------------------

export interface EmbedHtmlParams {
  transpiled: string;
  html: string;
  css: string;
  codeSpace: string;
}

/**
 * Build a self-contained HTML page that renders a codespace app.
 *
 * The transpiled code is loaded via a base64 data URI to avoid
 * needing a separate JS endpoint for the main module. The import map
 * handles resolving bare specifiers like "react" to CDN URLs.
 */
export function buildEmbedHtml(params: EmbedHtmlParams): string {
  const importMapJson = JSON.stringify(buildImportMap(), null, 2);

  // Encode transpiled code as base64 data URI.
  // Buffer is available in Node.js runtime (not Edge, but we use Node runtime).
  const transpiledBase64 = Buffer.from(params.transpiled, "utf-8").toString(
    "base64",
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitize(params.codeSpace)} - spike.land</title>
  <script type="importmap">${importMapJson}</script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
  </style>
  <style id="session-css">${sanitizeCss(params.css)}</style>
</head>
<body>
  <div id="embed">${params.html}</div>
  <script type="module">
    import { createElement } from "react";
    import { createRoot } from "react-dom/client";

    try {
      const mod = await import("data:text/javascript;base64,${transpiledBase64}");
      const App = mod.default || mod;

      const root = document.getElementById("embed");
      if (root && typeof App === "function") {
        createRoot(root).render(createElement(App));
      }
    } catch (err) {
      console.error("[spike.land embed] Failed to render app:", err);
    }
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

/** Escape HTML-sensitive characters in text content. */
function sanitize(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Basic CSS sanitization: strip </style> tags that could break out
 * of the inline style block.
 */
function sanitizeCss(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}
