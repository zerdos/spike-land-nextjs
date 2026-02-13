# `/create/*` Route Architecture: Vibe Coding, Edit & Execute

> How the AI app generator, live display, and vibe code editing system work end-to-end.

---

## 1. Overview

The `/create/*` routes power spike.land's AI app generator. Users describe an app in natural language, Claude generates a React component, and the result runs live in a sandboxed iframe. Users can then iteratively edit the app through "vibe coding" — a chat-based interface where Claude reads and modifies the code using MCP tools.

**Core flow:**
1. User enters a prompt on `/create`
2. Server streams AI-generated React code via SSE
3. Code is transpiled, bundled with esbuild-wasm, and wrapped in an HTML template
4. The HTML is served via `/api/codespace/[id]/bundle` and displayed in a sandboxed iframe
5. User can open the Vibe Code panel to iteratively edit the running app

---

## 2. Route Structure

### `/create` — Landing Page

**File:** `src/app/create/page.tsx`

- Server component, `force-dynamic` rendering
- Fetches popular apps via `getTopApps(12)` and recent apps via `getRecentApps(9)`
- De-duplicates recent apps that already appear in popular
- Renders `CreateHero` with `ComposerBox` (prompt input) and starter idea chips
- Displays two grids of `LiveAppCard` components: "Popular Apps" and "Recently Created"

### `/create/[...slug]` — App Display / Generation Page

**File:** `src/app/create/[...slug]/page.tsx`

- Catch-all dynamic route — slug can be multi-segment (e.g., `/create/tic-tac-toe`)
- Fetches app via `getCreatedApp(slug)` and related apps via `getRelatedPublishedApps(slug, 6)`
- **If PUBLISHED**: Renders `LiveAppDisplay` + `VibeCodeSidebar` + `VibeCodeActivator`, increments view count
- **Otherwise** (Generating/Failed/New): Renders `StreamingApp` to trigger AI generation

### Layout

**File:** `src/app/create/layout.tsx`

- Wraps all `/create/*` pages with `VibeCodeProvider` context
- Renders `VibeCodeFAB` (floating action button) for opening the vibe code panel
- Applies base layout: `min-h-screen flex flex-col bg-zinc-950`

---

## 3. Component Architecture

### `LiveAppDisplay`

**File:** `src/components/create/live-app-display.tsx`

Full-screen iframe display for published apps with error recovery.

| Prop | Type | Description |
|------|------|-------------|
| `codespaceId` | `string` | Codespace identifier for bundle URL |
| `codespaceUrl` | `string` | (unused in current implementation) |
| `title` | `string` | App title for header |
| `slug` | `string` | URL slug for display |

**Key behavior:**
- Renders iframe pointing to `/api/codespace/{codespaceId}/bundle`
- **Error detection:** Listens for `postMessage` events of type `iframe-error` from the iframe
- **Auto-rebuild:** On first error, retries with `?rebuild=true` query param
- **Error UI:** On second failure, shows error overlay with "Try Again" button
- **Vibe code refresh:** Listens to `refreshCounter` from `VibeCodeContext` — when code is edited, the iframe reloads
- **Toolbar:** Back to `/create`, "Create Your Own" CTA, refresh, open in new tab, download as HTML
- **Sandbox:** `allow-scripts allow-popups allow-forms` (no `allow-same-origin`)

### `LiveAppPreview`

**File:** `src/components/create/live-app-preview.tsx`

Scaled thumbnail preview with lazy loading, used in gallery cards.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `codespaceId` | `string` | — | Codespace for bundle URL |
| `scale` | `number` | — | CSS transform scale (e.g., 0.35) |
| `lazy` | `boolean` | `true` | Uses IntersectionObserver |
| `fallbackTitle` | `string` | — | Title shown in error fallback |
| `onHealthStatus` | `(healthy: boolean) => void` | — | Callback for health checks |

