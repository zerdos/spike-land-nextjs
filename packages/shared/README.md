# @spike-npm-land/shared

Shared TypeScript types, constants, validations, and utilities for Spike Land's
web and mobile applications.

## Overview

This package provides cross-platform code sharing between:

- **Web App** (Next.js 15)
- **Mobile App** (Expo/React Native)

By extracting common code into this shared package, we ensure type safety and
consistent behavior across all platforms.

---

## Installation

This package is part of the monorepo workspace. It's automatically available to
other packages.

```typescript
// In web app or mobile app
import { ENHANCEMENT_COSTS, EnhancementTier, User } from "@spike-npm-land/shared";
```

---

## Exports

### Types (`/types`)

TypeScript interfaces extracted from the Prisma schema:

| Type               | Description                              |
| ------------------ | ---------------------------------------- |
| `User`             | User profile with role and referral info |
| `UserTokenBalance` | Token balance with regeneration tracking |
| `Image`            | User-uploaded image with metadata        |
| `EnhancedImage`    | AI-enhanced image output                 |
| `Album`            | Photo album with privacy settings        |
| `EnhancementJob`   | Enhancement job status tracking          |
| `TokenTransaction` | Token balance change record              |
| `Referral`         | Referral program tracking                |
| `MerchOrder`       | Merchandise order details                |
| `Voucher`          | Promotional voucher                      |

#### Enums

```typescript
// User roles
type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

// Enhancement quality tiers
type EnhancementTier = "FREE" | "TIER_1K" | "TIER_2K" | "TIER_4K";

// Job processing status
type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

// Album privacy settings
type AlbumPrivacy = "PRIVATE" | "UNLISTED" | "PUBLIC";

// Token transaction types
type TokenTransactionType =
  | "EARN_REGENERATION"
  | "EARN_PURCHASE"
  | "EARN_BONUS"
  | "SPEND_ENHANCEMENT"
  | "SPEND_MCP_GENERATION"
  | "REFUND";
```

---

### Constants (`/constants`)

Configuration values used across the platform:

#### Token Costs

```typescript
import { ENHANCEMENT_COSTS } from "@spike-npm-land/shared";

ENHANCEMENT_COSTS.FREE; // 0 tokens (nano model)
ENHANCEMENT_COSTS.TIER_1K; // 2 tokens (1024px)
ENHANCEMENT_COSTS.TIER_2K; // 5 tokens (2048px)
ENHANCEMENT_COSTS.TIER_4K; // 10 tokens (4096px)
```

#### Token Regeneration

```typescript
import { TOKEN_REGENERATION } from "@spike-npm-land/shared";

TOKEN_REGENERATION.TOKENS_PER_REGEN; // 1 token per interval
TOKEN_REGENERATION.REGEN_INTERVAL_MS; // 15 minutes (900,000ms)
TOKEN_REGENERATION.MAX_FREE_TOKENS; // 10 tokens max
```

#### Image Constraints

```typescript
import { IMAGE_CONSTRAINTS } from "@spike-npm-land/shared";

IMAGE_CONSTRAINTS.MAX_FILE_SIZE_BYTES; // 10MB
IMAGE_CONSTRAINTS.ALLOWED_MIME_TYPES; // ["image/jpeg", "image/png", "image/webp"]
IMAGE_CONSTRAINTS.MAX_BATCH_SIZE; // 20 images
IMAGE_CONSTRAINTS.TIER_DIMENSIONS; // { FREE: 1024, TIER_1K: 1024, ... }
```

#### Aspect Ratios

```typescript
import { SUPPORTED_ASPECT_RATIOS } from "@spike-npm-land/shared";

// ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
```

---

### Validations (`/validations`)

Zod schemas for API request/response validation:

```typescript
import { createAlbumSchema, enhanceImageSchema } from "@spike-npm-land/shared";

// Validate enhancement request
const result = enhanceImageSchema.safeParse({
  imageId: "abc123",
  tier: "TIER_2K",
});

// Validate album creation
const albumResult = createAlbumSchema.safeParse({
  name: "My Album",
  privacy: "PRIVATE",
});
```

#### Available Schemas

| Schema                 | Description                |
| ---------------------- | -------------------------- |
| `enhanceImageSchema`   | Image enhancement request  |
| `createAlbumSchema`    | Album creation request     |
| `updateAlbumSchema`    | Album update request       |
| `purchaseTokensSchema` | Token purchase request     |
| `redeemVoucherSchema`  | Voucher redemption request |
| `mobileSignInSchema`   | Mobile sign-in request     |

---

### Utilities (`/utils`)

Helper functions for common operations:

#### Token Calculations

```typescript
import {
  calculateRegeneratedTokens,
  getEnhancementCost,
  getTimeUntilNextRegen,
} from "@spike-npm-land/shared";

// Get cost for a tier
const cost = getEnhancementCost("TIER_2K"); // 5

// Calculate tokens regenerated since last update
const regenerated = calculateRegeneratedTokens(
  lastRegenDate,
  currentBalance,
  maxTokens,
);

// Time until next regeneration (ms)
const timeMs = getTimeUntilNextRegen(lastRegenDate);
```

#### Formatting

