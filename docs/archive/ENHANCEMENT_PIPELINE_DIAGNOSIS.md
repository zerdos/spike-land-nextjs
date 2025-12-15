# Enhancement Pipeline Diagnosis Report

**Date:** 2025-12-06 **Status:** CRITICAL - Pipeline Broken **Issue ID:**
Enhancement jobs stuck in PROCESSING state

---

## Executive Summary

The image enhancement pipeline is completely broken. Jobs are created but never
complete, getting stuck in "PROCESSING" state indefinitely. All recent failures
show timeouts from the Gemini API after 120 seconds. The root cause is **using
an invalid or non-existent Gemini model name**.

---

## System Health Evidence

From the Admin Dashboard (System Health):

- **Queue Depth:** 6 jobs stuck in Pending/Processing
- **Average Processing Time:** 0s (jobs not completing)
- **Jobs in PROCESSING state:** 6 jobs (some stuck for 3800-5724 minutes!)
- **Failure Rate:** 23.8%
- **Error Pattern:** All failures show:
  `Gemini API request timed out after 120000ms`

### Stuck Jobs Details

```
- Job cmiu2yptk000104lbz9pulxts: PROCESSING, TIER_2K, created 52 min ago
- Job cmiu2vtfu000104jvp9smq17v: PROCESSING, TIER_1K, created 55 min ago
- Job cmiu2u58m000104l1q7cdyukt: PROCESSING, TIER_4K, created 56 min ago
- Job cmiqd3sbw0005jm04grgv5rn2: PROCESSING, TIER_2K, created 3800 min ago (2.6 days!)
- Job cmiohgggo0009jr04w41hmwox: PROCESSING, TIER_4K, created 5693 min ago (3.9 days!)
- Job cmiogd9xj0003js04jtixj3xa: PROCESSING, TIER_2K, created 5724 min ago (4.0 days!)
```

### Recent Failed Jobs

All show the same error:

```
- Job cmir4r59c0005jo04ebxwtt1i: Gemini API request timed out after 120000ms
- Job cmiq717qg0007ii04qijq9aj8: Gemini API request timed out after 120000ms
- Job cmipx4igd000bi904874almze: Gemini API request timed out after 120000ms
- Job cmiogbtir000fi304h9j2k8fa: Gemini API request timed out after 120000ms
- Job cminos3qj0007le045eo3i3km: Gemini API request timed out after 120000ms
```

---

## Root Cause Analysis

### PRIMARY ROOT CAUSE: Invalid Model Name

**File:** `/Users/z/Developer/spike-land-nextjs/src/lib/ai/gemini-client.ts`
**Line:** 5

```typescript
const DEFAULT_MODEL = "gemini-3-pro-image-preview";
```

**Problem:** This model name **does not exist** in the Gemini API.

### Verification

1. **API Key is Valid:** ✅ Verified - API key `AIzaSyBqBuUorfdbK2d5...` is set
   and works
2. **Available Models Tested:** ✅ Listed all available models via API
3. **Model Name Invalid:** ❌ `gemini-3-pro-image-preview` does not exist

### Available Image Generation Models (December 2025)

According to the official Gemini API documentation and model list:

**For Image Generation with @google/genai SDK:**

1. **`gemini-2.5-flash-image`** - Recommended for fast, cost-effective image
   generation
   - Supports up to 1024px resolution
   - Pricing: $30/million output tokens (~$0.039 per image)
   - Released: August 26, 2025

2. **`nano-banana-pro-preview`** (alias: `gemini-3-pro-image-preview`) - Higher
   fidelity
   - Supports up to 4096px resolution
   - Studio-quality image generation
   - Released: December 5, 2025
   - Note: This is labeled as "Nano Banana Pro" in the API

3. **Imagen models** (alternative approach):
   - `imagen-4.0-generate-001`
   - `imagen-4.0-ultra-generate-001`
   - `imagen-4.0-fast-generate-001`

### Why Jobs Get Stuck in PROCESSING

Looking at the code flow:

1. **Job Created:**
   `/Users/z/Developer/spike-land-nextjs/src/app/api/images/enhance/route.ts:183-192`
   - Job status set to `PROCESSING`
   - Tokens consumed immediately
   - `processEnhancement()` called asynchronously

2. **Enhancement Processing:** Lines 247-496
   - Downloads image ✅
   - Calls `enhanceImageWithGemini()` with retry logic
   - **This is where it fails** - API call times out after 120 seconds
   - Error caught and job marked as `FAILED` (lines 463-495)
   - Tokens refunded ✅

3. **Why Some Jobs Stay PROCESSING:**
   - If the Vercel serverless function times out (10 seconds default, 60 seconds
     max for Pro)
   - The `processEnhancement()` async function never completes
   - No error handling at the serverless boundary
   - Job remains stuck in PROCESSING forever

---

## Secondary Issues Discovered

### 1. Missing Job Cleanup Mechanism