**Key behavior:**
- **Lazy loading:** Uses `IntersectionObserver` with `rootMargin: 50px`
- **Load states:** `idle` → `loading` → `loaded` | `error`
- **Health check:** Background fetch to `/api/create/health?codespaceId=...` after load
- **Error detection:** Listens for `iframe-error` postMessage
- **Timeout:** 15s load timeout
- **Error fallback:** Icon + title + "Preview unavailable"

### `StreamingApp`

**File:** `src/components/create/streaming-app.tsx`

Generation UI that triggers AI app creation via SSE streaming.

| Prop | Type | Description |
|------|------|-------------|
| `path` | `string[]` | Route segments (e.g., `["tic-tac-toe"]`) |

**Key behavior:**
- Auto-triggers `startGeneration()` on mount
- POST to `/api/create/stream` with `{ path }`
- Status handling: 401 → sign-in redirect, 429 → rate limit, 202 → already generating (polls every 3s)
- On success: `router.refresh()` → server re-render shows PUBLISHED app
- Shows error UI with "Try Again", generated code snippet, and build log
- 120s request timeout

### `LiveAppCard`

**File:** `src/components/create/live-app-card.tsx`

Gallery card wrapping a live preview thumbnail.

**Key behavior:**
- Tracks `isHealthy` via `LiveAppPreview`'s `onHealthStatus` callback
- Falls back to static `AppCard` if no `codespaceId` or unhealthy
- Uses `LiveAppPreview` with `scale={0.35}` for card aspect ratio
- Hover effect: gradient overlay darkens, description panel slides up
- View transition: `viewTransitionName: "app-card-{slug}"`

### Vibe Code Components

| Component | File | Purpose |
|-----------|------|---------|
| `VibeCodeProvider` | `src/components/create/vibe-code-provider.tsx` | Context provider: messages, streaming, refresh counter |
| `VibeCodePanel` | `src/components/create/vibe-code-panel.tsx` | Chat UI: desktop sidebar (w-96) or mobile bottom sheet |
| `VibeCodeFAB` | `src/components/create/vibe-code-fab.tsx` | Floating action button at bottom-right |
| `VibeCodeActivator` | `src/components/create/vibe-code-activator.tsx` | Sets app context (slug, title, codespaceId) in provider |
| `VibeCodeInput` | `src/components/create/vibe-code-input.tsx` | Text input + image upload + screenshot button |
| `VibeCodeMessages` | `src/components/create/vibe-code-messages.tsx` | Scrollable message list |
| `VibeCodeSidebar` | `src/components/create/vibe-code-sidebar.tsx` | Links + related apps sidebar |

**`VibeCodeProvider` context value:**

```typescript
interface VibeCodeContextValue {
  isOpen: boolean;
  mode: "plan" | "edit";
  messages: VibeMessage[];
  appContext: AppContext | null;   // { slug, title, codespaceId }
  agentStage: AgentStage | null;  // "initialize" | "connecting" | "executing_tool"
  isStreaming: boolean;
  refreshCounter: number;         // increments when code is updated
  openPanel: () => void;
  closePanel: () => void;
  setMode: (mode) => void;
  sendMessage: (content, images?, autoScreenshot?) => Promise<void>;
  setAppContext: (ctx) => void;
  clearMessages: () => void;
}
```

---

## 4. Bundle Pipeline (The Critical Path)

This is the most important system — it transforms user code into a running app.

### Pipeline Overview

```
Session (DB)
  │
  ├─ code (TypeScript/JSX source)
  ├─ transpiled (JS output from js.spike.land)
  ├─ html (initial HTML content)
  └─ css (user CSS)
        │
        ▼
  Auto-transpile if needed
  (POST to js.spike.land/transpile)
        │
        ▼
  ┌─────────────────────────┐
  │ bundleCodespace()       │
  │ (esbuild-wasm IIFE)    │
  │                         │
  │  1. Rewrite export to   │
  │     createRoot().render │
  │  2. esbuild.build()    │
  │     - IIFE format       │
  │     - serverFetchPlugin │
  │     - Minified          │
  │  3. Separate JS + CSS   │
  └────────┬────────────────┘
           │
     SUCCESS │ FAILURE
           │       │
           ▼       ▼
  buildBundleHtml()  buildEmbedHtml()
  (IIFE bundle,     (import-map,
   all deps inlined)  CDN at runtime)
           │       │
           └───┬───┘
               ▼
         iframe src=
  /api/codespace/{id}/bundle
```

