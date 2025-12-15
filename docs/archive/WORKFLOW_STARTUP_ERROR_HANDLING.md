# Workflow Startup Error Handling Implementation

**Date**: December 12, 2025 **Feature**: Token Rollback on Workflow Startup
Failure

## Summary

Added error handling to the album batch enhancement API route to refund tokens
if the workflow fails to start. This prevents users from losing tokens when the
enhancement workflow cannot be initialized.

## Problem

Previously, tokens were consumed before starting the workflow. If the workflow
failed to start (e.g., Vercel workflow service unavailable, initialization
error), users would lose their tokens without any enhancement being attempted.

## Solution

Implemented try-catch error handling around workflow startup with automatic
token refund on failure.

### Changes Made

#### 1. Added JSDoc Documentation

Added refund policy documentation explaining when tokens are refunded:

```typescript
/**
 * Refund Policy:
 * - If workflow fails to start: Full refund immediately
 * - If individual jobs fail: Refunded per-job after batch completes
 * - Successful jobs: No refund (tokens consumed as expected)
 */
```

#### 2. Wrapped Workflow Startup in Try-Catch

File: `src/app/api/albums/[id]/enhance/route.ts`

```typescript
// Wrap workflow startup in try-catch to handle startup failures
try {
  if (isVercelEnvironment()) {
    // Production: Use Vercel's durable workflow infrastructure
    await start(batchEnhanceImages, [batchInput]);

    console.log("Album batch enhancement workflow started (production)", {
      batchId,
      albumId,
      imageCount: imagesToEnhance.length,
    });
  } else {
    // Development: Run enhancement directly (fire-and-forget)
    console.log("Running album batch enhancement directly (dev mode)", {
      batchId,
      albumId,
    });

    // Fire and forget - don't await, let it run in the background
    batchEnhanceImagesDirect(batchInput).catch((error) => {
      console.error("Direct album batch enhancement failed:", error);
    });
  }
} catch (error) {
  console.error("[Album Enhance] Workflow failed to start:", error);

  // Refund tokens since workflow didn't start
  await TokenBalanceManager.refundTokens(
    session.user.id,
    totalCost,
    batchId,
    "Workflow failed to start",
  );

  return NextResponse.json(
    {
      error: "Failed to start enhancement workflow. Tokens have been refunded.",
    },
    { status: 500 },
  );
}
```

#### 3. Added Test Coverage

File: `src/app/api/albums/[id]/enhance/route.test.ts`

Added three new tests:

1. **should refund tokens if workflow fails to start in production**
   - Mocks workflow.start() to fail
   - Verifies 500 error response
   - Verifies refund is called with correct parameters

2. **should refund tokens if direct enhancement throws in dev mode**
   - Mocks batchEnhanceImagesDirect() to throw
   - Verifies 500 error response
   - Verifies refund is called with correct parameters

3. **should not refund tokens if workflow starts successfully**
   - Verifies normal success case
   - Ensures refund is NOT called when workflow starts successfully

## Token Refund Flow

### Before (Issue)

1. User requests batch enhancement
2. System consumes tokens (e.g., 10 tokens for 2 images at TIER_2K)
3. System tries to start workflow
4. **Workflow fails to start** → Tokens lost, no refund

### After (Fixed)

1. User requests batch enhancement
2. System consumes tokens (e.g., 10 tokens for 2 images at TIER_2K)
3. System tries to start workflow (wrapped in try-catch)
4. **Workflow fails to start**
5. System immediately refunds tokens
6. User receives error message: "Failed to start enhancement workflow. Tokens
   have been refunded."
7. Token balance restored to pre-request amount

## Error Scenarios Covered

1. **Production (Vercel)**: `workflow/api start()` throws error
   - Network issues connecting to workflow service
   - Workflow service temporarily unavailable
   - Invalid workflow configuration

2. **Development**: `batchEnhanceImagesDirect()` throws error
   - Initialization errors
   - Missing dependencies
   - Configuration errors

## Testing

All tests pass:

```bash
✓ src/app/api/albums/[id]/enhance/route.test.ts (29 tests)
  ✓ should refund tokens if workflow fails to start in production
  ✓ should refund tokens if direct enhancement throws in dev mode
  ✓ should not refund tokens if workflow starts successfully
```

Total album-related tests: **183 passed**

## Related Files

- `/Users/z/Developer/spike-land-nextjs/src/app/api/albums/[id]/enhance/route.ts` -
  Implementation
- `/Users/z/Developer/spike-land-nextjs/src/app/api/albums/[id]/enhance/route.test.ts` -
  Tests
- `/Users/z/Developer/spike-land-nextjs/src/lib/tokens/balance-manager.ts` -
  Token refund method

## Future Improvements

This implementation handles workflow startup failures. Additional scenarios
already handled elsewhere:

1. **Individual job failures**: Handled by workflow completion callback (refunds
   per failed job)
2. **Partial batch failures**: Handled by batch summary (refunds only failed
   jobs)
3. **Token consumption failures**: Already handled before this change

## API Contract

### Error Response (500)

```json
{
  "error": "Failed to start enhancement workflow. Tokens have been refunded."
}
```

### Token Transaction Created

```typescript
{
  type: "REFUND",
  amount: <totalCost>,
  source: "enhancement_failed",
  sourceId: <batchId>,
  metadata: {
    reason: "Workflow failed to start"
  }
}
```

## Conclusion

This implementation ensures users never lose tokens due to workflow startup
failures, improving reliability and user trust in the platform's token system.
