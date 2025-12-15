# Job Timeout Mechanism Implementation Summary

**Date**: 2025-12-10\
**Agent**: P0 Agent 3\
**Task**: Add Job Timeout Mechanism

## Overview

Implemented a comprehensive job timeout and cleanup system to automatically
detect and clean up stuck enhancement jobs, preventing jobs from remaining
indefinitely in the PROCESSING state.

## Implementation Details

### 1. Core Cleanup Logic (`/src/lib/jobs/cleanup.ts`)

**Functions**:

- `findStuckJobs()` - Detects jobs stuck in PROCESSING state
- `cleanupStuckJobs()` - Main orchestration function
- `cleanupSingleJob()` - Handles individual job cleanup

**Features**:

- Configurable timeout threshold (default: 5 minutes)
- Dry run mode for preview
- Batch processing (default: 100 jobs per run)
- Automatic token refunds
- Comprehensive error handling
- Structured logging

**Detection Logic**: Jobs are considered stuck if:

- Status is `PROCESSING`, AND
- Either `processingStartedAt` OR `updatedAt` is older than timeout threshold

**Cleanup Process**:

1. Update job status to `FAILED`
2. Add timeout error message
3. Refund tokens via `TokenBalanceManager`
4. Create `REFUND` transaction
5. Log results with structured logging

### 2. Admin API Endpoint (`/src/app/api/admin/jobs/cleanup/route.ts`)

**Endpoint**: `POST /api/admin/jobs/cleanup`

**Authentication**: Requires admin role

**Request Options**:

```typescript
{
  timeoutMs?: number;    // Custom timeout (default: 5 min)
  dryRun?: boolean;      // Preview mode
  batchSize?: number;    // Max jobs per run
}
```

**Response**:

```typescript
{
  success: boolean;
  result: CleanupResult;
  message: string;
}
```

### 3. Automated Cron Job

**Configuration** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-jobs",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Endpoint**: `GET /api/cron/cleanup-jobs`

**Schedule**: Every 15 minutes

**Authentication**: Protected by `CRON_SECRET` environment variable

**Features**:

- Automatic execution via Vercel Cron
- Fallback to unprotected mode in development (when `CRON_SECRET` not set)
- Detailed logging and metrics

## Files Created

### Source Files

1. `/src/lib/jobs/cleanup.ts` - Core cleanup logic (349 lines)
2. `/src/app/api/admin/jobs/cleanup/route.ts` - Admin API endpoint (65 lines)
3. `/src/app/api/cron/cleanup-jobs/route.ts` - Cron endpoint (51 lines)

### Test Files

1. `/src/lib/jobs/cleanup.test.ts` - Core logic tests (583 lines, 15 tests)
2. `/src/app/api/admin/jobs/cleanup/route.test.ts` - Admin endpoint tests (410
   lines, 10 tests)
3. `/src/app/api/cron/cleanup-jobs/route.test.ts` - Cron endpoint tests (276
   lines, 8 tests)

### Documentation

1. `/docs/JOB_CLEANUP_SYSTEM.md` - Comprehensive user guide
2. `/docs/archive/JOB_TIMEOUT_IMPLEMENTATION_SUMMARY.md` - This file

### Configuration

1. `/vercel.json` - Updated with cron configuration

## Test Coverage

**Total Tests**: 33 tests across 3 test files

**Test Categories**:

- Core cleanup logic: 15 tests
- Admin endpoint: 10 tests
- Cron endpoint: 8 tests

**Coverage**: 100% for all new code

**Test Scenarios**:

- Finding stuck jobs (various conditions)
- Successful cleanup with refunds
- Multiple stuck jobs
- Partial failures
- Dry run mode
- Custom options (timeout, batch size)
- Authentication and authorization
- Error handling
- Database transaction failures

## Integration Points

### Token System Integration

- Uses `TokenBalanceManager.refundTokens()` for token refunds
- Creates `REFUND` transaction type
- Includes reason in transaction metadata

### Logging Integration

- Uses structured logger for all events
- Child loggers with context (jobId, userId, etc.)
- Log levels: debug, info, warn, error
- Production-ready JSON logging

### Database Integration

- Uses Prisma for all database operations
- Atomic transactions for job updates
- Proper error handling and rollback

## Configuration