### Bundle Route

**File:** `src/app/api/codespace/[codeSpace]/bundle/route.ts`

**`GET /api/codespace/[codeSpace]/bundle`**

1. **Load session** via `getOrCreateSession(codeSpace)`
2. **Auto-transpile** if no transpiled code or `?rebuild=true`
3. **Cache check** via Redis: `getBundleCache(codeSpace, sessionHash)` (skip on rebuild)
4. **Build bundle** via `bundleCodespace()` with 10s timeout
5. **On failure** → check `getBundleFallbackCache()` → build `buildFallbackHtml()` using import-map embed
6. **On success** → wrap in `buildBundleHtml()` template
7. **Cache result** in Redis via `setBundleCache()`
8. **Respond** with HTML + CSP headers

**Query params:**
- `?rebuild=true` — force re-transpile and rebuild, bypasses cache, deletes existing cache entries
- `?download=true` — sets `Content-Disposition: attachment` for file download

**CSP policy:**
```
default-src 'self' https://testing.spike.land;
script-src 'unsafe-inline' 'wasm-unsafe-eval' https://esm.sh https://testing.spike.land data:;
style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src * data: blob:;
connect-src * https://testing.spike.land wss://testing.spike.land;
```

### esbuild-wasm Bundler

**File:** `src/lib/codespace/bundler.ts`

**`bundleCodespace(session)`** — Server-side bundling:

1. **Code rewrite:** Replaces `export { X as default }` with:
   ```js
   import {createRoot} from "react-dom/client";
   createRoot(document.getElementById("embed")).render(jsx(X, {}));
   ```
2. **esbuild configuration:**
   - Format: `iife` (Immediately Invoked Function Expression)
   - Platform: `browser`, target: `es2022`
   - Minified, tree-shaken
   - Plugin: `serverFetchPlugin(cache)` for dependency resolution
3. **`serverFetchPlugin`** resolves imports:
   - Bare specifiers (e.g., `"react"`) → import map → esm.sh CDN URLs
   - HTTP URLs → fetched and cached
   - `/@/` paths → `https://testing.spike.land/@/...`
   - Unknown specifiers → `esm.sh/{pkg}?bundle=true&deps=react@19.2.4,...`
   - CSS → `@import` inlined, `url()` fonts converted to base64

**Singleton init:** `src/lib/codespace/esbuild-init.ts` — must call `ensureEsbuildReady()` before `esbuild.build()`

### Two HTML Templates

#### `buildBundleHtml()` — IIFE Bundle (Primary)

**File:** `src/lib/codespace/bundle-template.ts`

Used when esbuild succeeds. All dependencies are inlined — no CDN requests at runtime.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Google Fonts preload -->
    <style type="text/tailwindcss">
      @import "tailwindcss";
      @theme inline { /* shadcn/ui color tokens */ }
      :root { /* HSL color values */ }
      @layer base { /* global styles */ }
      @keyframes /* animations */
    </style>
    <script type="module">import "https://esm.sh/@tailwindcss/browser"</script>
    <style>/* user CSS */</style>
  </head>
  <body>
    <div id="embed"><!-- initial HTML --></div>
    <script>/* error reporting IIFE */</script>
    <script>/* bundled IIFE (all JS inlined) */</script>
  </body>
</html>
```

#### `buildEmbedHtml()` — Import Map Fallback

**File:** `src/lib/codespace/html-template.ts`

Used when esbuild fails. Dependencies loaded at runtime from esm.sh CDN.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <base href="https://testing.spike.land/" />
    <!-- Google Fonts preload -->
    <style type="text/tailwindcss">
      /* identical Tailwind config */
    </style>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@19.2.4",
        "react-dom/client": "https://esm.sh/react-dom@19.2.4/client?deps=...",
        "@emotion/react": "https://esm.sh/@emotion/react?deps=...",
        "framer-motion": "https://esm.sh/framer-motion?deps=...",
        "recharts": "https://esm.sh/recharts?deps=..."
      }
    }
    </script>
    <script type="module">import "https://esm.sh/@tailwindcss/browser"</script>
  </head>
  <body>
    <div id="embed"><!-- initial HTML --></div>
    <script type="module">/* transpiled code with createRoot().render() */</script>
  </body>
</html>
```

