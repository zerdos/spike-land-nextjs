# Technical Debt Registry

> Last updated: 2026-01-28
> Maintainer: Development Team

> **Recent Stabilization Work**: See [TECH_STABILIZATION_SPRINT_1.md](./TECH_STABILIZATION_SPRINT_1.md)
> and [TECH_STABILIZATION_SPRINT_2.md](./TECH_STABILIZATION_SPRINT_2.md) for completed and in-progress
> debt reduction efforts.

This document tracks identified technical debt across the spike.land codebase. Items are prioritized by impact and categorized by component.

---

## Table of Contents

- [Critical (P0)](#critical-p0)
- [High Priority (P1)](#high-priority-p1)
- [Medium Priority (P2)](#medium-priority-p2)
- [Low Priority (P3)](#low-priority-p3)
- [Architecture Notes](#architecture-notes)
- [Refactoring Opportunities](#refactoring-opportunities)

---

## Critical (P0)

### 1. TypeScript Configuration Issues in `testing.spike.land`

**Location:** `packages/testing.spike.land/tsconfig.json`

**Issue:** Missing type definitions for `@cloudflare/vitest-pool-workers` causing TypeScript compilation errors.

**Impact:** Prevents clean TypeScript builds; developers must use `--skipLibCheck` workaround.

**Suggested Fix:**

```bash
yarn add -D @cloudflare/vitest-pool-workers
# Or remove from tsconfig.json if not actually used
```

---

## High Priority (P1)

### 2. Commented-Out Auto-Save System in Durable Object

**Location:** `packages/testing.spike.land/src/chatRoom.ts:572-620`

**Issue:** Large blocks of commented-out auto-save functionality:

- `autoSaveInterval`, `lastAutoSave`, `autoSaveHistory` variables
- `setupAutoSave()`, `autoSave()`, `getAutoSaveHistory()`, `restoreFromAutoSave()` methods

**Impact:**

- Code clutter reduces readability
- Unclear if this feature is deprecated or planned for revival
- `savedVersion_${timestamp}` storage keys are still used in `liveRoutes.ts` but the auto-save system is disabled

**Suggested Fix:** Either:

1. Remove entirely if deprecated
2. Implement properly with the new versioning system (Phase 5)
3. Document why it's disabled and create a ticket for future implementation

---

### 3. Duplicate Route Handling Logic

**Location:**

- `packages/testing.spike.land/src/chat.ts` (main routing)
- `packages/testing.spike.land/src/mainFetchHandler.ts`
- `packages/testing.spike.land/src/fetchHandler.ts`
- `packages/testing.spike.land/src/routeHandler.ts`

**Issue:** Request routing is scattered across multiple files with overlapping responsibilities:

- `chat.ts` handles: MCP routes, static assets, editor paths, AI endpoints, CMS
- `fetchHandler.ts` handles: live routes, API routes, WebSocket
- `routeHandler.ts` handles: Durable Object internal routing

**Impact:**

- Hard to trace request flow
- Risk of route conflicts
- Difficult to add new routes consistently

**Suggested Fix:** Consolidate into a single router with clear middleware pattern:

```typescript
// Proposed structure
Router
  ├── StaticAssetMiddleware
  ├── AuthMiddleware (where needed)
  └── Routes
      ├── /mcp/* → McpHandler
      ├── /live/* → LiveHandler → DurableObject
      ├── /api/* → ApiHandler
      └── /* → StaticHandler
```

---

### 4. Inconsistent Error Handling Patterns

**Location:** Throughout `packages/testing.spike.land/src/`

**Issue:** Mixed error handling approaches:

- Some routes use `handleErrors()` wrapper
- Some use try-catch with custom responses
- Some don't handle errors at all

**Examples:**

```typescript
// Pattern 1: handleErrors wrapper (chatRoom.ts:612)
return handleErrors(request, async () => { ... });

// Pattern 2: Direct try-catch (various)
try { ... } catch (e) { return new Response("Error", { status: 500 }); }

// Pattern 3: No error handling (some route handlers)
```

**Suggested Fix:** Standardize on `handleErrors()` wrapper for all route handlers.

---

## Medium Priority (P2)

### 5. CSS Flexbox Scroll Container Pattern

**Location:** `src/app/my-apps/[codeSpace]/page.tsx:867-870`

**Issue:** The chat scroll container required a fix from `h-full` to `absolute inset-0` because percentage heights don't work with flex-derived parent heights.

**Pattern to Document:**

```tsx
// DON'T: This doesn't work for scrolling in flex containers
<div className="h-full overflow-y-auto">

// DO: Use absolute positioning for scroll containers in flex layouts
<div className="flex-1 min-h-0 overflow-hidden relative">
  <div className="absolute inset-0 overflow-y-auto">
```

**Suggested Fix:** Create a reusable `ScrollContainer` component that handles this pattern correctly.

---

### 6. Hardcoded URLs and Origins

**Location:** Multiple files

**Examples:**

- `packages/testing.spike.land/src/chat.ts:156` - Hardcoded esbuild URL
- `packages/testing.spike.land/src/liveRoutes.ts:197` - Hardcoded renderer URL
- Various `testing.spike.land` references in frontend code

**Suggested Fix:**

1. Move all external URLs to environment variables
2. Create a `config/urls.ts` module for URL construction

---

### 7. Session Storage Migration Code

**Location:** `packages/testing.spike.land/src/chatRoom.ts:413-431`

**Issue:** Backward compatibility code for migrating from old `session` key to new `session_core` key.

```typescript
// If no data found with new key, try the old key for backward compatibility
if (!sessionCore) {
  sessionCore = await this.state.storage.get("session");
  if (sessionCore) {
    // Migration logic...
  }
}
```

**Impact:** Technical debt that should be removed after sufficient time has passed.

**Suggested Fix:**

1. Add migration date to comment
2. Set a removal date (e.g., 6 months after deployment)
3. Create a ticket to remove this code

---

### 8. R2 Storage Keys Not Namespaced

**Location:** `packages/testing.spike.land/src/chatRoom.ts:336-372`

**Issue:** R2 storage uses keys like `r2_html_${codeSpace}` which could conflict if codeSpace names overlap with other systems.

**Suggested Fix:** Use proper namespacing: `codespace/${codeSpace}/html`

---

## Low Priority (P3)

### 9. Magic Numbers and Strings

**Location:** Throughout codebase

**Examples:**

```typescript
// chatRoom.ts - Browser dimensions
const browserWidth = 1920;
const browserHeight = 1080;

// AgentProgressIndicator.tsx - Animation timings
}, 2000); // Log message cycling interval
}, 50);   // Progress bar update interval
}, 100);  // Elapsed time update interval
```

**Suggested Fix:** Extract to constants with descriptive names.

---

### 10. Unused Imports and Dead Code

**Location:** Various files

**Examples:**

- `chatRoom.ts`: Commented imports for `AutoSaveEntry`
- `liveRoutes.ts`: Some imported utilities may be unused

**Suggested Fix:** Run `yarn lint` with `no-unused-vars` rule enabled and fix.

---

### 11. Inconsistent Async Patterns

**Location:** `packages/testing.spike.land/src/routes/liveRoutes.ts`

**Issue:** Some handlers are marked async but don't await anything:

```typescript
async handleLazyRoute(_request: Request, url: URL): Promise<Response> {
  // No await in this function
  return new Response(...);
}
```

**Suggested Fix:** Remove unnecessary async keywords or add explicit return type documentation.

---

## Architecture Notes

### Durable Object State Management

The `Code` class in `chatRoom.ts` manages session state with this structure:

```
Storage Keys:
├── session_core      → Metadata (codeSpace, etc.)
├── session_code      → Source code (TSX)
├── session_transpiled → Transpiled JS
├── version_count     → Number of saved versions
├── version_{N}       → Individual version snapshots
└── (R2) r2_html_{codeSpace} → Rendered HTML
└── (R2) r2_css_{codeSpace}  → CSS styles
```

**Key Insight:** The split between Durable Object storage (code, transpiled) and R2 storage (html, css) is intentional for size limits, but creates complexity in save/load operations.

---

### Request Flow Architecture

```
External Request
       │
       ▼
┌─────────────────┐
│   cf-workers.ts │ Entry point
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     chat.ts     │ Main router (static, MCP, AI)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│mainFetchHandler │ Security headers, error handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ fetchHandler.ts │ Route dispatch (live, api, etc.)
└────────┬────────┘
         │ (for /live/*)
         ▼
┌─────────────────┐
│  Durable Object │ Code class instance
│   chatRoom.ts   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ routeHandler.ts │ Internal DO routing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route Handlers  │ liveRoutes, codeRoutes, etc.
└─────────────────┘
```

---

### Frontend Component Dependencies

```
my-apps/[codeSpace]/page.tsx
├── MiniPreview.tsx (scaled iframe preview)
│   └── Uses IntersectionObserver for lazy loading
│   └── Uses ResizeObserver for responsive scaling
├── PreviewModal.tsx (full-size modal)
├── AgentProgressIndicator.tsx (agent status)
│   └── Supports floating mode when scrolled up
└── Chat components (messages, input)
```

---

## Refactoring Opportunities

### 1. Extract Chat Logic into Custom Hook

**Current:** `page.tsx` is 1000+ lines with mixed concerns

**Proposed:**

```typescript
// hooks/useAppChat.ts
export function useAppChat(appId: string) {
  // Message management
  // Streaming state
  // Agent progress
  // Scroll behavior
}
```

---

### 2. Create Shared Preview Component Library

**Current:** Preview components are in `my-apps/` only

**Proposed:**

```
src/components/previews/
├── MiniPreview.tsx
├── PreviewModal.tsx
├── BrowserChrome.tsx (shared browser UI)
└── index.ts
```

---

### 3. Standardize API Response Format

**Current:** Mixed response formats across endpoints

**Proposed:**

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: number;
    version: string;
  };
}
```

---

## Changelog

| Date       | Author | Changes                                         |
| ---------- | ------ | ----------------------------------------------- |
| 2026-01-17 | Claude | Initial document created from codebase analysis |

---

## Contributing

When adding new tech debt items:

1. Assign a priority (P0-P3)
2. Include specific file locations
3. Describe the impact
4. Suggest a fix if known
5. Create a GitHub issue and link it here

Priority definitions:

- **P0 (Critical):** Blocks development or causes production issues
- **P1 (High):** Significant code quality or maintainability impact
- **P2 (Medium):** Should be addressed but not urgent
- **P3 (Low):** Nice to have improvements
