# Implementation Plan for Issue #411: Deduplicate Stream Processing in gemini-client.ts

## Summary

Issue #411 identifies duplicate stream processing logic in `gemini-client.ts` (1,180 lines):

- Lines 757-881: Stream processing with chunk buffering in `enhanceImageWithGemini()`
- Lines 1051-1180: Nearly identical `processGeminiStream()` function
- 9 nested conditionals in `buildDynamicEnhancementPrompt`

## Duplicate Stream Processing Analysis

### Implementation 1: Inline in `enhanceImageWithGemini()` (lines 758-880)

- Defined as `processStream` inner function
- Uses `modelToUse` parameter
- Used only by `enhanceImageWithGemini()`

### Implementation 2: Standalone `processGeminiStream()` (lines 1051-1180)

- Standalone helper function
- Hardcoded `DEFAULT_MODEL`
- Called by `generateImageWithGemini()` and `modifyImageWithGemini()`

### Key Differences

| Aspect        | `processStream` (inline)            | `processGeminiStream` (standalone) |
| ------------- | ----------------------------------- | ---------------------------------- |
| Model         | Uses `modelToUse` parameter         | Hardcoded `DEFAULT_MODEL`          |
| Error message | "Failed to start image enhancement" | "Failed to start image generation" |
| Core logic    | Identical                           | Identical                          |

## Proposed Unified Stream Processor

```typescript
interface StreamProcessorOptions {
  ai: GoogleGenAI;
  model: string;
  config: GeminiConfig;
  contents: GeminiContent[];
  timeoutMs?: number;
  operationType?: "enhancement" | "generation" | "modification";
}

async function processGeminiStream(
  options: StreamProcessorOptions,
): Promise<Buffer>;
```

## Implementation Phases

### Phase 1: Create Unified Stream Processor

1. Define shared types at top of file
2. Refactor `processGeminiStream` to accept model parameter
3. Replace inline `processStream` with call to unified function
4. Update callers with `operationType`

### Phase 2: Extract Prompt Building Module

1. Create `src/lib/ai/prompt-builder.ts`
2. Extract `buildStyleConversionInstructions`
3. Extract `buildDefectCorrectionInstructions` (strategy pattern)
4. Extract `buildReferenceImageInstructions`
5. Simplify `buildDynamicEnhancementPrompt` to composition

### Phase 3: Add Comprehensive Unit Tests

1. Tests for unified stream processor
2. Tests for extracted prompt builder functions
3. Ensure 100% coverage

### Phase 4: Update Exports and Documentation

1. Maintain backward compatibility
2. Add JSDoc documentation

## Questions

1. **Prompt builder location**: Separate file or keep in gemini-client.ts?
2. **Breaking changes**: Should `processGeminiStream` be exported?
3. **Strategy pattern**: Is added abstraction for defects acceptable?
4. **Testing priority**: Stream processor edge cases or prompt builder first?

## Critical Files

- `/src/lib/ai/gemini-client.ts` - Core file with duplicate code (1,180 lines)
- `/src/lib/ai/gemini-client.test.ts` - Test suite (1,876 lines)
- `/src/lib/ai/pipeline-types.ts` - Types for PromptConfig
- `/src/workflows/enhance-image.direct.ts` - Consumer to verify no breaks
