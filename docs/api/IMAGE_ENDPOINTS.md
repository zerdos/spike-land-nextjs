# Image Enhancement API Endpoints

Complete REST API documentation for image management and AI-powered enhancement
operations in Spike Land.

Last Updated: December 2025 Status: Production Ready

---

## Table of Contents

1. [Authentication](#authentication)
2. [Token System](#token-system)
3. [Image Upload](#image-upload)
4. [Image Enhancement](#image-enhancement)
5. [Album Management](#album-management)
6. [Image Retrieval](#image-retrieval)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints require authentication via NextAuth.js session cookie or Bearer
token.

### Session Cookie (Default)

```
Cookie: next-auth.session-token={token}
```

### Bearer Token

```
Authorization: Bearer {session_token}
```

---

## Token System

Image enhancements consume tokens from the user's balance:

| Tier    | Tokens    | Resolution | Use Case                   |
| ------- | --------- | ---------- | -------------------------- |
| TIER_1K | 2 tokens  | 1K         | Quick enhancement, preview |
| TIER_2K | 5 tokens  | 2K         | High quality enhancement   |
| TIER_4K | 10 tokens | 4K         | Ultra high quality         |

Tokens regenerate automatically: 1 token per 15 minutes (max 100).

Operations fail with **402 Payment Required** if insufficient tokens.

---

## Image Upload

### Upload Single Image

```http
POST /api/images/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

file=@photo.jpg
albumId=album_123abc (optional)
```

**Success Response (200)**

```json
{
  "success": true,
  "image": {
    "id": "img_123abc",
    "name": "photo.jpg",
    "url": "https://cdn.spike.land/images/img_123abc.jpg",
    "width": 1920,
    "height": 1080,
    "size": 524288,
    "format": "JPEG",
    "isPublic": false,
    "viewCount": 0,
    "createdAt": "2025-12-12T10:30:00Z"
  }
}
```

**Error Response (400)**

```json
{
  "error": "File exceeds maximum size of 10MB",
  "title": "Invalid File",
  "suggestion": "Please upload a file smaller than 10MB"
}
```

**cURL Example**

```bash
curl -X POST http://localhost:3000/api/images/upload \
  -H "Cookie: next-auth.session-token={token}" \
  -F "file=@photo.jpg"
```

**JavaScript Example**

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("albumId", "album_123abc"); // optional

const response = await fetch("/api/images/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(result.image.id);
```

### Upload Multiple Images (Batch)

```http
POST /api/images/batch-upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

files=@photo1.jpg
files=@photo2.png
files=@photo3.jpg
```

**Constraints**

- Maximum 20 files per batch
- Maximum 10MB per file
- Maximum 50MB total batch size

**Success Response (200)**

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "filename": "photo1.jpg",
      "imageId": "img_123abc",
      "url": "https://cdn.spike.land/images/img_123abc.jpg",
      "width": 1920,
      "height": 1080,
      "size": 524288,
      "format": "JPEG"
    },
    {
      "success": false,
      "filename": "toolarge.jpg",
      "error": "File exceeds maximum size of 10MB",
      "errorType": "validation"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

**Features**

- Partial success allowed (some files may fail)
- Automatic R2 cleanup on database transaction failure
- Results returned in same order as uploaded files
- Detailed error messages per file

**JavaScript Example**

```javascript
const formData = new FormData();
for (let file of fileInputElement.files) {
  formData.append("files", file);
}

const response = await fetch("/api/images/batch-upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
result.results.forEach((r, idx) => {
  if (r.success) {
    console.log(`File ${idx + 1}: ${r.imageId}`);
  } else {
    console.error(`File ${idx + 1}: ${r.error}`);
  }
});
```

---

## Image Enhancement

### Enhance Single Image

```http
POST /api/images/enhance
Content-Type: application/json
Authorization: Bearer {token}

{
  "imageId": "img_123abc",
  "tier": "TIER_2K"
}
```

**Success Response (200)**

```json
{
  "success": true,
  "jobId": "job_789xyz",
  "tokenCost": 5,
  "newBalance": 95
}
```

**Insufficient Tokens Response (402)**

```json
{
  "error": "Insufficient tokens for this operation",
  "title": "Low Balance",
  "suggestion": "Purchase more tokens to continue",
  "required": 10
}
```

**JavaScript Example**

```javascript
const response = await fetch("/api/images/enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageId: "img_123abc",
    tier: "TIER_2K",
  }),
});

if (response.status === 402) {
  const error = await response.json();
  console.log(`Need ${error.required} tokens`);
  return;
}

const result = await response.json();
console.log(`Job started: ${result.jobId}`);
```

### Enhance with Multiple Tiers (Parallel)

Process the same image with multiple enhancement tiers simultaneously.

```http
POST /api/images/parallel-enhance
Content-Type: application/json
Authorization: Bearer {token}

{
  "imageId": "img_123abc",
  "tiers": ["TIER_1K", "TIER_2K", "TIER_4K"]
}
```

**Success Response (200)**

```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "job_123abc",
      "tier": "TIER_1K",
      "tokenCost": 2,
      "status": "PROCESSING"
    },
    {
      "jobId": "job_456def",
      "tier": "TIER_2K",
      "tokenCost": 5,
      "status": "PROCESSING"
    },
    {
      "jobId": "job_789xyz",
      "tier": "TIER_4K",
      "tokenCost": 10,
      "status": "PROCESSING"
    }
  ],
  "totalCost": 17,
  "newBalance": 83
}
```

**Constraints**

- 1-3 unique tiers per request
- No duplicate tiers allowed
- All tokens consumed atomically (all-or-nothing)

**JavaScript Example**

```javascript
const response = await fetch("/api/images/parallel-enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageId: "img_123abc",
    tiers: ["TIER_2K", "TIER_4K"],
  }),
});

