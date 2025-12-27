# Implementation Plan for Issue #412: Clarify Error Boundaries in enhance-image.workflow.ts

## Summary

The `enhance-image.workflow.ts` file (693 lines) contains 10 tightly-coupled workflow steps with unclear error boundaries. Issues include:

- Inconsistent error handling across steps
- Vision model failures silently falling back to defaults
- 6+ conditional branches for blend source handling
- Missing validation helpers for cropping/padding

## Workflow Step Mapping

| Step | Function                  | Error Handling       | Behavior on Error        |
| ---- | ------------------------- | -------------------- | ------------------------ |
| 1    | `downloadOriginalImage`   | FatalError           | Stops pipeline           |
| 2    | `getImageMetadata`        | None                 | Defaults to 1024x1024    |
| 3    | `analyzeImageStep`        | tryCatch + fallback  | Returns default analysis |
| 4    | `saveAnalysisToDb`        | None                 | Throws (retryable)       |
| 4b   | `downloadBlendSourceStep` | tryCatch             | Returns undefined        |
| 5    | `autoCropStep`            | tryCatch + fallback  | Returns original         |
| 6    | `padImageForGemini`       | None                 | Throws (retryable)       |
| 7    | `enhanceWithGemini`       | Selective FatalError | Mixed                    |
| 8    | `processAndUpload`        | Mixed                | FatalError for dims      |
| 9    | `updateJobStatus`         | None                 | Throws (retryable)       |
| 10   | `refundTokens`            | Log + swallow        | Never fails              |

## Proposed Error Boundary Design

### Three-Tier Error Classification

1. **Fatal Errors** (`FatalError`): Non-retryable
   - Missing source image
   - Invalid API credentials
   - Invalid output dimensions

2. **Retryable Errors** (regular `Error`): Transient failures
   - Network timeouts
   - Rate limiting
   - Database connection issues

3. **Soft Failures** (continue with defaults): Non-critical
   - Image analysis (use default)
   - Blend source download (proceed without)
   - Auto-crop (keep original)

### Proposed Types

```typescript
export class WorkflowStageError extends Error {
  constructor(
    message: string,
    public readonly stage: WorkflowStage,
    public readonly isRecoverable: boolean,
    public readonly retryable: boolean = true,
  ) {}
}

export enum WorkflowStage {
  DOWNLOAD,
  METADATA,
  ANALYSIS,
  BLEND_SOURCE,
  CROP,
  PAD,
  ENHANCE,
  POST_PROCESS,
  SAVE,
  REFUND,
}
```

## Implementation Phases

### Phase 1: Extract Utility Functions

1. Create `/src/workflows/dimension-utils.ts`
2. Add `validatePixelDimensions`, `validateCropRegion`, `calculatePaddingDimensions`

### Phase 2: Define Explicit Error Boundaries

1. Add error boundary configuration per step
2. Create step wrapper function with unified error handling

### Phase 3: Implement Error Recovery Strategy

1. Add workflow context for tracking failures
2. Update job status with failure context

### Phase 4: Simplify Blend Source Handling

1. Extract to dedicated `resolveBlendSource` function
2. Reduce 6+ conditionals to single function call

## Questions

1. Should soft failures be exposed in API response (add `warnings` field)?
2. Maximum retry count for retryable errors?
3. Add metrics/observability for tracking step failures?
4. Configuration-based vs explicit try-catch pattern preference?

## Critical Files

- `/src/workflows/enhance-image.workflow.ts` - Core workflow (693 lines)
- `/src/workflows/enhance-image.shared.ts` - Add error types
- `/src/lib/try-catch--no-track.ts` - Error handling pattern
- `/src/workflows/enhance-image.direct.ts` - Reference for direct version
