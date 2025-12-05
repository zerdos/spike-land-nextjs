# API Reference

> **Last Updated**: December 2025
> **Status**: MVP Release
> **Base URL**: `https://next.spike.land` (Production) or `http://localhost:3000` (Development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Image Management](#image-management)
3. [Image Enhancement](#image-enhancement)
4. [Batch Operations](#batch-operations)
5. [Albums](#albums)
6. [Token Management](#token-management)
7. [Voucher Management](#voucher-management)
8. [Referral Program](#referral-program)
9. [Admin Dashboard](#admin-dashboard)
10. [Payment Processing](#payment-processing)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## Authentication

All protected endpoints require authentication via Bearer token (session cookie or JWT).

### Authentication Methods

1. **Session Cookie** (NextAuth.js)
   - Automatically set after login
   - Included in all requests to same domain
   - No manual token passing required

2. **Bearer Token** (API requests)
   ```http
   Authorization: Bearer {session_token}
   ```

### Login

**Endpoint**: `/api/auth/signin`

Uses NextAuth.js multi-provider authentication:

- GitHub OAuth
- Google OAuth
- Phone (Twilio) verification
- Email verification (future)

---

## Image Management

### Upload Image

Create a new image record in the system.

**Endpoint**: `POST /api/images/upload`

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Request**:

```http
POST /api/images/upload HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundary--
```

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/images/upload \
  -H "Authorization: Bearer session_token" \
  -F "file=@photo.jpg"
```

**JavaScript Example**:

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("/api/images/upload", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log(`Uploaded: ${data.image.id}`);
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

**Request Validation**:

| Field | Type | Required | Constraints                  |
| ----- | ---- | -------- | ---------------------------- |
| file  | File | Yes      | Max 25 MB, supported formats |

**Supported Formats**: JPEG, PNG, WebP, GIF, BMP

**Error Responses**:

| Status | Error                  | Description          | Solution                  |
| ------ | ---------------------- | -------------------- | ------------------------- |
| 400    | No file provided       | Request missing file | Include file in form data |
| 401    | Unauthorized           | Not authenticated    | Login first               |
| 413    | Payload too large      | File exceeds 25 MB   | Compress or split image   |
| 415    | Unsupported media type | Format not supported | Convert to JPEG/PNG       |
| 500    | Upload failed          | S3/R2 error          | Try again later           |

---

### Get Image Details

Retrieve metadata and enhancement history for an image.

**Endpoint**: `GET /api/images/{imageId}`

**Authentication**: Required

**Path Parameters**:

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| imageId   | string | Image ID from upload response |

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
    "createdAt": "2025-12-02T10:15:00Z",
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
      },
      {
        "id": "job_002",
        "tier": "TIER_4K",
        "status": "PROCESSING",
        "tokensCost": 10,
        "createdAt": "2025-12-02T10:40:00Z"
      }
    ]
  }
}
```

**Enhancement Job Status Values**:

- `PROCESSING`: Enhancement in progress
- `COMPLETED`: Successfully enhanced
- `FAILED`: Enhancement failed (tokens refunded)

**Error Responses**:

| Status | Error           | Description       | Solution                     |
| ------ | --------------- | ----------------- | ---------------------------- |
| 401    | Unauthorized    | Not authenticated | Login first                  |
| 403    | Forbidden       | Not image owner   | Cannot access others' images |
| 404    | Image not found | ID doesn't exist  | Check image ID               |
| 500    | Failed to fetch | Database error    | Try again later              |

---

### Delete Image

Permanently delete an image and all its enhancements.

**Endpoint**: `DELETE /api/images/{imageId}`

**Authentication**: Required

**Path Parameters**:

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| imageId   | string | Image ID to delete |

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

| Status | Error            | Description       | Solution                     |
| ------ | ---------------- | ----------------- | ---------------------------- |
| 401    | Unauthorized     | Not authenticated | Login first                  |
| 403    | Forbidden        | Not image owner   | Cannot delete others' images |
| 404    | Image not found  | ID doesn't exist  | Check image ID               |
| 500    | Failed to delete | R2/DB error       | Try again later              |

---

## Batch Operations

### Batch Upload Images

Upload multiple images in a single request.

**Endpoint**: `POST /api/images/batch-upload`

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Request**:

```http
POST /api/images/batch-upload HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: multipart/form-data

files: [file1.jpg, file2.jpg, file3.jpg]
albumId: album_123 (optional)
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "uploaded": 3,
  "failed": 0,
  "images": [
    {
      "id": "img_001",
      "name": "photo1.jpg",
      "url": "https://r2-bucket.example.com/originals/user123/img_001.jpg",
      "width": 1920,
      "height": 1440
    }
  ]
}
```

**Error Responses**:

| Status | Error             | Description                       |
| ------ | ----------------- | --------------------------------- |
| 400    | No files provided | Request missing files             |
| 401    | Unauthorized      | Not authenticated                 |
| 413    | Payload too large | Total files exceed size limit     |
| 429    | Too many requests | Rate limit exceeded (20 per hour) |

---

### Batch Enhance Images

Enhance multiple images asynchronously.

**Endpoint**: `POST /api/images/batch-enhance`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/images/batch-enhance HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "imageIds": ["img_001", "img_002", "img_003"],
  "tier": "TIER_2K"
}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "batchId": "batch_enhance_abc123",
  "totalCost": 15,
  "imageCount": 3,
  "jobs": [
    {
      "imageId": "img_001",
      "jobId": "job_001",
      "status": "PROCESSING"
    }
  ]
}
```

**Error Responses**:

| Status | Error               | Description                          |
| ------ | ------------------- | ------------------------------------ |
| 400    | No images provided  | imageIds array empty                 |
| 401    | Unauthorized        | Not authenticated                    |
| 402    | Insufficient tokens | Balance too low for all enhancements |
| 429    | Too many requests   | Rate limit exceeded                  |

---

## Image Enhancement

### Request Enhancement

Start an image enhancement job.

**Endpoint**: `POST /api/images/enhance`

**Authentication**: Required

**Rate Limit**: 10 requests per minute per user

**Content-Type**: `application/json`

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

**Request Body**:

| Field   | Type   | Required | Options                   |
| ------- | ------ | -------- | ------------------------- |
| imageId | string | Yes      | Valid image ID            |
| tier    | string | Yes      | TIER_1K, TIER_2K, TIER_4K |

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/images/enhance \
  -H "Authorization: Bearer session_token" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "clya1b2c3d4e5f6g7h8i9j0k1",
    "tier": "TIER_2K"
  }'
```

**JavaScript Example**:

```javascript
const response = await fetch("/api/images/enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageId: "clya1b2c3d4e5f6g7h8i9j0k1",
    tier: "TIER_2K",
  }),
});

const result = await response.json();
console.log(`Job ID: ${result.jobId}`);
console.log(`Tokens Cost: ${result.tokenCost}`);
console.log(`New Balance: ${result.newBalance}`);
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "jobId": "job_enhancement_abc123",
  "tokenCost": 5,
  "newBalance": 95
}
```

**Response Fields**:

| Field      | Type    | Description                            |
| ---------- | ------- | -------------------------------------- |
| success    | boolean | Always true on 200                     |
| jobId      | string  | Unique job identifier (track progress) |
| tokenCost  | number  | Tokens deducted for this job           |
| newBalance | number  | Token balance after deduction          |

**Error Responses**:

| Status | Error                   | Description            | Solution                          |
| ------ | ----------------------- | ---------------------- | --------------------------------- |
| 400    | Missing imageId or tier | Required field missing | Provide both fields               |
| 400    | Invalid tier            | Tier not recognized    | Use TIER_1K, TIER_2K, or TIER_4K  |
| 401    | Unauthorized            | Not authenticated      | Login first                       |
| 402    | Insufficient tokens     | Balance too low        | Purchase tokens or redeem voucher |
| 404    | Image not found         | Image ID invalid       | Check image ID and ownership      |
| 429    | Too many requests       | Rate limit exceeded    | Wait before next request          |
| 500    | Enhancement failed      | Processing error       | Try again or contact support      |

**Rate Limit Headers**:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1701516600
Retry-After: 60
```

---

### Get Enhancement Job Status

**Endpoint**: `GET /api/jobs/{jobId}`

**Authentication**: Required

**Path Parameters**:

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| jobId     | string | Enhancement job ID |

**Request**:

```http
GET /api/jobs/job_enhancement_abc123 HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "job": {
    "id": "job_enhancement_abc123",
    "imageId": "clya1b2c3d4e5f6g7h8i9j0k1",
    "tier": "TIER_2K",
    "status": "COMPLETED",
    "tokensCost": 5,
    "enhancedUrl": "https://r2-bucket.example.com/enhanced/user123/image-id-2k.jpg",
    "enhancedWidth": 2048,
    "enhancedHeight": 1536,
    "createdAt": "2025-12-02T10:30:00Z",
    "processingCompletedAt": "2025-12-02T10:35:00Z"
  }
}
```

---

### Export Enhanced Image

Export an enhanced image in a specific format.

**Endpoint**: `POST /api/images/export`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/images/export HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "jobId": "job_enhancement_abc123",
  "format": "PNG"
}
```

**Request Body**:

| Field  | Type   | Required | Options         |
| ------ | ------ | -------- | --------------- |
| jobId  | string | Yes      | Valid job ID    |
| format | string | Yes      | PNG, JPEG, WebP |

**Response (Success - 200)**:

```json
{
  "success": true,
  "downloadUrl": "https://r2-bucket.example.com/export/user123/image-id-2k.png",
  "format": "PNG",
  "size": 3456789
}
```

**Error Responses**:

| Status | Error          | Description                     |
| ------ | -------------- | ------------------------------- |
| 400    | Invalid format | Format not in [PNG, JPEG, WebP] |
| 401    | Unauthorized   | Not authenticated               |
| 404    | Job not found  | Job ID doesn't exist            |

---

### Get Image Version History

Retrieve all enhancement versions for an image.

**Endpoint**: `GET /api/images/{imageId}/versions`

**Authentication**: Required

**Request**:

```http
GET /api/images/clya1b2c3d4e5f6g7h8i9j0k1/versions HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "imageId": "clya1b2c3d4e5f6g7h8i9j0k1",
  "versions": [
    {
      "jobId": "job_001",
      "tier": "TIER_2K",
      "status": "COMPLETED",
      "enhancedUrl": "https://r2-bucket.example.com/enhanced/user123/image-id-2k.jpg",
      "createdAt": "2025-12-02T10:30:00Z",
      "processingCompletedAt": "2025-12-02T10:35:00Z"
    }
  ]
}
```

---

## Albums

### Create Album

Create a new album for organizing images.

**Endpoint**: `POST /api/albums`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/albums HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "name": "Family Photos 2025",
  "description": "Summer vacation photos",
  "isPublic": false
}
```

**Response (Success - 201)**:

```json
{
  "success": true,
  "album": {
    "id": "album_abc123",
    "name": "Family Photos 2025",
    "description": "Summer vacation photos",
    "isPublic": false,
    "imageCount": 0,
    "shareLink": "https://next.spike.land/albums/album_abc123/share/token_xyz",
    "createdAt": "2025-12-02T10:00:00Z"
  }
}
```

---

### Get Album Details

Retrieve album information and images.

**Endpoint**: `GET /api/albums/{albumId}`

**Authentication**: Required

**Request**:

```http
GET /api/albums/album_abc123 HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "album": {
    "id": "album_abc123",
    "name": "Family Photos 2025",
    "imageCount": 5,
    "createdAt": "2025-12-02T10:00:00Z",
    "images": [
      {
        "id": "img_001",
        "name": "photo1.jpg",
        "originalUrl": "https://r2-bucket.example.com/originals/user123/img_001.jpg",
        "enhancedVersions": 2
      }
    ]
  }
}
```

---

### Add Images to Album

Add existing images to an album.

**Endpoint**: `POST /api/albums/{albumId}/images`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/albums/album_abc123/images HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "imageIds": ["img_001", "img_002"]
}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "addedCount": 2,
  "albumImageCount": 5
}
```

---

### Update Album

Update album name, description, or privacy settings.

**Endpoint**: `PATCH /api/albums/{albumId}`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
PATCH /api/albums/album_abc123 HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "name": "Updated Album Name",
  "isPublic": true
}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "album": {
    "id": "album_abc123",
    "name": "Updated Album Name",
    "isPublic": true
  }
}
```

---

### Delete Album

Permanently delete an album (images not deleted).

**Endpoint**: `DELETE /api/albums/{albumId}`

**Authentication**: Required

**Request**:

```http
DELETE /api/albums/album_abc123 HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "message": "Album deleted"
}
```

---

## Token Management

### Get Token Balance

Retrieve current token balance and statistics.

**Endpoint**: `GET /api/tokens/balance`

**Authentication**: Required

**Request**:

```http
GET /api/tokens/balance HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "balance": 95,
  "lastRegeneration": "2025-12-02T10:30:00Z",
  "timeUntilNextRegenMs": 854000,
  "tokensAddedThisRequest": 1,
  "stats": {
    "totalSpent": 50,
    "totalEarned": 145,
    "totalRefunded": 5,
    "transactionCount": 12
  }
}
```

**Response Fields**:

| Field                  | Type       | Description                                     |
| ---------------------- | ---------- | ----------------------------------------------- |
| balance                | number     | Current token balance                           |
| lastRegeneration       | ISO string | Timestamp of last regeneration                  |
| timeUntilNextRegenMs   | number     | Milliseconds until next +1 token                |
| tokensAddedThisRequest | number     | Tokens added during this request (regeneration) |
| stats                  | object     | Lifetime statistics                             |
| stats.totalSpent       | number     | Tokens consumed (image enhancements)            |
| stats.totalEarned      | number     | Tokens received (purchases, vouchers)           |
| stats.totalRefunded    | number     | Tokens refunded (failed jobs)                   |
| stats.transactionCount | number     | Total number of transactions                    |

**cURL Example**:

```bash
curl http://localhost:3000/api/tokens/balance \
  -H "Authorization: Bearer session_token"