const result = await response.json();
console.log(`${result.jobs.length} jobs started`);
console.log(`Total cost: ${result.totalCost} tokens`);
```

### Polling Enhancement Status

Use GET /api/images/{id} to check job status.

```http
GET /api/images/img_123abc
Authorization: Bearer {token}
```

**Response with Jobs**

```json
{
  "success": true,
  "image": {
    "id": "img_123abc",
    "name": "photo.jpg",
    "url": "https://cdn.spike.land/images/img_123abc.jpg",
    "width": 1920,
    "height": 1080,
    "size": 524288,
    "format": "JPEG",
    "isPublic": false,
    "viewCount": 0,
    "createdAt": "2025-12-12T10:30:00Z",
    "jobs": [
      {
        "id": "job_123abc",
        "tier": "TIER_1K",
        "status": "COMPLETED",
        "tokensCost": 2,
        "enhancedUrl": "https://cdn.spike.land/enhanced/job_123abc.jpg",
        "enhancedWidth": 1920,
        "enhancedHeight": 1080,
        "enhancedSizeBytes": 612352,
        "errorMessage": null,
        "createdAt": "2025-12-12T10:31:00Z",
        "processingStartedAt": "2025-12-12T10:31:05Z",
        "processingCompletedAt": "2025-12-12T10:32:00Z"
      },
      {
        "id": "job_456def",
        "tier": "TIER_4K",
        "status": "PROCESSING",
        "tokensCost": 10,
        "enhancedUrl": null,
        "enhancedWidth": null,
        "enhancedHeight": null,
        "enhancedSizeBytes": null,
        "errorMessage": null,
        "createdAt": "2025-12-12T10:31:30Z",
        "processingStartedAt": "2025-12-12T10:31:35Z",
        "processingCompletedAt": null
      }
    ]
  }
}
```

**Job Status Values**

- `PENDING`: Job queued, not yet started
- `PROCESSING`: Enhancement in progress
- `COMPLETED`: Enhancement finished successfully
- `FAILED`: Enhancement failed with error
- `REFUNDED`: Job failed, tokens refunded
- `CANCELLED`: Job was cancelled

---

## Album Management

### Move Images to Album

Move images between albums. Optionally remove from source album.

```http
POST /api/images/move-to-album
Content-Type: application/json
Authorization: Bearer {token}

