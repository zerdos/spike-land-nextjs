import { ESM_CDN, ESM_DEPS_PARAM, REACT_VERSION } from "./constants";

const D = ESM_DEPS_PARAM;

export const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <base href="https://testing.spike.land/" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>spike.land</title>
    <link
      rel="preload"
      href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap"
      as="style"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap"
      rel="stylesheet"
    />
    
    <style type="text/tailwindcss">
    @import "tailwindcss";

    @custom-variant dark (&:where(.dark, .dark *));

    @theme inline {
      --color-background: hsl(var(--background));
      --color-foreground: hsl(var(--foreground));
      --color-card: hsl(var(--card));
      --color-card-foreground: hsl(var(--card-foreground));
      --color-popover: hsl(var(--popover));
      --color-popover-foreground: hsl(var(--popover-foreground));
      --color-primary: hsl(var(--primary));
      --color-primary-foreground: hsl(var(--primary-foreground));
      --color-secondary: hsl(var(--secondary));
      --color-secondary-foreground: hsl(var(--secondary-foreground));
      --color-muted: hsl(var(--muted));
      --color-muted-foreground: hsl(var(--muted-foreground));
      --color-accent: hsl(var(--accent));
      --color-accent-foreground: hsl(var(--accent-foreground));
      --color-destructive: hsl(var(--destructive));
      --color-destructive-foreground: hsl(var(--destructive-foreground));
      --color-border: hsl(var(--border));
      --color-input: hsl(var(--input));
      --color-ring: hsl(var(--ring));
      --color-sidebar: hsl(var(--sidebar-background));
      --color-sidebar-foreground: hsl(var(--sidebar-foreground));
      --color-sidebar-primary: hsl(var(--sidebar-primary));
      --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
      --color-sidebar-accent: hsl(var(--sidebar-accent));
      --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
      --color-sidebar-border: hsl(var(--sidebar-border));
      --color-sidebar-ring: hsl(var(--sidebar-ring));
      --radius-lg: var(--radius);
      --radius-md: calc(var(--radius) - 2px);
      --radius-sm: calc(var(--radius) - 4px);
      --animate-accordion-down: accordion-down 0.2s ease-out;
      --animate-accordion-up: accordion-up 0.2s ease-out;
      --animate-gradient-x-slow: gradient-x 30s ease infinite;
      --animate-gradient-x-normal: gradient-x 20s ease infinite;
      --animate-gradient-x-fast: gradient-x 10s ease infinite;
    }

    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;
      --sidebar-background: 0 0% 98%;
      --sidebar-foreground: 240 5.3% 26.1%;
      --sidebar-primary: 240 5.9% 10%;
      --sidebar-primary-foreground: 0 0% 98%;
      --sidebar-accent: 240 4.8% 95.9%;
      --sidebar-accent-foreground: 240 5.9% 10%;
      --sidebar-border: 220 13% 91%;
      --sidebar-ring: 217.2 91.2% 59.8%;
    }

    @layer base {
      * {
        border-color: hsl(var(--border));
      }
      body {
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
      }
    }

    @keyframes accordion-down {
      from {
        height: 0;
      }
      to {
        height: var(--radix-accordion-content-height);
      }
    }
    @keyframes accordion-up {
      from {
        height: var(--radix-accordion-content-height);
      }
      to {
        height: 0;
      }
    }
    @keyframes gradient-x {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
    </style>

    <script type="importmap">
    // IMPORTMAP
    </script>
    <script type="module">import "${ESM_CDN}/@tailwindcss/browser"</script>
    <!-- CSS_LINKS -->
  </head>
  <style>
  /* criticalCss */
  </style>

  <body>
    <div id="embed"><!-- HTML_CONTENT --></div>
    <script type="module" src="/start.mjs"></script>
  </body>
</html>`;

export const IMPORT_MAP = {
  imports: {
    "react": `${ESM_CDN}/react@${REACT_VERSION}`,
    "react/jsx-runtime": `${ESM_CDN}/react@${REACT_VERSION}/jsx-runtime`,
    "react/jsx-dev-runtime": `${ESM_CDN}/react@${REACT_VERSION}/jsx-dev-runtime`,
    "react-dom": `${ESM_CDN}/react-dom@${REACT_VERSION}?${D}`,
    "react-dom/client": `${ESM_CDN}/react-dom@${REACT_VERSION}/client?${D}`,
    "react-dom/server": `${ESM_CDN}/react-dom@${REACT_VERSION}/server?${D}`,
    "@emotion/react": `${ESM_CDN}/@emotion/react?${D}`,
    "@emotion/react/jsx-runtime": `${ESM_CDN}/@emotion/react/jsx-runtime?${D}`,
    "@emotion/react/jsx-dev-runtime": `${ESM_CDN}/@emotion/react/jsx-dev-runtime?${D}`,
    "@emotion/styled": `${ESM_CDN}/@emotion/styled?${D}`,
    "framer-motion": `${ESM_CDN}/framer-motion?${D}`,
    "recharts": `${ESM_CDN}/recharts?${D}`,
  },
};

/**
 * Build a self-contained embed HTML page.
 *
 * All module imports use absolute esm.sh CDN URLs via the import map,
 * so no URL rewriting is needed. Transpiled code from js.spike.land uses
 * bare specifiers (e.g. `from "react"`) that the import map resolves.
 */
export function buildEmbedHtml(opts: {
  transpiled: string;
  html: string;
  css: string;
  codeSpace: string;
}): string {
  const importMapJson = JSON.stringify(IMPORT_MAP, null, 2);

  // Replace the default export with a createRoot().render() bootstrap.
  // Transpiled code ends with: export { ComponentName as default };
  // We capture the component name and use it in the render call.
  let code = opts.transpiled || "";
  code = code.replace(
    /export\s*\{\s*(\w+)\s+as\s+default\s*\}\s*;?\s*$/,
    `const {createRoot} = await import("react-dom/client");
createRoot(document.getElementById("embed")).render(jsx($1, {}));`,
  );

  return HTML_TEMPLATE
    .replace("// IMPORTMAP", importMapJson)
    .replace("<!-- HTML_CONTENT -->", opts.html || "")
    .replace("/* criticalCss */", opts.css || "")
    .replace(
      '<script type="module" src="/start.mjs"></script>',
      `<script type="module">${code}</script>`,
    );
}