```

**JavaScript Example**:

```javascript
const response = await fetch("/api/tokens/balance");
const data = await response.json();

console.log(`Balance: ${data.balance} tokens`);
console.log(`Next regeneration in: ${Math.ceil(data.timeUntilNextRegenMs / 1000)}s`);
```

**Error Responses**:

| Status | Error           | Description       |
| ------ | --------------- | ----------------- |
| 401    | Unauthorized    | Not authenticated |
| 500    | Failed to fetch | Database error    |

---

## Voucher Management

### Validate Voucher

Check if a voucher code is valid and available.

**Endpoint**: `POST /api/vouchers/validate`

**Authentication**: Optional

**Content-Type**: `application/json`

**Request**:

```http
POST /api/vouchers/validate HTTP/1.1
Content-Type: application/json

{
  "code": "LAUNCH100"
}
```

**Response (Success - 200)**:

```json
{
  "valid": true,
  "voucher": {
    "code": "LAUNCH100",
    "type": "FIXED_TOKENS",
    "value": 100,
    "status": "ACTIVE",
    "maxUses": 1000,
    "currentUses": 247,
    "available": true,
    "expiresAt": null
  }
}
```

**Response (Invalid - 400)**:

```json
{
  "valid": false,
  "error": "Voucher not found"
}
```

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/vouchers/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "LAUNCH100"}'
```