**Problem:** Jobs stuck in PROCESSING state are never cleaned up or marked as
failed.

**Impact:** Queue depth grows indefinitely, confusing users about job status.

**Recommendation:** Implement a background job or cron that:

- Finds jobs in PROCESSING state older than 5 minutes
- Marks them as FAILED with "Processing timeout" error
- Refunds tokens if not already refunded

### 2. No Server-Side Background Worker

**Problem:** `processEnhancement()` runs in the API route's serverless function
context.

**Impact:**

- Vercel serverless functions have execution time limits (10-60 seconds)
- Image enhancement takes 120+ seconds
- Function times out before enhancement completes
- No way to recover or retry

**Recommendation:** Move to a proper background job queue:

- Use Vercel Cron + database-backed queue
- Or use external service (Inngest, Trigger.dev, BullMQ + Redis)
- Or use Vercel's experimental background functions

### 3. Timeout Not Aligned with Serverless Limits

**Problem:**

- Gemini API timeout: 120 seconds (2 minutes)
- Vercel serverless timeout: 10-60 seconds

**Impact:** The Gemini timeout will never be reached because Vercel kills the
function first.

---

## Required Fixes

### IMMEDIATE FIX (Critical - Unblocks Enhancement)

**Priority:** P0 - Must fix now

1. **Update model name** in
   `/Users/z/Developer/spike-land-nextjs/src/lib/ai/gemini-client.ts:5`

   Change from:
   ```typescript
   const DEFAULT_MODEL = "gemini-3-pro-image-preview";
   ```

   To:
   ```typescript
   const DEFAULT_MODEL = "gemini-2.5-flash-image";
   ```

   **OR** (for higher quality, higher cost):
   ```typescript
   const DEFAULT_MODEL = "nano-banana-pro-preview";
   ```

2. **Verify the API call signature** - May need to adjust config based on SDK
   documentation

3. **Clean up stuck jobs** - Run a migration or script to:
   ```sql
   UPDATE "ImageEnhancementJob"
   SET status = 'FAILED',
       "errorMessage" = 'Job stuck in processing - system fix applied'
   WHERE status = 'PROCESSING'
   AND "createdAt" < NOW() - INTERVAL '5 minutes';
   ```

4. **Refund tokens for cleaned up jobs**

### SHORT-TERM FIXES (Important - Prevents recurrence)

**Priority:** P1 - Fix within 1-2 days

1. **Add job timeout cleanup mechanism**
   - Vercel Cron job that runs every 5 minutes
   - Marks old PROCESSING jobs as FAILED
   - Refunds tokens

2. **Add better error handling at serverless boundary**
   - Wrap `processEnhancement()` in timeout guard
   - Ensure job is always marked as FAILED if function times out

3. **Add monitoring/alerting**
   - Alert when jobs are stuck > 5 minutes
   - Alert when failure rate > 10%

### LONG-TERM FIXES (Architectural - Prevents future issues)

**Priority:** P2 - Plan for next sprint

1. **Move to proper background job queue**
   - Evaluate: Inngest, Trigger.dev, or BullMQ + Redis
   - Decouple enhancement processing from API route
   - Add retry logic, dead letter queue, etc.

2. **Add job status polling UI**
   - Real-time updates via polling or websockets
   - Show job progress and estimated completion time

3. **Consider moving to Vertex AI** (requires GCP setup)
   - More reliable for production workloads
   - Better SLAs and support
   - Requires migration from Google AI API to Vertex AI

---

## Testing Plan

### Before Fix

1. ✅ Verified API key is valid
2. ✅ Verified model name is invalid
3. ✅ Confirmed jobs are stuck in database

### After Fix

1. Test model name change works locally
2. Test full enhancement flow end-to-end
3. Verify jobs complete successfully
4. Monitor production for 24 hours
5. Check no jobs stuck in PROCESSING

---

## References

- [Google Gemini API Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [@google/genai NPM Package](https://www.npmjs.com/package/@google/genai)
- [Gemini 2.5 Flash Image Announcement](https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/)
- [Gemini 3 Pro Image (Nano Banana Pro) Announcement](https://blog.google/technology/developers/gemini-3-pro-image-developers/)

---

## Files Involved

### To Fix:

- `/Users/z/Developer/spike-land-nextjs/src/lib/ai/gemini-client.ts` - Update
  model name
- `/Users/z/Developer/spike-land-nextjs/src/app/api/images/enhance/route.ts` -
  Possibly update config

### To Monitor:

- Database: `ImageEnhancementJob` table
- Vercel deployment logs
- Admin dashboard (System Health)

---

## Action Items

- [ ] Update `DEFAULT_MODEL` constant to valid model name
- [ ] Test enhancement locally with new model
- [ ] Deploy fix to production
- [ ] Run database cleanup script for stuck jobs
- [ ] Refund tokens for stuck jobs
- [ ] Monitor for 24 hours
- [ ] Implement job cleanup cron (P1)
- [ ] Evaluate background job queue options (P2)
