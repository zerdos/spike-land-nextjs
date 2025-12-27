# Implementation Plan for Issue #414: Replace Regex Error Classification

## Summary

The `generation-service.ts` file (843 lines) contains a `classifyError` function (lines 23-89) that uses regex/string matching on error messages. This is fragile because error messages can change without notice.

## Current Regex Patterns

| Code           | Pattern                                             | Fragility Issues                      |
| -------------- | --------------------------------------------------- | ------------------------------------- |
| TIMEOUT        | `includes("timeout")`                               | May miss: "Request exceeded deadline" |
| CONTENT_POLICY | `includes("content")` AND `includes("policy")`      | May miss: "Safety violation"          |
| RATE_LIMITED   | `includes("rate")` OR `includes("quota")`           | May miss: "Too many requests"         |
| AUTH_ERROR     | `includes("api key")` OR `includes("unauthorized")` | May miss: "Token expired"             |
| INVALID_IMAGE  | `includes("image")` AND `includes("invalid")`       | May miss: "Malformed input"           |

## Proposed Error Code/Type System

### Custom Error Hierarchy

```typescript
export enum McpErrorCode {
  TIMEOUT = "TIMEOUT",
  CONTENT_POLICY = "CONTENT_POLICY",
  RATE_LIMITED = "RATE_LIMITED",
  AUTH_ERROR = "AUTH_ERROR",
  INVALID_IMAGE = "INVALID_IMAGE",
  INVALID_INPUT = "INVALID_INPUT",
  GEMINI_API_ERROR = "GEMINI_API_ERROR",
  R2_UPLOAD_ERROR = "R2_UPLOAD_ERROR",
  GENERATION_ERROR = "GENERATION_ERROR",
  UNKNOWN = "UNKNOWN",
}

export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: McpErrorCode,
    public readonly retryable: boolean = false,
    public readonly cause?: Error,
  ) {}
}
```

### Classification via Properties, Not Messages

```typescript
export function classifyUpstreamError(error: Error): ClassifiedError {
  // 1. Check error code property
  // 2. Check HTTP status code
  // 3. Check error name/type
  // 4. Last resort: message patterns (fallback)
}
```

## Implementation Phases

### Phase 1: Error Type System (Low Risk)

1. Create `/src/lib/mcp/errors.ts` with McpError class
2. Create `/src/lib/mcp/error-classifier.ts`
3. Update `classifyError` to use new system
4. Add comprehensive tests

### Phase 2: Extract Common Job Handling (Medium Risk)

1. Create `/src/lib/mcp/job-handler.ts`
2. Merge duplicate `handleGenerationJobFailure` and `handleModificationJobFailure`
3. Parameterize job type-specific behavior

### Phase 3: State Machine (Medium Risk)

1. Create `/src/lib/mcp/job-state-machine.ts`
2. Add transition validation: PENDING → PROCESSING → COMPLETED/FAILED
3. Log invalid transitions

### Phase 4: Job Queue (Future)

1. Document current limitations
2. Consider BullMQ with Redis if needed

## Job State Transitions

```typescript
const JOB_STATE_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: ["REFUNDED"],
};
```

## Questions

1. **Priority**: Should job queue (Phase 4) be implemented now?
2. **Error Codes**: Align with existing ErrorCode type or separate?
3. **Breaking Changes**: Change return type of classifyError?
4. **Gemini API**: Does it provide structured error codes we could use?

## Critical Files

- `/src/lib/mcp/generation-service.ts` - Core file with regex classification
- `/src/lib/errors/error-messages.ts` - Existing error code pattern
- `/src/lib/ai/gemini-client.ts` - Source of errors being classified
- `/src/lib/jobs/cleanup.ts` - Existing job handling patterns
- `/prisma/schema.prisma` - JobStatus enum definition