**Error Responses**:

| Status | Error                    | Description            |
| ------ | ------------------------ | ---------------------- |
| 400    | Voucher code is required | Missing code field     |
| 400    | Voucher not found        | Code doesn't exist     |
| 400    | Voucher is inactive      | Status is INACTIVE     |
| 400    | Voucher is expired       | Expiration date passed |
| 400    | Voucher is depleted      | Max uses reached       |
| 500    | Failed to validate       | Database error         |

---

### Redeem Voucher

Redeem a voucher code to receive tokens.

**Endpoint**: `POST /api/vouchers/redeem`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/vouchers/redeem HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "code": "LAUNCH100"
}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "tokensGranted": 100,
  "newBalance": 245
}
```

**JavaScript Example**:

```javascript
const response = await fetch("/api/vouchers/redeem", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: "LAUNCH100" }),
});

const result = await response.json();
if (result.success) {
  console.log(`Redeemed! +${result.tokensGranted} tokens`);
  console.log(`New balance: ${result.newBalance}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

**Error Responses**:

| Status | Error                       | Description                       |
| ------ | --------------------------- | --------------------------------- |
| 400    | Voucher code is required    | Missing code field                |
| 400    | You have already redeemed   | User already redeemed this code   |
| 400    | (various validation errors) | See validate endpoint for details |
| 401    | Authentication required     | Not logged in                     |
| 500    | Failed to redeem            | Database error                    |

---

## Referral Program

### Get Referral Link

Generate a unique referral link for sharing.

**Endpoint**: `GET /api/referral/link`

**Authentication**: Required

**Request**:

```http
GET /api/referral/link HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "referralLink": "https://next.spike.land?ref=abc123xyz",
  "referralCode": "abc123xyz",
  "baseTokenReward": 50
}
```

---

### Get Referral Statistics

View referral performance and earnings.

**Endpoint**: `GET /api/referral/stats`

**Authentication**: Required

**Request**:

```http
GET /api/referral/stats HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "stats": {
    "totalReferrals": 5,
    "completedReferrals": 4,
    "pendingReferrals": 1,
    "totalTokensEarned": 200,
    "referrals": [
      {
        "userId": "user_456",
        "email": "friend@example.com",
        "status": "COMPLETED",
        "tokensReward": 50,
        "referredAt": "2025-12-01T10:00:00Z"
      }
    ]
  }
}
```

**Error Responses**:

| Status | Error        | Description       |
| ------ | ------------ | ----------------- |
| 401    | Unauthorized | Not authenticated |

---

## Admin Dashboard

All admin endpoints require authentication with admin role.

### Get User Analytics

Retrieve user growth and engagement metrics.

**Endpoint**: `GET /api/admin/analytics/users`

**Authentication**: Required (Admin role)

**Request**:

```http
GET /api/admin/analytics/users?period=month HTTP/1.1
Authorization: Bearer {admin_token}
```

**Query Parameters**:

| Parameter | Type   | Required | Options                |
| --------- | ------ | -------- | ---------------------- |
| period    | string | No       | day, week, month, year |

**Response (Success - 200)**:

```json
{
  "success": true,
  "analytics": {
    "totalUsers": 1250,
    "newUsersThisPeriod": 145,
    "activeUsers": 892,
    "churnRate": 0.08,
    "registrationTrend": [
      {
        "date": "2025-12-01",
        "count": 25
      }
    ]
  }
}
```

---

### Get Token Analytics

Retrieve token economy metrics.

**Endpoint**: `GET /api/admin/analytics/tokens`

**Authentication**: Required (Admin role)

**Request**:

```http
GET /api/admin/analytics/tokens?period=month HTTP/1.1
Authorization: Bearer {admin_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "analytics": {
    "tokensGenerated": 15000,
    "tokensPurchased": 8500,
    "tokensConsumed": 12000,
    "averageTokensPerUser": 42,
    "revenue": 2847.50,
    "topPackage": "professional_500"
  }
}
```

---

### Get System Health

Check job queue and system status.

**Endpoint**: `GET /api/admin/system/health`

**Authentication**: Required (Admin role)

**Request**:

```http
GET /api/admin/system/health HTTP/1.1
Authorization: Bearer {admin_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "jobs": {
      "pending": 12,
      "processing": 8,
      "completed": 1540,
      "failed": 3
    },
    "failureRate": 0.19,
    "averageProcessingTime": 15.3
  }
}
```

---

### Get Users (Search & Manage)

Search and manage user accounts.

**Endpoint**: `GET /api/admin/users`

**Authentication**: Required (Admin role)

**Query Parameters**:

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| search    | string | No       | Search by email or name        |
| role      | string | No       | Filter by user role            |
| limit     | number | No       | Results per page (default: 20) |
| offset    | number | No       | Pagination offset (default: 0) |

**Request**:

```http
GET /api/admin/users?search=test@example.com&limit=10 HTTP/1.1
Authorization: Bearer {admin_token}
```

**Response (Success - 200)**:

```json
{
  "success": true,
  "users": [
    {
      "id": "user_123",
      "email": "test@example.com",
      "name": "Test User",
      "role": "USER",
      "tokenBalance": 95,
      "createdAt": "2025-12-01T10:00:00Z",
      "lastActive": "2025-12-02T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 10,
    "offset": 0
  }
}
```

---

### Create Voucher

Create a new promotional voucher.

**Endpoint**: `POST /api/admin/vouchers`

**Authentication**: Required (Admin role)

**Content-Type**: `application/json`

**Request**:

```http
POST /api/admin/vouchers HTTP/1.1
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "HOLIDAY50",
  "type": "FIXED_TOKENS",
  "value": 50,
  "maxUses": 1000,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response (Success - 201)**:

```json
{
  "success": true,
  "voucher": {
    "id": "voucher_abc123",
    "code": "HOLIDAY50",
    "type": "FIXED_TOKENS",
    "value": 50,
    "maxUses": 1000,
    "currentUses": 0,
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

**Error Responses**:

| Status | Error               | Description             |
| ------ | ------------------- | ----------------------- |
| 400    | Code already exists | Voucher code not unique |
| 401    | Unauthorized        | Not admin               |

---

## Payment Processing

### Create Checkout Session (One-Time Purchase)

Create a Stripe checkout session to purchase tokens.

**Endpoint**: `POST /api/stripe/checkout`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/stripe/checkout HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "packageId": "professional_500",
  "mode": "payment"
}
```

**Valid Package IDs**:

- `starter_50` - 50 tokens for £2.99
- `essential_150` - 150 tokens for £7.99
- `professional_500` - 500 tokens for £19.99
- `enterprise_2000` - 2000 tokens for £59.99

**Request Body**:

| Field     | Type   | Required    | Description                   |
| --------- | ------ | ----------- | ----------------------------- |
| packageId | string | Conditional | Required if mode=payment      |
| mode      | string | Yes         | "payment" or "subscription"   |
| planId    | string | Conditional | Required if mode=subscription |

**Response (Success - 200)**:

```json
{
  "success": true,
  "sessionId": "cs_live_123abc...",
  "url": "https://checkout.stripe.com/pay/cs_live_123abc..."
}
```

**JavaScript Example**:

```javascript
const response = await fetch("/api/stripe/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    packageId: "professional_500",
    mode: "payment",
  }),
});

const data = await response.json();
window.location.href = data.url; // Redirect to Stripe checkout
```

**Error Responses**:

| Status | Error               | Description                       |
| ------ | ------------------- | --------------------------------- |
| 400    | Package ID required | Missing packageId in payment mode |
| 400    | Invalid package ID  | packageId not recognized          |
| 401    | Unauthorized        | Not authenticated                 |
| 500    | Failed to create    | Stripe API error                  |

---

### Create Checkout Session (Subscription)

Create a Stripe checkout session to subscribe to token plan.

**Endpoint**: `POST /api/stripe/checkout`

**Authentication**: Required

**Content-Type**: `application/json`

**Request**:

```http
POST /api/stripe/checkout HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "planId": "professional_100",
  "mode": "subscription"
}
```

**Valid Plan IDs**:

- `starter_20` - 20 tokens/month for £2.99
- `professional_100` - 100 tokens/month for £9.99
- `enterprise_500` - 500 tokens/month for £29.99

**Response (Success - 200)**:

```json
{
  "success": true,
  "sessionId": "cs_live_sub_123abc...",
  "url": "https://checkout.stripe.com/pay/cs_live_sub_123abc..."
}
```

**Error Responses**:

| Status | Error                      | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| 400    | Plan ID required           | Missing planId in subscription mode  |
| 400    | Invalid plan ID            | planId not recognized                |
| 400    | Active subscription exists | User already has active subscription |
| 401    | Unauthorized               | Not authenticated                    |
| 500    | Failed to create           | Stripe API error                     |

---

## Error Handling

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "status": 400,
  "timestamp": "2025-12-02T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning                | Common Cause                           |
| ---- | ---------------------- | -------------------------------------- |
| 200  | Success                | Request completed successfully         |
| 400  | Bad Request            | Invalid parameters or validation error |
| 401  | Unauthorized           | Missing or invalid authentication      |
| 402  | Payment Required       | Insufficient tokens                    |
| 403  | Forbidden              | Not authorized for this resource       |
| 404  | Not Found              | Resource doesn't exist                 |
| 413  | Payload Too Large      | File or request too large              |
| 415  | Unsupported Media Type | Invalid content type                   |
| 429  | Too Many Requests      | Rate limit exceeded                    |
| 500  | Server Error           | Internal server error                  |

### Retry Strategy

**Idempotent Requests** (safe to retry):

- GET requests
- DELETE requests (returns 404 if already deleted)

**Non-Idempotent Requests** (use idempotency keys):

- POST /api/images/enhance (can retry safely, tokens refunded on duplicate)
- POST /api/vouchers/redeem (safe, blocked by unique constraint)

**Exponential Backoff Pattern**:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
```

---

## Rate Limiting

### Rate Limit Configuration

| Resource            | Limit        | Window   |
| ------------------- | ------------ | -------- |
| Image Upload        | 20 files     | 1 hour   |
| Image Enhancement   | 10 requests  | 1 minute |
| Token Balance Check | 100 requests | 1 hour   |
| Voucher Validation  | 50 requests  | 1 hour   |
| Voucher Redemption  | 5 attempts   | 1 hour   |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1701516600
```

**Header Meanings**:

- `X-RateLimit-Limit`: Max requests in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### 429 Response

When limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701516630
```

### Client Implementation

```javascript
async function fetchWithRateLimit(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = parseInt(
      response.headers.get("Retry-After") || "30",
    );
    console.log(`Rate limited. Retry after ${retryAfter}s`);

    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

    return fetchWithRateLimit(url, options); // Retry
  }

  return response;
}
```

---

## Implementation Examples

### Complete Enhancement Workflow

```javascript
async function enhanceImage(imageId, tier = "TIER_2K") {
  try {
    // 1. Check token balance first
    const balanceRes = await fetch("/api/tokens/balance");
    const balance = await balanceRes.json();

    const tierCosts = { TIER_1K: 2, TIER_2K: 5, TIER_4K: 10 };
    const cost = tierCosts[tier];

    if (balance.balance < cost) {
      console.error(`Insufficient tokens. Need ${cost}, have ${balance.balance}`);
      return null;
    }

    // 2. Request enhancement
    const enhanceRes = await fetch("/api/images/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, tier }),
    });

    if (!enhanceRes.ok) {
      const error = await enhanceRes.json();
      throw new Error(error.error);
    }

    const job = await enhanceRes.json();
    console.log(`Enhancement started: ${job.jobId}`);

    // 3. Poll for completion
    let completed = false;
    let attempts = 0;

    while (!completed && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await fetch(`/api/jobs/${job.jobId}`);
      const status = await statusRes.json();

      if (status.job.status === "COMPLETED") {
        console.log(`Enhancement complete: ${status.job.enhancedUrl}`);
        completed = true;
        return status.job;
      }

      if (status.job.status === "FAILED") {
        throw new Error("Enhancement failed");
      }

      attempts++;
    }

    throw new Error("Enhancement timeout");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}
```

---