The bundle route wraps this with `buildFallbackHtml()` which injects the same error-reporting script used by `buildBundleHtml()`.

### Error Reporting (iframe → parent)

Both templates inject a script that:
1. Captures `window.onerror` (syntax/runtime errors)
2. Captures `unhandledrejection` (Promise rejections)
3. Sets a **5-second render timeout** — if `#embed` is still empty after 5s, reports an error

Reports via `parent.postMessage()`:
```javascript
parent.postMessage({
  type: "iframe-error",
  source: "spike-land-bundle",
  codeSpace: "...",
  message: "...",
  stack: "..."
}, "*");
```

`LiveAppDisplay` listens for these messages. On first error, it auto-rebuilds. On second error, it shows the error UI.

### Cache Layer

**File:** `src/lib/codespace/bundle-cache.ts`

Redis-based caching with two tiers:
- **Primary:** `bundle:{codeSpace}:{hash}` — cached `buildBundleHtml()` output
- **Fallback:** `bundle-fallback:{codeSpace}:{hash}` — cached `buildFallbackHtml()` output (shorter TTL)

On `?rebuild=true`, both cache entries are deleted before rebuilding.

---

## 5. MCP Server Integration

### Agent SDK MCP Server (Next.js)

**File:** `src/lib/claude-agent/tools/codespace-tools.ts`

Factory function `createCodespaceServer(codespaceId)` returns an MCP server with these tools:

| Tool | Mode | Description |
|------|------|-------------|
| `read_code` | plan, edit | Reads current code from session |
| `update_code` | edit | Replaces entire code, transpiles, saves |
| `edit_code` | edit | Line-based edits (insert, replace, delete) |
| `search_and_replace` | edit | Regex or literal find/replace |
| `find_lines` | plan, edit | Search for patterns, returns line numbers |
| `validate_code` | plan, edit | Check for TS/JSX errors without saving |

**Tool name format:** `mcp__codespace__<tool_name>` (Agent SDK convention)

**Validation:** Codespace ID must match `/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/`, max 100 chars, no `..`, `/`, `\`

### Cloudflare Worker MCP Server

**Location:** `packages/testing.spike.land/src/mcp/`

```
mcp/
├── handler.ts          # JSON-RPC 2.0 request dispatcher
├── index.ts            # Exports
├── types.ts            # Type definitions
└── tools/
    ├── edit-tools.ts   # update_code, edit_code, search_and_replace
    ├── find-tools.ts   # find_lines
    └── read-tools.ts   # read_code, read_html, read_session
```

Same tool set as the Agent SDK version, but uses JSON-RPC 2.0 protocol and runs on Cloudflare Workers.

### Legacy MCP Handler (Next.js)

**File:** `src/lib/codespace/mcp-tools.ts`

Port of the Cloudflare Worker MCP server for use in Next.js API routes. Dispatches `initialize`, `tools/list`, `tools/call` methods via `handleMcpRequest()`.

---

## 6. Vibe Code Editing Flow

```
User clicks FAB
       │
       ▼
VibeCodePanel opens
       │
User types message
       │
       ▼
sendMessage() in VibeCodeProvider
       │
  ┌────┴────┐
  │ Auth?   │ No → signIn() redirect
  └────┬────┘
       │ Yes
       ▼
POST /api/create/vibe-chat
  (SSE stream)
       │
       ├── event: stage → update agentStage UI
       ├── event: chunk → append to assistant message
       ├── event: code_updated → refreshCounter++
       ├── event: error → show error in chat
       └── event: complete → finalize message
       │
       ▼ (on code_updated)
