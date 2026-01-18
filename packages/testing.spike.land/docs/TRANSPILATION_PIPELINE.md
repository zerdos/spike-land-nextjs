# Transpilation Pipeline

This document provides a deep dive into how spike.land transforms source code
into browser-executable JavaScript. Understanding this pipeline is essential for
AI agents working with the codeSpace system.

---

## Table of Contents

- [Overview](#overview)
- [Pipeline Stages](#pipeline-stages)
- [importMapReplace Function](#importmapreplace-function)
- [js.spike.land Worker](#jsspikeland-worker)
- [Transformation Examples](#transformation-examples)
- [Testing](#testing)

---

## Overview

The transpilation pipeline converts TypeScript/JSX code into browser-compatible
JavaScript through multiple stages:

```
Source Code (TSX)
       ↓
┌──────────────────────┐
│  importMapReplace    │  ← Transform imports to CDN URLs
└──────────────────────┘
       ↓
┌──────────────────────┐
│  esbuild (wasm)      │  ← Transpile TSX → JS
└──────────────────────┘
       ↓
Browser-Ready JavaScript
```

### Key Goals

1. **Portability**: Same code runs server-side and client-side
2. **Zero Config**: No bundler configuration needed by users
3. **Live Updates**: Changes reflect immediately in browser
4. **External Bundles**: npm packages loaded from CDN (esm.sh)

---

## Pipeline Stages

### Stage 1: Import Transformation

The `importMapReplace` function rewrites import statements before transpilation:

```typescript
// Before
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// After
import { Button } from "/@/components/ui/button.mjs";
import { motion } from "/@/workers/framer-motion.mjs";
```

### Stage 2: TypeScript/JSX Transpilation

esbuild-wasm compiles TypeScript and JSX:

```typescript
// Before (TSX)
const App = () => <div className="p-4">Hello</div>;

// After (JS)
const App = () => React.createElement("div", { className: "p-4" }, "Hello");
```

### Stage 3: CSS Extraction (Optional)

For builds with `splitting: true`, CSS is extracted to separate files.

---

## importMapReplace Function

**Location**: `packages/code/src/@/lib/importmap-utils.ts`

This function is the core of import transformation. It handles multiple import
patterns and converts them to browser-compatible URLs.

### Configuration Constants

```typescript
// File extensions that are preserved
const FILE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".wasm",
  ".css",
  ".scss",
  ".svg",
  ".md",
  ".html", /* ... */
]);

// Worker file patterns (get .js extension)
const WORKER_PATTERNS = ["/workers/", ".worker"];

// Internal component patterns (get .mjs extension)
const COMPONENT_PATTERNS = [
  "@/components/",
  "@/services/",
  "@/config/",
  "@/utils/",
  "@/tools/",
  "@/workflows/",
  "/live/",
  "@/lib",
  "@/external",
  "@/hooks",
];

// Dependencies bundled externally
const EXTERNAL_DEPENDENCIES = [
  "react",
  "react-dom",
  "framer-motion",
  "@emotion/react",
  "@emotion/styled",
];
```

### Import Map (Default Mappings)

```typescript
export const importMap: ImportMap = {
  imports: {
    "/@/": "/@/",
    "@emotion/react/jsx-runtime": "/emotionJsxRuntime.mjs",
    "@emotion/react/jsx-dev-runtime": "/emotionJsxRuntime.mjs",
    "@emotion/styled": "/emotionStyled.mjs",
    "react/jsx-runtime": "/jsx.mjs",
    "react-dom/server": "/reactDomServer.mjs",
    "react-dom/client": "/reactDomClient.mjs",
    "@emotion/react": "/emotion.mjs",
    "react": "/reactMod.mjs",
    "framer-motion": "/@/workers/framer-motion.mjs",
    "react-dom": "/reactDom.mjs",
  },
};
```

### Transformation Logic

The function applies different transformations based on import type:

#### 1. Exact Matches (Import Map)

```typescript
// Input
import React from "react";

// Output (uses importMap)
import React from "/reactMod.mjs";
```

#### 2. Worker Files

```typescript
// Input
import * as Monaco from "@/workers/monaco-editor.worker";

// Output (adds .mjs extension)
import * as Monaco from "/@/workers/monaco-editor.worker.mjs";
```

#### 3. Internal Components (@/ prefix)

```typescript
// Input
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Output (adds .mjs extension)
import { Button } from "/@/components/ui/button.mjs";
import { cn } from "/@/lib/utils.mjs";
```

#### 4. npm Packages (External)

```typescript
// Input
import confetti from "canvas-confetti";
import { __await, __rest } from "tslib";

// Output (CDN URL with bundle params)
import confetti from "/canvas-confetti?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled";
import {
  __await,
  __rest,
} from "/tslib?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled&exports=__await,__rest";
```

#### 5. Relative Imports

```typescript
// Input
import module from "./folder/";
import { helper } from "./utils/helper";

// Output (adds .mjs extension)
import module from "./folder/index.mjs";
import { helper } from "./utils/helper.mjs";
```

#### 6. Cross-CodeSpace Imports (/live/)

```typescript
// Input (preserved - not transformed)
import Component from "/live/other-codespace";

// Output (unchanged)
import Component from "/live/other-codespace";
```

### Skip Conditions

The function skips transformation when:

- Code already has `/** importMapReplace */` marker
- Code contains `/* esm.sh` comment
- Path has `?bundle=true` parameter
- Path is a data: URL
- Path is http:// or https:// URL
- Path starts with `/live/`

---

## js.spike.land Worker

**Location**: `packages/js.spike.land/src/index.ts`

This Cloudflare Worker provides the transpilation service.

### API Endpoints

#### POST / - Transpile Code

Transpiles provided code and returns JavaScript:

```bash
curl -X POST https://js.spike.land \
  -H "Content-Type: text/plain" \
  -H "TR_ORIGIN: https://testing.spike.land" \
  --data 'export default () => <div>Hello</div>;'
```

**Response**: Transpiled JavaScript code

#### GET /?codeSpace={name} - Build CodeSpace

Builds an entire codeSpace from the server:

```bash
curl "https://js.spike.land?codeSpace=my-app&origin=testing"
```

**Parameters**:

- `codeSpace`: The codeSpace identifier
- `origin`: `testing` or `production`

**Response**: Bundled JavaScript or JSON with build artifacts

### Implementation Details

```typescript
// Transpile function
const initAndTransform = (code: string, origin: string) =>
  transpile({ code, originToUse: origin, wasmModule });

// Build function (for full codeSpace)
const results = await build({
  codeSpace,
  origin,
  format: "esm",
  splitting: false,
  external: ["/*"],
  wasmModule,
});
```

---

## Transformation Examples

### Example 1: Basic Component

**Input**:

```tsx
import { motion } from "framer-motion";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      onClick={() => setCount(c => c + 1)}
    >
      Count: {count}
    </motion.button>
  );
}
```

**After importMapReplace**:

```tsx
/** importMapReplace */
import { motion } from "/@/workers/framer-motion.mjs";
import { useState } from "/reactMod.mjs";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      onClick={() => setCount(c => c + 1)}
    >
      Count: {count}
    </motion.button>
  );
}
```

### Example 2: External Libraries

**Input**:

```tsx
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { MoonIcon, SunIcon } from "lucide-react";

export default function App() {
  return <button onClick={() => confetti()}>Celebrate!</button>;
}
```

**After importMapReplace**:

```tsx
/** importMapReplace */
import confetti from "/canvas-confetti?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled";
import { format } from "/date-fns?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled&exports=format";
import {
  MoonIcon,
  SunIcon,
} from "/lucide-react?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled&exports=MoonIcon,SunIcon";

export default function App() {
  return <button onClick={() => confetti()}>Celebrate!</button>;
}
```

### Example 3: Dynamic Imports

**Input**:

```tsx
const loadModule = async () => {
  const mod = await import("heavy-library");
  return mod.default;
};
```

**After importMapReplace**:

```tsx
/** importMapReplace */
const loadModule = async () => {
  const mod = await import(
    "/heavy-library?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled"
  );
  return mod.default;
};
```

### Example 4: Re-exports

**Input**:

```tsx
export { bar as default, foo } from "module";
export * from "./utils/helpers";
```

**After importMapReplace**:

```tsx
/** importMapReplace */
export {
  bar as default,
  foo,
} from "/module?bundle=true&external=react,react-dom,framer-motion,@emotion/react,@emotion/styled&exports=foo,bar";
export * from "./utils/helpers.mjs";
```

---

## Testing

The `importMapReplace` function has comprehensive unit tests covering all scenarios.

**Test Location**: `packages/code/src/__tests__/importmap-utils.spec.ts`

### Test Categories

1. **Basic imports**: Named imports, default imports, specific exports
2. **Worker imports**: Worker file transformations
3. **Path imports**: Relative paths, directory imports, extensions
4. **URL imports**: Data URLs, live URLs, http/https URLs
5. **Dynamic imports**: Runtime imports with various patterns
6. **Export variations**: Re-exports, namespace exports
7. **Special syntax**: Comments, multi-line imports, unicode
8. **Module types**: CSS, JSON, WASM, SVG modules
9. **Package imports**: Scoped packages, TypeScript aliases
10. **Edge cases**: Double processing prevention, complex paths

### Running Tests

```bash
cd packages/code
yarn test importmap-utils
```

### Snapshot Testing

Each transformation is verified against snapshots:

```typescript
it(`${description}: ${name}`, () => {
  const result = importMapReplace(code);
  expect({ result, code }).toMatchSnapshot();
});
```

---

## CDN Integration

The transformed URLs resolve to esm.sh CDN:

```
/package-name?bundle=true&external=react,...
    ↓
https://esm.sh/package-name?bundle&external=react,...
```

### Query Parameters

| Parameter      | Purpose                     |
| -------------- | --------------------------- |
| `bundle=true`  | Bundle all dependencies     |
| `external=...` | Dependencies not to bundle  |
| `exports=...`  | Specific exports to include |

### Benefits

1. **No build step**: Dependencies loaded on-demand
2. **Tree shaking**: Only requested exports included
3. **Caching**: CDN caches common packages
4. **Version control**: Package versions resolved automatically

---

## Related Documentation

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) - Agent rules and recipes
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [MCP_TOOLS.md](./MCP_TOOLS.md) - How MCP triggers transpilation
