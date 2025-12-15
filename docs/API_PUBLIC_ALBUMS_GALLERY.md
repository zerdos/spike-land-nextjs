# Public Albums Gallery API

## Overview

The Public Albums Gallery API endpoint provides access to before/after image
pairs from PUBLIC albums owned by the super admin. This is designed for showcase
galleries on public-facing pages.

## Endpoint

```
GET /api/gallery/public-albums
```

## Authentication

**No authentication required** - This is a public endpoint.

## Features

- Fetches images from PUBLIC albums only (owned by super admin:
  `zolika84@gmail.com`)
- Returns only images with COMPLETED enhancement jobs
- Includes both original and enhanced URLs for before/after comparisons
- Limited to 12 images by default
- Cached for 5 minutes with stale-while-revalidate

## Response Format

```typescript
{
  items: Array<{
    id: string; // Image ID
    title: string; // Image name/title
    originalUrl: string; // URL to original image
    enhancedUrl: string; // URL to enhanced image
    width: number; // Enhanced image width (px)
    height: number; // Enhanced image height (px)
    albumName: string; // Name of the album
    tier: "TIER_1K" | "TIER_2K" | "TIER_4K"; // Enhancement tier used
  }>;
}
```

## Example Response

```json
{
  "items": [
    {
      "id": "clx1234567",
      "title": "Mountain Landscape",
      "originalUrl": "https://pub-xxx.r2.dev/original-image.jpg",
      "enhancedUrl": "https://pub-xxx.r2.dev/enhanced-image.jpg",
      "width": 2000,
      "height": 1600,
      "albumName": "Nature Photography",
      "tier": "TIER_2K"
    }
  ]
}
```

## Usage Examples

### Client Component (React/Next.js)

```typescript
"use client";

import { useEffect, useState } from "react";

interface GalleryPhoto {
  id: string;
  title: string;
  originalUrl: string;
  enhancedUrl: string;
  width: number;
  height: number;
  albumName: string;
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";
}

export function PublicGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const response = await fetch("/api/gallery/public-albums");
        const data = await response.json();
        setPhotos(data.items);
      } catch (error) {
        console.error("Failed to fetch gallery:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchGallery();
  }, []);

  if (loading) {
    return <div>Loading gallery...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="space-y-2">
          <h3 className="font-semibold">{photo.title}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Before</p>
              <img src={photo.originalUrl} alt={`${photo.title} - Original`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                After ({photo.tier})
              </p>
              <img src={photo.enhancedUrl} alt={`${photo.title} - Enhanced`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            From album: {photo.albumName}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### Server Component (React Server Component)

```typescript
import Image from "next/image";

async function getPublicGallery() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/gallery/public-albums`, {
    next: { revalidate: 300 }, // Revalidate every 5 minutes
  });

  if (!response.ok) {
    throw new Error("Failed to fetch gallery");
  }

  return response.json();
}

export default async function GalleryPage() {
  const data = await getPublicGallery();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Featured Enhancements</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.items.map((photo) => (
          <div key={photo.id} className="border rounded-lg overflow-hidden">
            <div className="aspect-video relative">
              <Image
                src={photo.enhancedUrl}
                alt={photo.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{photo.title}</h3>
              <p className="text-sm text-muted-foreground">
                {photo.albumName} • {photo.tier}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Direct Fetch (JavaScript)

```javascript
fetch("/api/gallery/public-albums")
  .then((response) => response.json())
  .then((data) => {
    console.log(`Loaded ${data.items.length} photos`);
    data.items.forEach((photo) => {
      console.log(
        `${photo.title}: ${photo.originalUrl} → ${photo.enhancedUrl}`,
      );
    });
  })
  .catch((error) => console.error("Error:", error));
```

## Caching

- **Server-side cache**: 5 minutes (`s-maxage=300`)
- **Stale-while-revalidate**: 10 minutes (serves stale content while fetching
  fresh data)
- **Client-side**: Browsers can cache according to Cache-Control headers

## Implementation Details

### Database Query Strategy

The endpoint:

1. Finds the super admin user by email (`zolika84@gmail.com`)
2. Queries PUBLIC albums owned by that user
3. Includes album images with their enhancement jobs
4. Filters for COMPLETED jobs only
5. Orders albums by creation date (newest first)
6. Orders images within albums by sort order
7. Limits results to 12 items

### Data Validation

Images are included only if:

- They have at least one COMPLETED enhancement job
- The latest enhancement job has a valid `enhancedUrl`
- The latest enhancement job has valid dimensions (`enhancedWidth`,
  `enhancedHeight`)

## Error Responses

### Super Admin Not Found (404)

```json
{
  "error": "Super admin user not found"
}
```

### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

## Performance Considerations

- The query uses eager loading with `include` to avoid N+1 queries
- Results are limited to 12 items to prevent large payloads
- Response is cached at CDN edge for fast subsequent requests
- Database indexes on `userId`, `privacy`, and `status` ensure fast queries

## Related Endpoints

- `GET /api/gallery` - Featured gallery items (curated by admin)
- `GET /api/admin/gallery/browse` - Browse all images (admin only)
- `GET /api/albums` - User's own albums (authenticated)

## Testing

The endpoint includes comprehensive test coverage:

```bash
# Run tests
yarn test src/app/api/gallery/public-albums/route.test.ts

# Coverage areas:
# - Super admin not found scenario
# - Empty albums scenario
# - Multiple images with different tiers
# - Skipping images without enhancement jobs
# - Skipping images with incomplete data
# - Limiting to 12 items
# - Database error handling
# - Cache header validation
```

## File Locations

- **Route Handler**: `src/app/api/gallery/public-albums/route.ts`
- **Tests**: `src/app/api/gallery/public-albums/route.test.ts`
- **Documentation**: `docs/API_PUBLIC_ALBUMS_GALLERY.md`