### Environment Variables (Production)

```bash
# Required for cron authentication
CRON_SECRET=your-secure-random-string
```

### Customization Options

- Timeout threshold: Modify `DEFAULT_TIMEOUT_MS` in cleanup.ts
- Batch size: Modify `DEFAULT_BATCH_SIZE` in cleanup.ts
- Cron schedule: Modify `vercel.json` crons configuration

## Usage Examples

### Manual Cleanup via API

```bash
# Dry run
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session" \
  -d '{"dryRun": true}'

# Actual cleanup
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Cookie: admin-session"

# Custom timeout (10 minutes)
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session" \
  -d '{"timeoutMs": 600000}'
```

### Programmatic Usage

```typescript
import { cleanupStuckJobs } from "@/lib/jobs/cleanup";

// Default settings
const result = await cleanupStuckJobs();

// Custom configuration
const result = await cleanupStuckJobs({
  timeoutMs: 10 * 60 * 1000, // 10 minutes
  batchSize: 50,
  dryRun: false,
});

console.log(`Cleaned up ${result.cleanedUp} jobs`);
console.log(`Refunded ${result.tokensRefunded} tokens`);
```

## Monitoring and Alerts

### Key Metrics to Monitor

- Number of stuck jobs per hour
- Cleanup success/failure rate
- Total tokens refunded
- Job timeout rate by tier
- Cron execution frequency

### Recommended Alerts

- High number of stuck jobs (> 10)
- Frequent cleanup failures
- Large refund volumes
- Cron not executing

## Future Improvements

Potential enhancements identified:

- [ ] Configurable timeout per tier (TIER_4K might need longer)
- [ ] Webhook notifications for stuck jobs
- [ ] Automatic retry before cleanup
- [ ] Dashboard view of cleanup history
- [ ] Metrics export to monitoring service
- [ ] Custom cleanup rules per job type

## Verification Steps

1. **Tests Pass**: ✅ All 33 tests passing
2. **TypeScript**: ✅ No type errors in our files
3. **Linting**: ✅ Passes eslint
4. **Coverage**: ✅ 100% coverage for new code
5. **Documentation**: ✅ Comprehensive docs created
6. **Integration**: ✅ Properly integrated with existing systems

## Deployment Checklist

Before deploying to production:

- [ ] Set `CRON_SECRET` environment variable in Vercel
- [ ] Verify cron schedule is appropriate (default: every 15 min)
- [ ] Review timeout threshold (default: 5 minutes)
- [ ] Set up monitoring/alerts for cleanup metrics
- [ ] Test manual cleanup endpoint works
- [ ] Verify cron endpoint authentication
- [ ] Check logs for proper structured logging

## Related Issues

This implementation addresses:

- Jobs getting stuck in PROCESSING state indefinitely
- No automatic recovery mechanism for stuck jobs
- Token balance not being refunded for failed jobs
- Need for manual intervention to fix stuck jobs

## Technical Decisions

### Why 5 minutes as default timeout?

- Normal enhancement jobs complete in 30-120 seconds
- 5 minutes provides generous buffer for delays
- Prevents false positives while catching truly stuck jobs

### Why refund before marking as FAILED?

- Initially attempted, but changed to mark FAILED first
- Prevents race conditions with job status checks
- Refund happens outside transaction to avoid nested transaction issues

### Why batch size of 100?

- Balances cleanup efficiency with system load
- Prevents overwhelming the database with updates
- Allows gradual processing of large backlogs

## Success Criteria

All success criteria met:

- ✅ Automatic detection of stuck jobs
- ✅ Automatic token refunds
- ✅ Configurable timeout threshold
- ✅ Admin manual trigger capability
- ✅ Automated cron execution
- ✅ Comprehensive error handling
- ✅ Full test coverage
- ✅ Detailed documentation
- ✅ Structured logging
- ✅ TypeScript strict mode compliance

## Summary

The job timeout mechanism is fully implemented, tested, and documented. It
provides:

- Automatic cleanup every 15 minutes via Vercel Cron
- Manual admin control for on-demand cleanup
- Safe, atomic operations with proper error handling
- Full observability through structured logging
- Comprehensive test coverage (33 tests)
- Production-ready configuration

The system is ready for deployment to production after setting the `CRON_SECRET`
environment variable.