```typescript
import {
  formatCurrency,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
} from "@spike-npm-land/shared";

formatFileSize(1048576); // "1 MB"
formatDuration(90000); // "1m 30s"
formatRelativeTime(date); // "2h ago"
formatCurrency(9.99, "GBP"); // "£9.99"
```

#### Image Utilities

```typescript
import {
  calculateOutputDimensions,
  getTierDimensions,
  isAllowedMimeType,
  parseAspectRatio,
} from "@spike-npm-land/shared";

getTierDimensions("TIER_4K"); // 4096

parseAspectRatio("16:9"); // { width: 16, height: 9 }

calculateOutputDimensions(4000, 3000, 2048); // { width: 2048, height: 1536 }

isAllowedMimeType("image/jpeg"); // true
```

---

## Development

### Building

```bash
cd packages/shared

# Build once
yarn build

# Watch mode for development
yarn dev
```

### Type Checking

```bash
yarn typecheck
```

### Linting

```bash
yarn lint
```

---

## Build Output

The package is built with `tsup`:

| Output            | Format     | Description       |
| ----------------- | ---------- | ----------------- |
| `dist/index.js`   | CommonJS   | Node.js require() |
| `dist/index.mjs`  | ESM        | ES modules import |
| `dist/index.d.ts` | TypeScript | Type definitions  |

---

## Adding New Shared Code

### 1. Types

Add to `src/types/index.ts`:

```typescript
export interface NewType {
  id: string;
  name: string;
}
```

### 2. Constants

Add to `src/constants/index.ts`:

```typescript
export const NEW_CONSTANT = {
  VALUE_A: 100,
  VALUE_B: 200,
} as const;
```

### 3. Validations

Add to `src/validations/index.ts`:

```typescript
import { z } from "zod";

export const newRequestSchema = z.object({
  field: z.string().min(1),
});

export type NewRequest = z.infer<typeof newRequestSchema>;
```

### 4. Utilities

Add to `src/utils/index.ts`:

```typescript
export function newUtility(input: string): string {
  return input.toUpperCase();
}
```

### 5. Re-export

Ensure new exports are included in `src/index.ts`:

```typescript
export * from "./constants";
export * from "./types";
export * from "./utils";
export * from "./validations";
```

### 6. Rebuild

```bash
yarn build
```

---

## Integration with Monorepo

This package uses Yarn workspaces:

```yaml
# In package.json of consuming package
dependencies:
  "@spike-npm-land/shared": "workspace:*"
```

Changes to this package automatically propagate to:

- `src/` (web app) - after rebuild
- `packages/mobile-app/` - after rebuild

---

## Type Safety Improvements (#797)

### Social Platform API Types

The `@spike-npm-land/shared/types` module provides typed interfaces for all external social platform API responses, improving type safety when parsing rate limits and error responses.

#### Available Types

```typescript
import type {
  FacebookErrorResponse,
  LinkedInErrorResponse,
  SocialPlatformErrorResponse,
  TwitterErrorResponse,
} from "@spike-npm-land/shared/types";
```

| Type                          | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `TwitterErrorResponse`        | Twitter/X API error format                  |
| `FacebookErrorResponse`       | Facebook/Instagram Graph API error format   |
| `LinkedInErrorResponse`       | LinkedIn API error format                   |
| `SocialPlatformErrorResponse` | Union type for all platform error responses |
| `FacebookBusinessUsageHeader` | Facebook business usage rate limit header   |
| `FacebookAppUsageHeader`      | Facebook app usage rate limit header        |
| `TwitterRateLimitHeaders`     | Twitter rate limit headers                  |
| `DiscordRateLimitHeaders`     | Discord rate limit headers                  |

#### Type Guards

Use type guards from `@spike-npm-land/shared/types` to safely validate external API responses:

```typescript
import {
  isFacebookErrorResponse,
  isLinkedInErrorResponse,
  isSocialPlatformErrorResponse,
  isTwitterErrorResponse,
} from "@spike-npm-land/shared/types";

// Example: Validate Facebook error response
if (isFacebookErrorResponse(apiBody)) {
  // TypeScript now knows apiBody is FacebookErrorResponse
  console.log(apiBody.error?.message);
}

// Example: Generic platform error handling
if (isSocialPlatformErrorResponse(apiBody)) {
  // Handle any platform error
}
```

### Pipeline Configuration Types

Type-safe pipeline configuration types for AI processing:

```typescript
import type {
  AnalysisConfig,
  AutoCropConfig,
  GenerationConfig,
  PromptConfig,
  ValidatedPipelineConfigs,
} from "@spike-npm-land/shared/types";
```

### Cache Types

Generic cache types with expiry tracking:

```typescript
import type { CacheEntry, CacheKey, CacheMap } from "@spike-npm-land/shared/types";

// Example: Type-safe cache
const cache: CacheMap<MyDataType> = new Map();
cache.set("key", { data: myData, expiry: Date.now() + 5000 });
```

### Health Event Types

Structured types for health monitoring event details:

```typescript
import type {
  HealthEventDetails,
  RateLimitEventInfo,
  TokenEventInfo,
} from "@spike-npm-land/shared/types";
```

---

## Related Documentation

- [Mobile App README](../mobile-app/README.md) - Mobile app documentation
- [API Reference](../../docs/API_REFERENCE.md) - Backend API documentation
- [Token System](../../docs/TOKEN_SYSTEM.md) - Token economics