LiveAppDisplay detects refreshCounter change
       │
       ▼
iframe reloads bundle endpoint
       │
       ▼
Updated app renders in iframe
```

### Vibe Chat API Route

**File:** `src/app/api/create/vibe-chat/route.ts`

1. **Rate limit:** IP-based, 10 req/min
2. **Auth check:** Edit mode requires authenticated session
3. **AI config:** Resolves `CLAUDE_CODE_OAUTH_TOKEN` from DB or env
4. **MCP server:** `createCodespaceServer(codespaceId)` with allowed tools based on mode
5. **System prompt:** Mode preamble + current code injected
6. **Multi-modal message:** Text + optional images + optional auto-screenshot
7. **Agent SDK `query()`:** Streams response using `mcpServers: { codespace: server }`
8. **SSE events:** `stage`, `chunk`, `code_updated`, `error`, `complete`
9. **Code update detection:** Compares session code after agent finishes

### Mode System

| Mode | Tools Available | Description |
|------|----------------|-------------|
| `plan` | `read_code`, `find_lines`, `validate_code` | Read-only analysis, no changes |
| `edit` | All 6 tools | Full read/write access to code |

### Message Persistence

- Last 50 messages saved to `sessionStorage` per slug
- Key format: `vibe-messages-{slug}`
- Base64 images stripped to `[image]` placeholder to save space

---

## 7. Testing Coverage

### Component Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/components/create/live-app-display.test.tsx` | Iframe refresh, error handling (postMessage), toolbar actions, auto-rebuild |
| `src/components/create/live-app-preview.test.tsx` | Lazy loading, health checks, error fallback, timeout |
| `src/components/create/streaming-app.test.tsx` | Generation flow, error states, retry, status codes |
| `src/components/create/live-app-card.test.tsx` | Health-based fallback, hover effects |
| `src/components/create/vibe-code-provider.test.tsx` | SSE streaming, message persistence, auth guard, refresh counter |
| `src/components/create/vibe-code-panel.test.tsx` | Mode toggle, desktop/mobile layout |
| `src/components/create/vibe-code-fab.test.tsx` | Auth guard, panel open trigger |
| `src/components/create/vibe-code-input.test.tsx` | Message submission, image upload |
| `src/components/create/vibe-code-messages.test.tsx` | Message rendering, scroll behavior |
| `src/components/create/vibe-code-activator.test.tsx` | Context injection |
| `src/components/create/vibe-code-sidebar.test.tsx` | Related apps display |
| `src/components/create/composer-box.test.tsx` | Prompt input, starter ideas |
| `src/components/create/app-card.test.tsx` | Static card rendering |

### Library Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/lib/codespace/bundler.test.ts` | esbuild output parsing, export rewrite, plugin caching |
| `src/lib/codespace/bundle-template.test.ts` | `buildBundleHtml()` output: Tailwind script, error script, JS/CSS placement |
| `src/lib/codespace/bundle-cache.test.ts` | Redis cache operations, TTL |
| `src/lib/codespace/esbuild-init.test.ts` | esbuild-wasm initialization singleton |
| `src/lib/codespace/transpile.test.ts` | TypeScript/JSX transpilation via js.spike.land |
| `src/lib/claude-agent/tools/codespace-tools.test.ts` | ID validation, tool operations (read, update, edit, search, find, validate) |

### API Route Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/app/api/codespace/[codeSpace]/bundle/route.test.ts` | GET handler, rebuild logic, fallback on error, cache hit/miss, download mode |
| `src/app/api/create/stream/route.test.ts` | Stream generation endpoint |
| `src/app/api/create/health/route.test.ts` | Health check endpoint |
| `src/app/api/create/vibe-chat/route.test.ts` | Vibe chat streaming, auth, rate limit |

### E2E Tests

| Test File | What It Tests |
|-----------|---------------|
| `e2e/step-definitions/app-creation.steps.ts` | Full app creation flow |
| `e2e/features/my-apps-production.feature` | Production app gallery |

---

## 8. THE ISSUE: Apps Show Unstyled/Blank

