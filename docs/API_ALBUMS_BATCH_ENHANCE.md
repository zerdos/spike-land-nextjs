# Album Batch Enhancement API

## Overview

This document describes the API endpoint for batch enhancing all photos in an album.

## Endpoint

```
POST /api/albums/[id]/enhance
```

## Authentication

Requires authenticated user session. Returns 401 if not authenticated.

## Authorization

The user must own the album. Returns 403 if unauthorized.

## Request Body

```typescript
{
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";  // Required
  skipAlreadyEnhanced?: boolean;             // Optional, default: true
}
```

### Parameters

- **tier** (required): The enhancement tier to use
  - `TIER_1K`: 1024px max dimension, costs 2 tokens per image
  - `TIER_2K`: 2048px max dimension, costs 5 tokens per image
  - `TIER_4K`: 4096px max dimension, costs 10 tokens per image

- **skipAlreadyEnhanced** (optional, default: true): If true, skips images already enhanced at the selected tier

## Response

### Success (200 OK)

```typescript
{
  success: true;
  totalImages: number; // Total number of images in album
  skipped: number; // Number of images skipped (already enhanced)
  queued: number; // Number of images queued for enhancement
  totalCost: number; // Total tokens consumed
  newBalance: number; // User's token balance after consumption
  jobs: Array<{
    imageId: string;
    jobId: string; // Batch ID (individual job IDs created by workflow)
  }>;
}
```

### Error Responses

#### 400 Bad Request

- Invalid tier
- Too many images (max 20 per batch)

#### 401 Unauthorized

- Not authenticated

#### 402 Payment Required

- Insufficient tokens

```typescript
{
  error: "Insufficient tokens";
  required: number; // Tokens required
  toEnhance: number; // Number of images to enhance
}
```

#### 403 Forbidden

- User does not own the album

#### 404 Not Found

- Album not found
- No images in album

#### 500 Internal Server Error

- Token consumption failed
- Unexpected error

## Implementation Details

### Workflow

1. **Verify ownership**: Ensures the user owns the album
2. **Fetch images**: Retrieves all images with their enhancement job history
3. **Filter images**: Optionally skips images already enhanced at the selected tier
4. **Validate batch size**: Maximum 20 images per batch
5. **Calculate cost**: Total tokens = images to enhance × tier cost
6. **Check balance**: Verifies user has enough tokens
7. **Consume tokens**: Charges tokens upfront for the batch
8. **Start workflow**:
   - **Production** (Vercel): Uses durable workflow infrastructure
   - **Development**: Direct execution with fire-and-forget pattern
9. **Return summary**: Response includes job tracking information

### Token Costs

| Tier    | Cost per Image |
| ------- | -------------- |
| TIER_1K | 2 tokens       |
| TIER_2K | 5 tokens       |
| TIER_4K | 10 tokens      |

### Batch Processing

- Maximum batch size: 20 images
- Images are processed sequentially to avoid rate limits
- Failed jobs trigger automatic token refunds
- Each image gets its own enhancement job in the database

### Skip Already Enhanced

When `skipAlreadyEnhanced` is true (default):

- The endpoint checks for completed enhancement jobs at the selected tier
- Images with existing enhancements at that tier are skipped
- This allows re-enhancing at a different tier without duplicating work

When `skipAlreadyEnhanced` is false:

- All images are enhanced regardless of existing enhancements
- Creates new enhancement jobs even if the tier was previously used
- Useful for re-processing images with updated AI models

## Examples

### Enhance all unenhanced images at TIER_2K

```bash
curl -X POST https://spike.land/api/albums/abc123/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_2K"
  }'
```

Response:

```json
{
  "success": true,
  "totalImages": 10,
  "skipped": 3,
  "queued": 7,
  "totalCost": 35,
  "newBalance": 65,
  "jobs": [
    { "imageId": "img-1", "jobId": "album-abc123-1234567890" },
    { "imageId": "img-2", "jobId": "album-abc123-1234567890" },
    ...
  ]
}
```

### Re-enhance all images (including already enhanced)

```bash
curl -X POST https://spike.land/api/albums/abc123/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_4K",
    "skipAlreadyEnhanced": false
  }'
```

Response:

```json
{
  "success": true,
  "totalImages": 10,
  "skipped": 0,
  "queued": 10,
  "totalCost": 100,
  "newBalance": 50,
  "jobs": [...]
}
```

### All images already enhanced

```bash
curl -X POST https://spike.land/api/albums/abc123/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_1K"
  }'
```

Response:

```json
{
  "success": true,
  "totalImages": 10,
  "skipped": 10,
  "queued": 0,
  "totalCost": 0,
  "newBalance": 100,
  "jobs": []
}
```

## Testing

Comprehensive test coverage includes:

- Authentication and authorization
- Input validation (tier, batch size)
- Album ownership verification
- Already enhanced image filtering
- Token balance checks
- Cost calculation for all tiers
- Workflow execution (dev and production modes)
- Error handling

Run tests:

```bash
yarn test src/app/api/albums/[id]/enhance/route.test.ts
```

## Files

- **Route**: `/src/app/api/albums/[id]/enhance/route.ts`
- **Tests**: `/src/app/api/albums/[id]/enhance/route.test.ts`
- **Batch Workflow**: `/src/workflows/batch-enhance.workflow.ts`
- **Direct Execution**: `/src/workflows/batch-enhance.direct.ts`

## Related Documentation

- [Batch Enhancement Workflow](../src/workflows/batch-enhance.workflow.ts)
- [Token Balance Manager](../src/lib/tokens/balance-manager.ts)
- [Enhancement Costs](../src/lib/tokens/costs.ts)
