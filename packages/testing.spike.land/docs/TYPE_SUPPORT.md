# Type Support and ATA Worker

This document explains how spike.land provides TypeScript type support in the
Monaco editor through Automatic Type Acquisition (ATA).

---

## Table of Contents

- [Overview](#overview)
- [ATA Worker](#ata-worker)
- [Path Cleaning](#path-cleaning)
- [Monaco Integration](#monaco-integration)
- [Limitations](#limitations)
- [Roadmap](#roadmap)

---

## Overview

spike.land provides TypeScript IntelliSense in the browser-based Monaco editor
through Automatic Type Acquisition (ATA). This allows developers to get:

- **Type hints**: Hover information for variables and functions
- **Autocompletion**: Intelligent code suggestions
- **Error checking**: Type errors highlighted in the editor
- **Go to definition**: Navigation for imported modules

### How It Works

```
User types code
       │
       ▼
┌─────────────────┐
│  Monaco Editor  │
└────────┬────────┘
         │ Extract imports
         ▼
┌─────────────────┐
│   ATA Worker    │
│  (SharedWorker) │
└────────┬────────┘
         │ Fetch types
         ▼
┌─────────────────┐
│    esm.sh CDN   │
│  DefinitelyTyped│
└────────┬────────┘
         │ .d.ts files
         ▼
┌─────────────────┐
│ Monaco TypeScript│
│     Service     │
└─────────────────┘
```

---

## ATA Worker

**Location**: `packages/code/src/@/workers/ata.worker.ts`

The ATA worker runs in a SharedWorker context, allowing efficient type
acquisition across multiple tabs.

### Entry Point

```typescript
export async function ata({
  code,
  originToUse,
}: {
  code: string;
  originToUse: string;
}): Promise<ExtraLib[]> {
  // 1. Extract imports from code
  // 2. Run @typescript/ata
  // 3. Process and clean paths
  // 4. Fetch aliased imports (@/)
  // 5. Return type definitions
}
```

### ExtraLib Interface

```typescript
interface ExtraLib {
  filePath: string; // Virtual path for Monaco
  content: string; // Type definition content
}
```

### Core Libraries

The ATA automatically adds types for core libraries:

```typescript
const extCode = `${code}
import "react";
import "@emotion/react";
import * as JSXruntime "@emotion/react/jsx-runtime.d.ts";
import "react/jsx-runtime";
import "react/jsx-dev-runtime";
// ... additional core type imports
`;
```

---

## Path Cleaning

### Why Clean Paths?

Type definitions fetched from various sources have inconsistent paths:

- `https://esm.sh/v135/react@18.2.0/index.d.ts`
- `node_modules/@types/react/index.d.ts`
- `https://spike.land/@/components/button.d.ts`

Monaco needs clean, consistent virtual paths.

### cleanFilePath Function

```typescript
function cleanFilePath(filePath: string, originToUse: string): string {
  let cleaned = filePath
    .replace(originToUse, "")
    .replace("https://spike.land", "")
    .replace("https://esm.sh", "");

  cleaned = cleaned
    .replace(/\/node_modules\//g, "/")
    .replace(/@types\//g, "")
    .replace(/dist\//g, "")
    .replace(/types\//g, "")
    .replace(/src\//g, "")
    .replace(/declarations\//g, "")
    .replace(/\/v\d+\//g, "/"); // Remove version paths

  cleaned = cleaned.replace(/@(\^)?\d+(\.)?\d+(\.)?\d+/g, "");
  cleaned = cleaned.replace(/ts\d+\.\d+\//g, "");

  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }

  cleaned = cleaned.replace(/\/\//g, "/");

  return cleaned;
}
```

### cleanFileContent Function

```typescript
function cleanFileContent(content: string, originToUse: string): string {
  // Similar cleaning for import statements within .d.ts files
  let cleaned = content
    .replace(new RegExp(originToUse, "g"), "")
    .replace(/https:\/\/spike\.land/g, "")
    .replace(/https:\/\/esm\.sh/g, "");

  // Clean internal paths
  cleaned = cleaned
    .replace(/\/node_modules\//g, "/")
    .replace(/@types\//g, "");
  // ... similar patterns

  return cleaned;
}
```

### Path Transformation Examples

| Original                                         | Cleaned                        |
| ------------------------------------------------ | ------------------------------ |
| `https://esm.sh/v135/react@18.2.0/index.d.ts`    | `/react/index.d.ts`            |
| `node_modules/@types/lodash/index.d.ts`          | `/lodash/index.d.ts`           |
| `https://spike.land/@/components/ui/button.d.ts` | `/@/components/ui/button.d.ts` |

---

## Monaco Integration

### Adding Extra Libraries

```typescript
// After ATA completes
const extraLibs = await ata({ code, originToUse });

// Add to Monaco TypeScript service
extraLibs.forEach(({ filePath, content }) => {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    content,
    filePath,
  );
});
```

### Compiler Options

```typescript
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: monaco.languages.typescript.JsxEmit.React,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  strict: true,
});
```

### Diagnostic Options

```typescript
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
  diagnosticCodesToIgnore: [
    2307, // Cannot find module (handled separately)
    7016, // Could not find declaration file
  ],
});
```

---

## Import Specifier Extraction

### Using TypeScript AST

```typescript
function extractImportSpecifiers(code: string): string[] {
  const sourceFile = ts.createSourceFile(
    "temp.tsx",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const imports: string[] = [];

  function visit(node: ts.Node) {
    // Import declarations: import ... from "specifier"
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    } // Dynamic imports: import("specifier")
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        imports.push(arg.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...new Set(imports)];
}
```

### Aliased Import Handling

For `@/` prefixed imports (internal components):

```typescript
for (const specifier of importSpecifiers) {
  if (specifier.startsWith("@/")) {
    const fetchUrl = `${originToUse}/${specifier}.d.ts`;

    await fetch(fetchUrl)
      .then(async (response) => {
        if (response.ok) {
          const content = await response.text();
          const cleanedPath = cleanFilePath(fetchUrl, originToUse);
          processedLibs[cleanedPath] = cleanFileContent(content, originToUse);
        }
      });
  }
}
```

---

## Queued Fetch

To avoid overwhelming the CDN, fetch requests are queued:

```typescript
const queuedFetch = new QueuedFetch(4, 10000, 100);
// 4 concurrent requests
// 10000ms timeout
// 100ms delay between batches
```

This prevents rate limiting and improves reliability.

---

## Limitations

### Current Limitations

1. **No cross-codeSpace types**: Types from `/live/` imports aren't available
2. **Slow initial load**: First type acquisition can be slow
3. **No caching**: Types are re-fetched on each session
4. **Some packages unsupported**: Complex packages may fail

### Error Handling

```typescript
const { data: vfs, error: vfsError } = await tryCatch(
  new Promise<Map<string, string>>((resolve) =>
    setupTypeAcquisition({
      // ... config
      delegate: {
        errorMessage: (userFacingMessage, error) =>
          console.error(`[ATA] Error: ${userFacingMessage}`, error),
        finished: (vfsMap) => resolve(vfsMap),
      },
    })(code)
  ),
);

if (vfsError) {
  console.error("[ATA] Failed to acquire types:", vfsError);
  return [];
}
```

---

## Roadmap

### Planned Improvements

| Item                  | Description                            | Priority |
| --------------------- | -------------------------------------- | -------- |
| Add caching           | Cache fetched .d.ts files in IndexedDB | HIGH     |
| Cross-codeSpace types | Generate types for /live/ imports      | MEDIUM   |
| Parallel fetching     | Increase concurrent fetch limit        | MEDIUM   |
| Error recovery        | Retry failed type fetches              | LOW      |
| Performance metrics   | Track and optimize ATA timing          | LOW      |

### Optimization Ideas

1. **Pre-fetch common types**: Load React, Emotion, Framer Motion on startup
2. **Incremental updates**: Only fetch types for new imports
3. **Server-side bundling**: Pre-bundle popular package types
4. **Web Worker pooling**: Use multiple workers for parallel processing

---

## Debugging

### Console Logging

The ATA worker logs progress:

```javascript
[ATA] Transpiling code (1234 chars) with origin: https://testing.spike.land
[ATA] Error fetching aliased import @/components/missing from https://...
[ATA] Finished: 42 type definitions acquired
```

### Inspecting Loaded Types

```javascript
// In browser console
monaco.languages.typescript.typescriptDefaults.getExtraLibs();
// Returns object with all loaded type definitions
```

### Forcing Re-acquisition

```javascript
// Clear existing types
const libs = monaco.languages.typescript.typescriptDefaults.getExtraLibs();
Object.keys(libs).forEach(key => {
  monaco.languages.typescript.typescriptDefaults.removeExtraLib(key);
});

// Trigger new acquisition
// (Modify code to trigger ATA)
```

---

## Related Documentation

- [TRANSPILATION_PIPELINE.md](./TRANSPILATION_PIPELINE.md) - How code is transformed
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [packages/code/README.md](../../code/README.md) - Editor package documentation