### Symptoms

Apps at `/create/*` render their React DOM but appear completely unstyled — white background, no colors, no layout, no typography. The HTML structure is present but zero CSS is applied.

### Root Cause Chain

There are **two compounding issues**:

#### Issue 1: esbuild-wasm Fails on Vercel Production

The bundle endpoint (`/api/codespace/{id}/bundle`) is serving the **fallback embed HTML** (import-map based) instead of the esbuild-bundled IIFE.

**Evidence:** Fetching a live bundle URL returns HTML containing:
- `<script type="importmap">` with esm.sh CDN mappings
- `await import("react-dom/client")` pattern
- This is `buildEmbedHtml()`, NOT `buildBundleHtml()`

**Why:** `bundleCodespace()` is throwing or timing out (10s limit), triggering the fallback path in the bundle route (lines 146-174). esbuild-wasm has known issues in serverless environments like Vercel where WASM initialization can be slow or fail entirely.

#### Issue 2: Both Templates Depend on `@tailwindcss/browser` Runtime

**ALL CSS** in both templates is defined inside `<style type="text/tailwindcss">` tags. This includes:

- shadcn/ui color tokens (`--background`, `--foreground`, `--primary`, etc.)
- Base styles (`body { background-color: ... }`, `* { border-color: ... }`)
- Animations (`accordion-down`, `accordion-up`, `gradient-x`)
- Custom properties for border radius

**The problem:** Browsers natively **ignore** `<style type="text/tailwindcss">` — they only process `<style>` (no type) or `<style type="text/css">`. The `@tailwindcss/browser` runtime must load and process these styles.

The runtime is loaded via:
```html
<script type="module">import "https://esm.sh/@tailwindcss/browser"</script>
```

If this module fails to load or execute, **zero CSS is applied** and apps appear blank.

#### Issue 3: Sandbox + Module CORS Interaction (Suspect)

The iframe uses `sandbox="allow-scripts allow-popups allow-forms"` but does NOT include `allow-same-origin`. This means:

- The iframe runs in an **opaque origin** (`null`)
- `<script type="module">` with cross-origin imports requires CORS
- The opaque origin sends `Origin: null` in requests
- esm.sh returns `Access-Control-Allow-Origin: *` which should accept `null`, but **browser behavior varies**
- If the module import silently fails, `@tailwindcss/browser` never runs → no styles

### What Was Investigated

| Investigation | Result |
|---------------|--------|
| Fetched live bundle endpoint | Confirmed fallback template served (import-map, not esbuild IIFE) |
| Checked esm.sh dependencies | React 19.2.4 and @tailwindcss/browser 4.1.18 both serve valid JS |
| Health check endpoint | Returns `{"healthy": true}` — but doesn't test actual rendering |
| Code analysis | Identified two-template system, fallback path, error detection flow |
| MCP integration | Fully functional tool chain confirmed |
| Error reporting script | 5s timeout may report false positive if Tailwind JIT is slow |

### Potential Fixes

1. **Fix esbuild-wasm on Vercel** — Ensure `ensureEsbuildReady()` works in serverless. Consider pre-initializing, increasing timeout, or using native esbuild via a build step instead of WASM.

2. **Add a plain `<style>` fallback** — Include critical CSS in a regular `<style>` tag (not `type="text/tailwindcss"`) so apps have baseline styling even if `@tailwindcss/browser` fails.