{
  "imageIds": ["img_123abc", "img_456def", "img_789xyz"],
  "targetAlbumId": "album_abc123",
  "removeFromSourceAlbum": "album_old" (optional)
}
```

**Constraints**

- Maximum 100 images per request
- Target album must be owned by user
- All images must be owned by user

**Success Response (200)**

```json
{
  "success": true,
  "moved": 3,
  "failed": 0,
  "alreadyInAlbum": 0,
  "results": [
    {
      "imageId": "img_123abc",
      "success": true
    },
    {
      "imageId": "img_456def",
      "success": true
    },
    {
      "imageId": "img_789xyz",
      "success": true
    }
  ]
}
```

**JavaScript Example**

```javascript
const response = await fetch("/api/images/move-to-album", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageIds: ["img_123abc", "img_456def"],
    targetAlbumId: "album_xyz789",
  }),
});

const result = await response.json();
console.log(`Moved ${result.moved} images`);
if (result.failed > 0) {
  console.log(`Failed: ${result.failed}`);
}
```

---

## Image Retrieval

### Get Image with Jobs

```http
GET /api/images/{id}
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "image": {
    "id": "img_123abc",
    "name": "photo.jpg",
    "description": "My favorite photo",
    "url": "https://cdn.spike.land/images/img_123abc.jpg",
    "width": 1920,
    "height": 1080,
    "size": 524288,
    "format": "JPEG",
    "isPublic": false,
    "viewCount": 5,
    "createdAt": "2025-12-12T10:30:00Z",
    "updatedAt": "2025-12-12T10:30:00Z",
    "jobs": [...]
  }
}
```

### Delete Image

```http
DELETE /api/images/{id}
Authorization: Bearer {token}
```

**Success Response (200)**

```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

**Features**

- Deletes image and all enhancement jobs
- Removes files from R2 storage
- Transactional operation
- Only image owner can delete

---

## Error Handling

### Common Error Responses

**Unauthorized (401)**

```json
{
  "error": "You must be logged in to access this resource",
  "title": "Authentication Required",
  "suggestion": "Please log in and try again"
}
```

**Rate Limited (429)**

```json
{
  "error": "You've exceeded the rate limit",
  "title": "Rate Limited",
  "suggestion": "Please wait before making more requests",
  "retryAfter": 60
}
```

**Validation Error (400)**

```json
{
  "error": "Invalid input",
  "title": "Bad Request",
  "suggestion": "Please provide both imageId and tier"
}
```

**Internal Error (500)**

```json
{
  "error": "Upload processing failed",
  "title": "Server Error",
  "suggestion": "Please try again later"
}
```

### Error Codes

| Code                | Status | Meaning                    |
| ------------------- | ------ | -------------------------- |
| UNAUTHORIZED        | 401    | Authentication required    |
| FORBIDDEN           | 403    | Permission denied          |
| NOT_FOUND           | 404    | Resource not found         |
| INVALID_INPUT       | 400    | Invalid request parameters |
| FILE_TOO_LARGE      | 400    | File exceeds size limit    |
| RATE_LIMIT          | 429    | Rate limit exceeded        |
| INSUFFICIENT_TOKENS | 402    | Not enough tokens          |
| INTERNAL_ERROR      | 500    | Server error               |

---

## Rate Limiting

Endpoints are rate limited per user:

| Endpoint             | Limit        | Window     |
| -------------------- | ------------ | ---------- |
| Upload               | 30 requests  | 15 minutes |
| Batch Upload         | 30 requests  | 15 minutes |
| Enhancement          | 50 requests  | 15 minutes |
| Parallel Enhancement | 50 requests  | 15 minutes |
| Move to Album        | 50 requests  | 15 minutes |
| Get Image            | 100 requests | 15 minutes |

### Rate Limit Headers

```
Retry-After: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1734516000
```

### Handling Rate Limits

**Exponential Backoff Example**

