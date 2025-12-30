# Implementation Plan for Issue #413: Simplify Validation Layers in api/images/enhance/route.ts

## Summary

The `api/images/enhance/route.ts` file (658 lines) has 5 sequential validation
layers and dual code paths for blend source handling (~220 lines combined). This
plan simplifies using Zod schemas and unified handlers.

## Current Validation Layers

1. **Authentication** (Lines 35-47): Checks session
2. **Rate Limiting** (Lines 51-80): Checks rate limit
3. **JSON Parsing** (Lines 82-100): Parses body
4. **Field Validation** (Lines 102-145): Manual imageId/tier checks
5. **Image Ownership** (Lines 147-165): Database lookup

### Dual Blend Source Paths

- **Option A (imageId)**: ~100 lines - DB lookup, ownership, R2 fetch
- **Option B (base64)**: ~120 lines - Validation, upload, record creation

Both produce same output: `{ base64: string; mimeType: string; }`

## Proposed Solution

### 1. Zod Schema for Request Validation

```typescript
// src/lib/validations/enhance-image.ts
export const enhanceImageRequestSchema = z.object({
  imageId: z.string().min(1),
  tier: z.enum(["FREE", "TIER_1K", "TIER_2K", "TIER_4K"]),
  blendSource: z.object({
    base64: z.string().optional(),
    mimeType: z.string().optional(),
    imageId: z.string().optional(),
  }).optional().refine(/* XOR validation */),
});
```

### 2. Unified Blend Source Handler

```typescript
// src/lib/images/blend-source-resolver.ts
export async function resolveBlendSource(
  input: BlendSourceInput,
  userId: string,
  targetImageId: string,
): Promise<BlendSourceResult>;
```

### 3. Stable Workflow Invocation

```typescript
// src/lib/workflows/enhancement-executor.ts
export function getExecutionMode(): "workflow" | "direct" {
  const override = process.env.ENHANCEMENT_EXECUTION_MODE;
  // ... environment detection with override support
}
```

## Implementation Phases

### Phase 1: Create New Utility Files

1. `/src/lib/validations/enhance-image.ts` - Zod schemas
2. `/src/lib/images/blend-source-resolver.ts` - Unified handler
3. `/src/lib/images/format-detection.ts` - Format utilities
4. `/src/lib/workflows/enhancement-executor.ts` - Stable invocation

### Phase 2: Add Tests for New Utilities

1. Zod schema tests
2. Blend source resolution tests
3. Format detection tests
4. Workflow executor tests

### Phase 3: Refactor Route

1. Replace manual validation with Zod
2. Replace dual paths with unified resolver
3. Replace environment check with stable executor
4. Extract helper functions

### Phase 4: Clean Up

1. Remove dead code
2. Ensure 100% test coverage

## Expected Line Reduction

| File              | Before | After      |
| ----------------- | ------ | ---------- |
| route.ts          | 658    | ~250       |
| New utilities     | 0      | ~235       |
| **Net reduction** | -      | ~165 lines |

## Questions

1. **Backward Compatibility**: Change blend source format to discriminated
   union?
2. **Environment Variable**: Is `ENHANCEMENT_EXECUTION_MODE` acceptable?
3. **Utilities Location**: `/src/lib/images/` vs `/src/lib/api/`?
4. **Error Response Helper**: Generic or route-specific?

## Critical Files

- `/src/app/api/images/enhance/route.ts` - Primary file (658 lines)
- `/src/lib/ai/pipeline-validation.ts` - Pattern to follow
- `/src/app/api/boxes/route.ts` - Zod example
- `/src/workflows/enhance-image.shared.ts` - Type alignment
