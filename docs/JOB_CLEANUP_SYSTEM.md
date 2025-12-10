# Job Cleanup System

This document describes the automatic job timeout and cleanup mechanism for stuck enhancement jobs.

## Overview

The job cleanup system automatically detects and cleans up enhancement jobs that have been stuck in the `PROCESSING` state for too long. When a job is cleaned up:

1. The job status is changed from `PROCESSING` to `FAILED`
2. An error message is added explaining the timeout
3. Tokens are automatically refunded to the user
4. Transaction history is updated with the refund

## Components

### Core Cleanup Logic

**Location**: `/src/lib/jobs/cleanup.ts`

Main functions:

- `findStuckJobs()` - Finds jobs stuck in PROCESSING state
- `cleanupStuckJobs()` - Main cleanup function that processes stuck jobs
- Configurable via `CleanupOptions`:
  - `timeoutMs` - Timeout threshold (default: 5 minutes)
  - `dryRun` - Preview mode without making changes
  - `batchSize` - Max jobs to process per run (default: 100)

### Admin API Endpoint

**Endpoint**: `POST /api/admin/jobs/cleanup`

Allows admins to manually trigger cleanup.

**Authentication**: Requires admin role

**Request Body** (all optional):

```json
{
  "timeoutMs": 600000, // 10 minutes
  "dryRun": true, // Preview mode
  "batchSize": 50 // Process up to 50 jobs
}
```

**Response**:

```json
{
  "success": true,
  "result": {
    "totalFound": 3,
    "cleanedUp": 3,
    "failed": 0,
    "tokensRefunded": 27,
    "jobs": [...],
    "errors": []
  },
  "message": "Successfully cleaned up 3 stuck jobs and refunded 27 tokens"
}
```

### Automated Cron Job

**Endpoint**: `GET /api/cron/cleanup-jobs`

**Schedule**: Runs every 15 minutes (configured in `vercel.json`)

**Authentication**: Protected by `CRON_SECRET` environment variable

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

## Usage

### Manual Cleanup via API

```bash
# Dry run to see what would be cleaned up
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie" \
  -d '{"dryRun": true}'

# Actually clean up stuck jobs (default 5min timeout)
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Cookie: your-admin-session-cookie"

# Clean up with custom timeout (10 minutes)
curl -X POST https://spike.land/api/admin/jobs/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie" \
  -d '{"timeoutMs": 600000}'
```

### Programmatic Usage

```typescript
import { cleanupStuckJobs } from "@/lib/jobs/cleanup";

// Use defaults (5 minute timeout)
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

## Configuration

### Environment Variables

**Required for production**:

- `CRON_SECRET` - Secret token for authenticating Vercel cron requests

**Set in Vercel**:

```bash
vercel env add CRON_SECRET
# Enter a secure random string
```

### Timeout Threshold

Default: 5 minutes (300,000 ms)

To change the default, modify `DEFAULT_TIMEOUT_MS` in `/src/lib/jobs/cleanup.ts`

### Cron Schedule

Default: Every 15 minutes

To change the schedule, modify the `schedule` field in `vercel.json`:

- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `0 */6 * * *` - Every 6 hours

[Cron syntax reference](https://crontab.guru/)

## How It Works

### Detection

Jobs are considered "stuck" if:

1. Status is `PROCESSING`, AND
2. Either:
   - `processingStartedAt` is older than the timeout threshold, OR
   - `processingStartedAt` is null and `updatedAt` is older than the timeout threshold

### Cleanup Process

For each stuck job:

1. **Update job status**: Mark as `FAILED` with timeout error message
2. **Refund tokens**: Use `TokenBalanceManager.refundTokens()`
3. **Record transaction**: Create `REFUND` transaction with reason
4. **Log results**: Structured logging for monitoring

### Error Handling

- Individual job failures don't stop the batch
- Partial refund failures are tracked separately
- All errors are logged with context for debugging
- Results include both successful and failed jobs

## Monitoring

### Logs

Check Vercel logs for cleanup activity:

```
[INFO] Starting stuck jobs cleanup
[INFO] Found stuck jobs count=3
[INFO] Cleaning up stuck job jobId=abc123 tokensCost=10
[INFO] Job cleaned up successfully tokensRefunded=10 processingDuration=600s
[INFO] Cleanup completed totalFound=3 cleanedUp=3 tokensRefunded=27
```

### Metrics

Monitor these metrics via admin dashboard:

- Jobs stuck in PROCESSING state
- Cleanup frequency and success rate
- Token refund volume
- Job timeout rate by tier

### Alerts

Consider setting up alerts for:

- High number of stuck jobs (> 10)
- Frequent cleanup failures
- Large refund volumes
- Cleanup not running (cron failure)

## Testing

### Unit Tests

```bash
# Test cleanup logic
yarn test src/lib/jobs/cleanup.test.ts

# Test admin endpoint
yarn test src/app/api/admin/jobs/cleanup/route.test.ts

# Test cron endpoint
yarn test src/app/api/cron/cleanup-jobs/route.test.ts

# All cleanup tests
yarn test cleanup
```

### Manual Testing

1. **Create a stuck job** (in development):
   ```sql
   UPDATE image_enhancement_jobs
   SET status = 'PROCESSING',
       "processingStartedAt" = NOW() - INTERVAL '10 minutes'
   WHERE id = 'some-job-id';
   ```

2. **Run cleanup**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/jobs/cleanup
   ```

3. **Verify**:
   - Job status changed to `FAILED`
   - Tokens refunded to user
   - Transaction created

## Troubleshooting

### Cleanup not running automatically

1. Check Vercel cron configuration:
   ```bash
   vercel env ls
   # Verify CRON_SECRET is set
   ```

2. Check Vercel dashboard → Project → Cron Jobs
   - Verify schedule is active
   - Check recent executions

3. Review logs for errors:
   ```bash
   vercel logs --follow
   ```

### Jobs not being cleaned up

1. Check timeout threshold - jobs might not be old enough
2. Verify job status is `PROCESSING`
3. Check database connection
4. Review cleanup logs for errors

### Token refunds failing

1. Verify user exists
2. Check `TokenBalanceManager` logs
3. Ensure database transaction isn't failing
4. Review token transaction history

## Future Improvements

Potential enhancements:

- [ ] Configurable timeout per tier (TIER_4K might need longer)
- [ ] Webhook notifications for stuck jobs
- [ ] Automatic retry before cleanup
- [ ] Dashboard view of cleanup history
- [ ] Metrics export to monitoring service
- [ ] Custom cleanup rules per job type

## Related Documentation

- [Token System](./TOKEN_SYSTEM.md)
- [Enhancement Pipeline](./IMAGE_ENHANCEMENT.md)
- [Admin Dashboard](./ADMIN_DASHBOARD.md)