3. **Add `allow-same-origin` to sandbox** — This would let module imports work reliably, but has security implications (iframe can access parent's cookies/storage).

4. **Self-host `@tailwindcss/browser`** — Bundle the Tailwind runtime inline to avoid any CDN/CORS issues entirely.

5. **Increase render timeout** — The 5s timeout may be too aggressive if `@tailwindcss/browser` takes time to JIT-compile styles, causing false error reports.

---

## 9. Architecture Diagram

```
                    ┌──────────────────────────────────────────┐
                    │              /create (landing)            │
                    │  ┌─────────────────────────────────────┐ │
                    │  │  ComposerBox → POST /api/create/   │ │
                    │  │  stream → redirect to /create/slug  │ │
                    │  └─────────────────────────────────────┘ │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
                    │  │LiveApp  │ │LiveApp  │ │LiveApp  │   │
                    │  │Card     │ │Card     │ │Card     │   │
                    │  └────┬────┘ └────┬────┘ └────┬────┘   │
                    └───────┼───────────┼───────────┼─────────┘
                            │           │           │
                    ┌───────┴───────────┴───────────┴─────────┐
                    │          /create/[slug] (app page)       │
                    │                                          │
                    │  IF PUBLISHED:                            │
                    │  ┌──────────────────┐ ┌───────────────┐  │
                    │  │  LiveAppDisplay  │ │ VibeCodePanel │  │
                    │  │  ┌────────────┐  │ │ (chat UI)     │  │
                    │  │  │  <iframe>  │  │ │               │  │
                    │  │  │  sandbox   │  │ │ ┌───────────┐ │  │
                    │  │  │            │  │ │ │ Messages  │ │  │
                    │  │  └─────┬──────┘  │ │ │ Input     │ │  │
                    │  └────────┼─────────┘ │ └───────────┘ │  │
                    │           │            └───────┬───────┘  │
                    │  IF GENERATING:                │          │
                    │  ┌──────────────────┐          │          │
                    │  │  StreamingApp    │          │          │
                    │  │  (SSE + spinner) │          │          │
                    │  └──────────────────┘          │          │
                    └───────────┼────────────────────┼──────────┘
                                │                    │
                    ┌───────────▼────────┐ ┌────────▼──────────┐
                    │ /api/codespace/    │ │ /api/create/      │
                    │ [id]/bundle        │ │ vibe-chat          │
                    │                    │ │                    │
                    │ Session → Transpile│ │ Claude Agent SDK   │
                    │ → esbuild → HTML   │ │ + MCP tools        │
                    │ → Cache (Redis)    │ │ → SSE events       │
                    └────────────────────┘ └────────────────────┘
```

---

## 10. Key File Index

| Category | File | Purpose |
|----------|------|---------|
| **Routes** | `src/app/create/page.tsx` | Landing page |
| | `src/app/create/layout.tsx` | Layout with VibeCodeProvider |
| | `src/app/create/[...slug]/page.tsx` | App display / generation |
| **Components** | `src/components/create/live-app-display.tsx` | Full iframe display |
| | `src/components/create/live-app-preview.tsx` | Thumbnail preview |
| | `src/components/create/streaming-app.tsx` | Generation UI |
| | `src/components/create/live-app-card.tsx` | Gallery card |
| | `src/components/create/vibe-code-provider.tsx` | Context + SSE |
| | `src/components/create/vibe-code-panel.tsx` | Chat panel UI |
| | `src/components/create/vibe-code-fab.tsx` | Floating button |
| **Bundle Pipeline** | `src/lib/codespace/bundler.ts` | esbuild-wasm bundler |
| | `src/lib/codespace/bundle-template.ts` | IIFE HTML template |
| | `src/lib/codespace/html-template.ts` | Import-map HTML template |
| | `src/lib/codespace/bundle-cache.ts` | Redis cache layer |
| | `src/lib/codespace/esbuild-init.ts` | esbuild-wasm singleton init |
| | `src/lib/codespace/transpile.ts` | TypeScript transpilation |
| | `src/lib/codespace/constants.ts` | React version, ESM CDN URL |
| **API Routes** | `src/app/api/codespace/[codeSpace]/bundle/route.ts` | Bundle endpoint |
| | `src/app/api/create/vibe-chat/route.ts` | Vibe chat SSE |
| | `src/app/api/create/stream/route.ts` | App generation stream |
| | `src/app/api/create/health/route.ts` | Health check |
| **MCP Tools** | `src/lib/claude-agent/tools/codespace-tools.ts` | Agent SDK MCP server |
| | `src/lib/codespace/mcp-tools.ts` | Legacy MCP handler |
| | `packages/testing.spike.land/src/mcp/` | Cloudflare Worker MCP |
