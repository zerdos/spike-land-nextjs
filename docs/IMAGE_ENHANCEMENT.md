# Image Enhancement Feature Documentation

> **Last Updated**: December 2025
> **Status**: MVP Release

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [How It Works](#how-it-works)
3. [Enhancement Tiers](#enhancement-tiers)
4. [Supported Formats](#supported-formats)
5. [API Reference](#api-reference)
6. [Error Handling](#error-handling)
7. [Token Consumption](#token-consumption)
8. [Rate Limiting](#rate-limiting)

---

## Feature Overview

The Image Enhancement feature enables users to upscale and improve the quality of their images using AI-powered enhancement through Google Gemini API. Users can enhance images at multiple quality tiers, each consuming a different number of tokens.

### Key Capabilities

- **AI-Powered Enhancement**: Uses Google Gemini API for intelligent image upscaling
- **Multiple Quality Tiers**: Three enhancement tiers offering different output resolutions
- **Aspect Ratio Preservation**: Original image aspect ratio is maintained during enhancement
- **Token-Based Pricing**: Transparent token consumption model
- **Progress Tracking**: Track enhancement jobs in real-time
- **Error Recovery**: Automatic token refund on failed enhancements
- **Rate Limiting**: Protection against abuse with configurable limits per user

---

## How It Works

The image enhancement workflow consists of four main stages:

### 1. Image Upload

Users upload their original image to the platform.

**Process:**

- Image is validated (format, size checks)
- Image is processed and stored in R2 cloud storage
- Original metadata is extracted (dimensions, format, file size)
- Image record is created in the database

**Storage Structure:**

```
R2 Bucket Structure:
├── originals/
│   ├── {userId}/
│   │   ├── {imageId}.{format}
│   │   └── ...
└── enhanced/
    ├── {userId}/
    │   ├── {imageId}-{tier}.jpg
    │   └── ...
```

### 2. Enhancement Selection

User selects an enhancement tier based on desired output quality and token budget.

**Available Tiers:**

- TIER_1K: 1024px maximum dimension
- TIER_2K: 2048px maximum dimension
- TIER_4K: 4096px maximum dimension

### 3. AI Enhancement

The backend processes the image through the enhancement pipeline.

**Processing Steps:**

1. **Aspect Ratio Preservation**
   - Image is padded to square format (Gemini requires square inputs)
   - Original aspect ratio is recorded for later restoration

2. **Gemini AI Enhancement**
   - Padded image is sent to Google Gemini API
   - AI performs upscaling and quality enhancement
   - Output is generated at selected tier resolution
   - Timeout protection: 120 seconds for 4K tier (prevents stuck jobs)
   - Automatic token refund on timeout or failure

3. **Aspect Ratio Restoration**
   - Gemini output is cropped to remove padding
   - Image is resized to target tier dimensions
   - Aspect ratio is fully preserved

4. **Quality Optimization**
   - Enhanced image is compressed as JPEG (95% quality)
   - Optimized image is stored in R2
   - Metadata is recorded in database

### 4. Comparison & Export

Users can compare original and enhanced versions side-by-side using a comparison slider tool.

**Features:**

- Interactive before/after slider
- Full-screen preview option
- One-click download of enhanced image
- Metadata display (dimensions, file size, enhancement tier)

---

## Enhancement Tiers

| Tier    | Max Dimension | Token Cost | Use Case                        | Output Quality |
| ------- | ------------- | ---------- | ------------------------------- | -------------- |
| TIER_1K | 1024px        | 2 tokens   | Quick preview, social media     | Good           |
| TIER_2K | 2048px        | 5 tokens   | Professional use, print preview | Excellent      |
| TIER_4K | 4096px        | 10 tokens  | High-resolution print, archival | Maximum        |

### Token Cost Calculation

Token cost is fixed per tier and does not depend on:

- Original image dimensions
- Enhancement duration
- Retry attempts (tokens are refunded on failure)

### Example Scenarios

**Scenario 1: Budget-Conscious User**

- User has 5 tokens
- Chooses TIER_1K (2 tokens)
- Can enhance 2 images
- Remaining tokens: 1 token

**Scenario 2: Professional Photographer**

- User subscribes to Premium Plan (100 tokens/month)
- Enhances 10 images at TIER_4K (10 × 10 = 100 tokens)
- Consumes all monthly allocation
- Next month: allocation renews

---

## Supported Formats

### Input Formats

The API accepts the following image formats for upload:

| Format | MIME Type  | Max File Size | Notes                               |
| ------ | ---------- | ------------- | ----------------------------------- |
| JPEG   | image/jpeg | 25 MB         | Most common, recommended            |
| PNG    | image/png  | 25 MB         | Supports transparency, larger files |
| WebP   | image/webp | 25 MB         | Modern format, smaller files        |
| GIF    | image/gif  | 25 MB         | Single frame only                   |
| BMP    | image/bmp  | 25 MB         | Legacy format support               |

### Output Format

All enhanced images are output as:

- **Format**: JPEG
- **Quality**: 95 (high quality)
- **Color Space**: sRGB
- **Aspect Ratio**: Same as original

---

## API Reference

### Upload Image

**Endpoint**: `POST /api/images/upload`

**Authentication**: Required (Bearer token)

**Request**:

```http
POST /api/images/upload HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: multipart/form-data

file: <binary image data>
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "image": {
    "id": "clya1b2c3d4e5f6g7h8i9j0k1",
    "name": "my-photo.jpg",
    "url": "https://r2-bucket.example.com/originals/user123/image-id.jpg",
    "width": 1920,
    "height": 1440,
    "size": 2456832,
    "format": "jpeg"
  }
}
```

**Error Responses**:

| Status | Error              | Description                            |
| ------ | ------------------ | -------------------------------------- |
| 400    | No file provided   | Request body missing image file        |
| 401    | Unauthorized       | User session invalid or missing        |
| 413    | File too large     | Exceeds 25 MB limit                    |
| 415    | Unsupported format | Image format not supported             |
| 500    | Upload failed      | S3/R2 upload error or processing error |

---

### Get Image Details

**Endpoint**: `GET /api/images/{imageId}`

**Authentication**: Required

**Request**:

```http
GET /api/images/clya1b2c3d4e5f6g7h8i9j0k1 HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "image": {
    "id": "clya1b2c3d4e5f6g7h8i9j0k1",
    "name": "my-photo.jpg",
    "description": "Optional description",
    "originalUrl": "https://r2-bucket.example.com/originals/user123/image-id.jpg",
    "originalWidth": 1920,
    "originalHeight": 1440,
    "originalSizeBytes": 2456832,
    "originalFormat": "jpeg",
    "isPublic": false,
    "enhancementJobs": [
      {
        "id": "job_001",
        "tier": "TIER_2K",
        "status": "COMPLETED",
        "tokensCost": 5,
        "enhancedUrl": "https://r2-bucket.example.com/enhanced/user123/image-id-2k.jpg",
        "enhancedWidth": 2048,
        "enhancedHeight": 1536,
        "enhancedSizeBytes": 3456789,
        "createdAt": "2025-12-02T10:30:00Z",
        "processingCompletedAt": "2025-12-02T10:35:00Z"
      }
    ]
  }
}
```

**Error Responses**:

| Status | Error           | Description             |
| ------ | --------------- | ----------------------- |
| 401    | Unauthorized    | User session invalid    |
| 403    | Forbidden       | User does not own image |
| 404    | Image not found | Image ID does not exist |
| 500    | Failed to fetch | Database error          |

---

### Enhance Image

**Endpoint**: `POST /api/images/enhance`

**Authentication**: Required

**Rate Limit**: 10 requests per minute per user

**Request**:

```http
POST /api/images/enhance HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "imageId": "clya1b2c3d4e5f6g7h8i9j0k1",
  "tier": "TIER_2K"
}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "jobId": "job_enhancement_123",
  "tokenCost": 5,
  "newBalance": 95
}
```

**Error Responses**:

| Status | Error                   | Description                             |
| ------ | ----------------------- | --------------------------------------- |
| 400    | Missing imageId or tier | Request missing required fields         |
| 400    | Invalid tier            | Tier not in [TIER_1K, TIER_2K, TIER_4K] |
| 401    | Unauthorized            | User session invalid                    |
| 402    | Insufficient tokens     | User balance < token cost               |
| 404    | Image not found         | Image ID doesn't exist or not owned     |
| 429    | Too many requests       | Rate limit exceeded (10/min)            |
| 500    | Enhancement failed      | AI processing error                     |

**Rate Limit Headers**:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1701516600
Retry-After: 6
```

---

### Delete Image

**Endpoint**: `DELETE /api/images/{imageId}`

**Authentication**: Required

**Request**:

```http
DELETE /api/images/clya1b2c3d4e5f6g7h8i9j0k1 HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "message": "Image deleted"
}
```

**Error Responses**:

| Status | Error            | Description             |
| ------ | ---------------- | ----------------------- |
| 401    | Unauthorized     | User session invalid    |
| 403    | Forbidden        | User does not own image |
| 404    | Image not found  | Image ID doesn't exist  |
| 500    | Failed to delete | R2 or database error    |

---

## Error Handling

### Common Error Scenarios

#### Insufficient Tokens (402 Payment Required)

**Cause**: User token balance is less than enhancement cost

**Response**:

```json
{
  "error": "Insufficient tokens",
  "required": 10,
  "balance": 5
}
```

**Resolution**:

1. User can purchase tokens through Stripe checkout
2. User can redeem voucher codes
3. User can wait for token regeneration (1 token per 15 minutes, max 100)
4. User can upgrade to a subscription plan

#### Rate Limit Exceeded (429 Too Many Requests)

**Cause**: User exceeded rate limit (10 enhancements per minute)

**Response**:

```json
{
  "error": "Too many requests",
  "retryAfter": 30
}
```

**Resolution**:

1. Wait `retryAfter` seconds before retrying
2. Check `Retry-After` header for recommended delay
3. Implement exponential backoff on client side

#### Enhancement Processing Failed (500)

**Cause**: Error during Gemini AI processing

**Response**:

```json
{
  "error": "Enhancement failed",
  "jobId": "job_enhancement_123"
}
```

**Resolution**:

1. Tokens are automatically refunded to user
2. User can retry the enhancement
3. Check application logs for detailed error message
4. Contact support if error persists

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "status": 400,
  "timestamp": "2025-12-02T10:30:00Z",
  "traceId": "optional-trace-id-for-debugging"
}
```

---

## Token Consumption

### Token Economy

Tokens are the primary currency for image enhancement:

**Token Sources**:

- **Automatic Regeneration**: 1 token per 15 minutes (max 100)
- **Vouchers**: Promotional codes (LAUNCH100, WELCOME50, BETA25)
- **Stripe Purchases**: One-time token packages
- **Subscriptions**: Monthly token allocation with rollover

**Token Destinations**:

- **Image Enhancement**: 2-10 tokens depending on tier
- **Future features**: TBD

### Transaction History

Users can view their token transaction history via token balance API:

```json
{
  "balance": 95,
  "lastRegeneration": "2025-12-02T10:30:00Z",
  "timeUntilNextRegenMs": 900000,
  "tokensAddedThisRequest": 1,
  "stats": {
    "totalSpent": 50,
    "totalEarned": 145,
    "totalRefunded": 5,
    "transactionCount": 12
  }
}
```

---

## Rate Limiting

### Rate Limit Configuration

| Resource            | Limit        | Window   | Notes    |
| ------------------- | ------------ | -------- | -------- |
| Image Upload        | 20 files     | 1 hour   | Per user |
| Image Enhancement   | 10 requests  | 1 minute | Per user |
| Image Deletion      | 50 deletions | 1 hour   | Per user |
| Token Balance Check | 100 requests | 1 hour   | Per user |

### Rate Limit Headers

Responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1701516600
Retry-After: 30
```

### Handling Rate Limits

**Client-Side Strategy**:

```javascript
async function enhanceImageWithRetry(imageId, tier, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api/images/enhance", {
        method: "POST",
        body: JSON.stringify({ imageId, tier }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "30");
        const backoffMs = retryAfter * 1000 * Math.pow(2, attempt - 1);

        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      return response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## Best Practices

### For Users

1. **Choose Appropriate Tier**
   - Use TIER_1K for quick previews
   - Use TIER_2K for quality balance
   - Use TIER_4K only when high resolution needed

2. **Monitor Token Balance**
   - Check balance before enhancing
   - Plan token budget for monthly enhancements
   - Subscribe if heavy usage expected

3. **Batch Operations**
   - Respect rate limits (10 per minute)
   - Space out enhancement requests
   - Use job tracking for async processing

### For Developers

1. **Token Cost Estimation**
   - Always check balance before enhancement
   - Display token cost to user upfront
   - Handle token refunds on failure

2. **Error Handling**
   - Implement retry logic with exponential backoff
   - Catch all error codes (400, 401, 402, 404, 429, 500)
   - Log errors with job IDs for debugging

3. **Performance**
   - Cache token balance locally for 30 seconds
   - Use background job processing for enhancements
   - Monitor Gemini API quota usage

---

## Job Management & Reliability

### Timeout Handling

To ensure jobs don't get stuck indefinitely, the system implements timeout protection:

**Current Implementation:**
- Vercel serverless function timeout: 300 seconds (5 minutes)
- All enhancement tiers share the same Vercel timeout limit
- No tier-specific timeouts currently implemented

**Planned Enhancements:**
Future improvements may include tier-specific timeouts:
- TIER_1K: 60 seconds (planned)
- TIER_2K: 90 seconds (planned)
- TIER_4K: 120 seconds (planned)

**Timeout Behavior:**
1. Job exceeds timeout threshold
2. Job status set to FAILED
3. Error message: "Enhancement timed out"
4. Tokens automatically refunded to user
5. Admin notification logged

**Monitoring:**
- Admin dashboard shows timeout statistics
- Jobs dashboard (`/admin/jobs`) displays timeout errors
- Automatic alerting for high timeout rates

### Job Cleanup System

Automatic cleanup maintains system performance:

**Cleanup Schedule:**
- Runs daily via cron job
- Removes old completed/failed jobs (>30 days)
- Preserves job metadata for analytics
- Prevents database bloat

**Cleanup Actions:**
1. Archive old job records
2. Remove temporary processing files
3. Update statistics aggregates
4. Generate cleanup reports

### Admin Job Dashboard

Comprehensive job management interface at `/admin/jobs`:

**Features:**
- Real-time job queue monitoring
- Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)
- Search by user email or job ID
- Retry failed jobs manually
- View detailed error logs
- Export job statistics

**Access Control:**
- SUPER_ADMIN role required
- Audit logging of all admin actions
- Protected API endpoints

---

## File Locations

**Implementation**:

- Upload handler: `src/lib/storage/upload-handler.ts`
- Enhancement processor: `src/app/api/images/enhance/route.ts`
- Token manager: `src/lib/tokens/balance-manager.ts`
- R2 client: `src/lib/storage/r2-client.ts`
- Gemini client: `src/lib/ai/gemini-client.ts`
- Admin jobs dashboard: `src/app/admin/jobs/page.tsx`

**Image Enhancement Pages**:

- Main app: `src/app/apps/images/` (formerly `/enhance`, then `/pixel`)
- Album management: `src/app/albums/`
- Pricing page: `src/app/pricing/`

**Database**:

- Schema: `prisma/schema.prisma` (EnhancedImage, ImageEnhancementJob models)
- Migrations: `prisma/migrations/`

**Tests**:

- E2E tests: `e2e/features/image-enhancement.feature`
- Step definitions: `e2e/step-definitions/image-enhancement.steps.ts`

---

## Future Enhancements

- Batch enhancement processing
- Custom enhancement parameters (style, detail level)
- Image format conversion during enhancement
- Scheduled enhancement jobs
- Enhancement templates and presets
- Team/workspace image sharing
- Enhanced retry logic with exponential backoff
- Job priority queuing
