# Album API Quick Reference

Quick lookup guide for Album endpoints.

## Endpoint Summary

| Method | Path                       | Purpose           | Auth     | Rate Limit |
| ------ | -------------------------- | ----------------- | -------- | ---------- |
| GET    | `/api/albums`              | List all albums   | Required | 10/min     |
| POST   | `/api/albums`              | Create album      | Required | 10/min     |
| GET    | `/api/albums/{id}`         | Get album details | Optional | 10/min     |
| PATCH  | `/api/albums/{id}`         | Update album      | Required | 10/min     |
| DELETE | `/api/albums/{id}`         | Delete album      | Required | 10/min     |
| POST   | `/api/albums/{id}/enhance` | Batch enhance     | Required | 10/min     |

## Request Templates

### List Albums

```bash
curl -X GET http://localhost:3000/api/albums
```

**Response**: `{ albums: [] }`

### Create Album

```bash
curl -X POST http://localhost:3000/api/albums \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Album Name",
    "description": "Optional",
    "privacy": "PRIVATE"
  }'
```

**Response**: `{ album: { id, name, description, privacy, shareToken, createdAt } }`

### Get Album

```bash
curl -X GET http://localhost:3000/api/albums/ALBUM_ID
```

**Response**: `{ album: { id, name, images: [], ... } }`

### Update Album

```bash
curl -X PATCH http://localhost:3000/api/albums/ALBUM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Name",
    "privacy": "UNLISTED",
    "coverImageId": "IMG_ID"
  }'
```

**Response**: `{ album: { id, name, privacy, coverImageId, ... } }`

### Delete Album

```bash
curl -X DELETE http://localhost:3000/api/albums/ALBUM_ID
```

**Response**: `{ success: true }`

### Batch Enhance

```bash
curl -X POST http://localhost:3000/api/albums/ALBUM_ID/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_2K",
    "skipAlreadyEnhanced": true
  }'
```

**Response**: `{ success: true, totalImages: 5, queued: 3, totalCost: 15, newBalance: 85, jobs: [] }`

## Status Codes

| Code | Meaning           | Common Cause                                   |
| ---- | ----------------- | ---------------------------------------------- |
| 200  | Success           | Request succeeded                              |
| 400  | Bad Request       | Invalid input (name too long, invalid privacy) |
| 401  | Unauthorized      | Not authenticated                              |
| 402  | Payment Required  | Insufficient tokens for enhancement            |
| 403  | Forbidden         | Not the album owner                            |
| 404  | Not Found         | Album doesn't exist                            |
| 429  | Too Many Requests | Rate limit exceeded                            |
| 500  | Server Error      | Internal error                                 |

## Privacy Levels

```
PRIVATE   -> Owner only, no share token
UNLISTED  -> Share via token, not searchable
PUBLIC    -> Publicly accessible
```

## Token Costs

```
TIER_1K   -> 2 tokens per image
TIER_2K   -> 5 tokens per image
TIER_4K   -> 10 tokens per image
```

Max 20 images per batch.

## JavaScript Quick Examples

```javascript
// List
await fetch("/api/albums").then(r => r.json());

// Create
fetch("/api/albums", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Album" }),
}).then(r => r.json());

// Get
await fetch("/api/albums/ID").then(r => r.json());

// Update
fetch("/api/albums/ID", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ privacy: "UNLISTED" }),
}).then(r => r.json());

// Delete
await fetch("/api/albums/ID", { method: "DELETE" }).then(r => r.json());

// Enhance
fetch("/api/albums/ID/enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tier: "TIER_2K" }),
}).then(r => r.json());
```

## Error Examples

```json
// 400 - Invalid name
{ "error": "Album name must be 100 characters or less" }

// 401 - Not authenticated
{ "error": "Unauthorized" }

// 402 - Insufficient tokens
{ "error": "Insufficient tokens", "required": 50, "toEnhance": 10 }

// 403 - Not owner
{ "error": "Forbidden" }

// 404 - Album not found
{ "error": "Album not found" }

// 429 - Rate limited
{ "error": "Too many requests" }
```

## Field Sizes

| Field        | Max Length                | Required              |
| ------------ | ------------------------- | --------------------- |
| name         | 100 chars                 | Yes                   |
| description  | 500 chars                 | No                    |
| privacy      | PRIVATE, UNLISTED, PUBLIC | No (default: PRIVATE) |
| coverImageId | Must be in album          | No                    |

## Common Patterns

### Make Album Shareable

```javascript
// Change from PRIVATE to UNLISTED
const res = await fetch(`/api/albums/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ privacy: "UNLISTED" }),
});
const { album } = await res.json();
const shareUrl = `https://spike.land/albums/${id}?token=${album.shareToken}`;
```

### Check Token Balance Before Enhance

```javascript
const res = await fetch(`/api/albums/${id}/enhance`, {
  method: "POST",
  body: JSON.stringify({ tier: "TIER_2K" }),
});

if (res.status === 402) {
  const { required } = await res.json();
  console.log(`Need ${required} tokens`);
} else {
  const { newBalance } = await res.json();
  console.log(`Balance: ${newBalance}`);
}
```

### Enhance Only New Images

```javascript
const res = await fetch(`/api/albums/${id}/enhance`, {
  method: "POST",
  body: JSON.stringify({
    tier: "TIER_2K",
    skipAlreadyEnhanced: true, // Skip previously enhanced
  }),
});
```

## Response Field Reference

### Album Object

```javascript
{
  id: string,           // Unique album ID
  name: string,         // Album name
  description: string?, // Optional description
  privacy: string,      // PRIVATE | UNLISTED | PUBLIC
  coverImageId: string?,// ID of cover image
  shareToken: string?,  // Share token (if privacy != PRIVATE)
  imageCount: integer,  // Number of images
  isOwner: boolean,     // Is authenticated user the owner
  images: [{            // Array of images in album
    id: string,
    name: string,
    originalUrl: string,
    enhancedUrl: string?,
    enhancementTier: string?,
    width: integer,
    height: integer,
    sortOrder: integer,
    createdAt: string   // ISO 8601 timestamp
  }],
  createdAt: string,    // ISO 8601 timestamp
  updatedAt: string     // ISO 8601 timestamp
}
```

### Batch Enhance Response

```javascript
{
  success: boolean,          // Always true if 200
  totalImages: integer,      // Images in album
  skipped: integer,         // Already enhanced (skipped)
  queued: integer,          // Images being enhanced
  totalCost: integer,       // Tokens consumed
  newBalance: integer,      // New token balance
  jobs: [{
    imageId: string,
    jobId: string
  }]
}
```

## Import to Postman

1. Copy `docs/api/openapi.yaml` content
2. Postman: Import > Raw text
3. Paste entire file
4. Click "Import"
5. All endpoints auto-generated with examples

## Import to Swagger UI

1. Go to https://editor.swagger.io
2. File > Import URL
3. Paste: URL to `docs/api/openapi.yaml`
4. All endpoints viewable and testable

## Documentation Files

- **openapi.yaml** - Complete OpenAPI 3.0 specification (1598 lines)
- **ALBUM_ENDPOINTS.md** - Detailed endpoint documentation (666 lines)
- **QUICK_REFERENCE.md** - This file (quick lookup)
- **README.md** - Overview and setup guide

## Full Documentation

See **ALBUM_ENDPOINTS.md** for:

- Detailed endpoint descriptions
- Multiple language examples (cURL, JavaScript, HTTP)
- Use case scenarios
- Error handling guide
- Authentication details
- Privacy level explanations
- Token economy reference
- Testing instructions