```javascript
async function enhanceWithRetry(imageId, tier, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch("/api/images/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, tier }),
    });

    if (response.status !== 429) {
      return response.json();
    }

    const retryAfter = parseInt(response.headers.get("Retry-After"));
    const delay = retryAfter * 1000 * Math.pow(2, attempt);

    console.log(`Rate limited. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Max retries exceeded");
}
```

---

## Request/Response Examples

### Complete Enhancement Workflow

```javascript
async function enhanceImage() {
  // 1. Upload image
  const uploadForm = new FormData();
  uploadForm.append("file", imageFile);

  const uploadRes = await fetch("/api/images/upload", {
    method: "POST",
    body: uploadForm,
  });

  const { image } = await uploadRes.json();
  console.log(`Uploaded: ${image.id}`);

  // 2. Start enhancement
  const enhanceRes = await fetch("/api/images/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageId: image.id,
      tier: "TIER_2K",
    }),
  });

  if (enhanceRes.status === 402) {
    console.log("Insufficient tokens");
    return;
  }

  const { jobId, newBalance } = await enhanceRes.json();
  console.log(`Enhancement started: ${jobId}`);
  console.log(`Tokens remaining: ${newBalance}`);

  // 3. Poll for completion
  let completed = false;
  while (!completed) {
    const statusRes = await fetch(`/api/images/${image.id}`);
    const { image: imageData } = await statusRes.json();

    const job = imageData.jobs[0];
    console.log(`Job status: ${job.status}`);

    if (job.status === "COMPLETED") {
      console.log(`Enhanced URL: ${job.enhancedUrl}`);
      completed = true;
    } else if (job.status === "FAILED") {
      console.error(`Job failed: ${job.errorMessage}`);
      completed = true;
    } else {
      await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds
    }
  }
}
```

---

## API Client Library

### Using with Fetch

```javascript
class SpikeImageAPI {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async uploadImage(file, albumId) {
    const formData = new FormData();
    formData.append("file", file);
    if (albumId) formData.append("albumId", albumId);

    const res = await fetch(`${this.baseUrl}/api/images/upload`, {
      method: "POST",
      body: formData,
    });

    return res.json();
  }

  async enhanceImage(imageId, tier) {
    const res = await fetch(`${this.baseUrl}/api/images/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, tier }),
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getImage(imageId) {
    const res = await fetch(`${this.baseUrl}/api/images/${imageId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async moveToAlbum(imageIds, targetAlbumId) {
    const res = await fetch(`${this.baseUrl}/api/images/move-to-album`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds, targetAlbumId }),
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
```

---

## Best Practices

1. **Batch Uploads**: Use batch-upload for multiple images to reduce latency
2. **Parallel Enhancement**: Use parallel-enhance to process multiple tiers
   simultaneously
3. **Poll for Status**: Check job status by fetching the image regularly
4. **Error Handling**: Implement exponential backoff for rate limit retries
5. **Token Management**: Monitor token balance and warn users before depletion
6. **File Validation**: Validate file size and format before uploading
7. **User Feedback**: Show upload/enhancement progress to users
8. **Cleanup**: Delete failed images to save storage space

---

## Troubleshooting

**Q: I'm getting "Insufficient tokens" errors** A: Check user's token balance
and offer to purchase more tokens. Tokens regenerate automatically (1 per 15
min, max 100).

**Q: Rate limit errors** A: Implement exponential backoff retry logic. Check
`Retry-After` header for wait time.

**Q: Enhancement job stuck in PROCESSING** A: Jobs should complete within 1-5
minutes depending on tier. Check logs for timeout errors.

**Q: File upload fails with validation error** A: Ensure file is < 10MB and in
supported format (JPEG, PNG, WebP, HEIC).

**Q: Batch upload partial failures** A: This is expected behavior. Check
`results` array for individual file status.

---

## Version History

### v1.0.0 (December 2025)

- Initial API release
- Single and batch image upload
- Single and parallel enhancement
- Album management
- Complete error handling
- Rate limiting

---

## Support

For API issues or questions:

- Email: support@spike.land
- GitHub Issues: https://github.com/spike-land/issues
- Documentation: https://spike.land/docs
