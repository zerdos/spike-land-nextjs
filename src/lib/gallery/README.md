# Gallery Utilities

This directory contains utilities for working with the featured gallery and public photo collections.

## Super Admin Public Photos

### `getSuperAdminPublicPhotos(limit?: number): Promise<FeaturedPhoto[]>`

Fetches public album photos from the super admin user for display in featured galleries or public showcases.

#### Features

- **Server-side only**: Intended for use in Server Components or API routes
- **Public albums only**: Only fetches photos from albums with `PUBLIC` privacy setting
- **Completed enhancements only**: Only returns photos with successfully enhanced versions
- **Latest enhancement**: Uses the most recent completed enhancement job for each image
- **Configurable limit**: Optional parameter to limit the number of photos returned
- **Graceful fallback**: Returns empty array if super admin doesn't exist

#### Return Type

```typescript
interface FeaturedPhoto {
  id: string; // Image ID
  title: string; // Image name/title
  originalUrl: string; // URL to original image
  enhancedUrl: string; // URL to enhanced image
  width: number; // Enhanced image width in pixels
  height: number; // Enhanced image height in pixels
  albumName: string; // Name of the album containing this photo
  tier: EnhancementTier; // Enhancement tier used (TIER_1K, TIER_2K, TIER_4K)
}
```

#### Usage Examples

**Basic Usage (Server Component)**

```typescript
import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";

export default async function GalleryPage() {
  const photos = await getSuperAdminPublicPhotos();

  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id}>
          <img
            src={photo.enhancedUrl}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
          />
          <p>{photo.title}</p>
          <span>{photo.albumName}</span>
        </div>
      ))}
    </div>
  );
}
```

**With Limit (API Route)**

```typescript
import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";
import { NextResponse } from "next/server";

export async function GET() {
  // Get only the 10 most recent photos
  const photos = await getSuperAdminPublicPhotos(10);

  return NextResponse.json({ photos });
}
```

**Homepage Hero Gallery**

```typescript
import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";

export default async function HomePage() {
  // Get 3 featured photos for hero section
  const heroPhotos = await getSuperAdminPublicPhotos(3);

  return (
    <section className="hero">
      <h1>Amazing AI-Enhanced Photos</h1>
      <div className="hero-gallery">
        {heroPhotos.map((photo) => (
          <div key={photo.id} className="hero-photo">
            <img
              src={photo.enhancedUrl}
              alt={photo.title}
              className="rounded-lg shadow-lg"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

**With Before/After Comparison**

```typescript
import ComparisonSlider from "@/components/ComparisonSlider";
import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";

export default async function ShowcasePage() {
  const photos = await getSuperAdminPublicPhotos(6);

  return (
    <div className="showcase">
      {photos.map((photo) => (
        <ComparisonSlider
          key={photo.id}
          before={photo.originalUrl}
          after={photo.enhancedUrl}
          title={photo.title}
          tier={photo.tier}
        />
      ))}
    </div>
  );
}
```

#### Technical Details

**Query Optimization**

The function uses optimized Prisma queries with:

- Nested includes for albums, images, and enhancement jobs
- Filtering for PUBLIC albums only
- Filtering for COMPLETED jobs only
- Ordering by album creation date (most recent first)
- Ordering by image sort order within albums
- Limiting enhancement jobs to 1 per image (most recent)

**Data Requirements**

For a photo to be included in the results:

1. Must be in a PUBLIC album owned by the super admin
2. Must have at least one COMPLETED enhancement job
3. Enhancement job must have a non-null `enhancedUrl`
4. Enhancement job must have valid dimensions (`enhancedWidth` and `enhancedHeight`)

**Performance Considerations**

- Uses database-level filtering to minimize data transfer
- Early return if super admin doesn't exist
- Stops processing once limit is reached
- Suitable for server-side rendering and API routes

#### Testing

The utility includes comprehensive test coverage for:

- Super admin not existing
- No public albums
- No completed enhancement jobs
- Missing enhanced dimensions
- Single and multiple albums
- Limit parameter behavior
- Multiple enhancement jobs (uses most recent)

Run tests with:

```bash
yarn test src/lib/gallery/super-admin-photos.test.ts
```
