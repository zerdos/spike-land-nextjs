# Pixel - AI Image Enhancement App

> **Last Updated**: December 2025 **Status**: Production **App URL**:
> [spike.land/apps/pixel](https://spike.land/apps/pixel)

This document consolidates all Pixel app documentation into a single reference.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Enhancement Tiers](#enhancement-tiers)
4. [Token Economy](#token-economy)
5. [Technical Architecture](#technical-architecture)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Privacy & Compliance](#privacy--compliance)
10. [Future Features](#future-features)

---

## Overview

Pixel is an AI-powered image enhancement app that allows users to upload photos,
enhance their quality using Google Gemini AI, and compare/export improved
versions.

### Platform Integration

Pixel serves multiple roles within the Spike Land ecosystem:

1. **Showcase Application**: Demonstrates platform AI capabilities
2. **Revenue Generator**: Token-based monetization model
3. **Technical Reference**: Integration patterns for future apps

### Key Capabilities

- **AI-Powered Enhancement**: Google Gemini API for intelligent upscaling
- **Multiple Quality Tiers**: Three output resolution options (1K, 2K, 4K)
- **Aspect Ratio Preservation**: Original proportions maintained
- **Token-Based Pricing**: Transparent, pay-per-use model
- **Progress Tracking**: Real-time job status
- **Error Recovery**: Automatic token refund on failures

---

## Core Features

### Image Upload & Management

- **Formats**: JPEG, PNG, WebP, GIF, BMP (max 25 MB)
- **Storage**: Cloudflare R2 with signed URLs
- **Albums**: Organize photos into collections
- **Batch Upload**: Multiple images at once

### AI Enhancement

| Tier    | Max Dimension | Token Cost | Use Case              |
| ------- | ------------- | ---------- | --------------------- |
| TIER_1K | 1024px        | 2 tokens   | Quick preview, social |
| TIER_2K | 2048px        | 5 tokens   | Professional use      |
| TIER_4K | 4096px        | 10 tokens  | High-resolution print |

**Processing Steps**:

1. Image padded to square (Gemini requirement)
2. AI enhancement via Google Gemini
3. Aspect ratio restored by cropping
4. Output compressed as JPEG (95% quality)
5. Stored in R2 and database updated

### Comparison & Export

- **Interactive Slider**: Before/after comparison
- **Version History**: All enhancement versions
- **Export Formats**: JPEG, PNG, WebP
- **Sharing**: Public links via shareToken

---

## Enhancement Tiers

### Token Cost Calculation

Token cost is fixed per tier regardless of:

- Original image dimensions
- Enhancement duration
- Retry attempts (refunded on failure)

### Output Format

All enhanced images are output as:

- **Format**: JPEG
- **Quality**: 95 (high quality)
- **Color Space**: sRGB
- **Aspect Ratio**: Same as original

---

## Token Economy

### Token Sources

| Source                 | Amount                       |
| ---------------------- | ---------------------------- |
| New User Bonus         | 50 tokens                    |
| Automatic Regeneration | 1 token per 15 min (max 100) |
| Referral (both users)  | 50 tokens each               |
| Stripe Purchase        | 10-500 tokens per package    |
| Voucher Codes          | Variable                     |

### Token Packages (Stripe)

| Package | Tokens | Price (GBP) |
| ------- | ------ | ----------- |
| Starter | 10     | 2.99        |
| Basic   | 50     | 9.99        |
| Pro     | 150    | 24.99       |
| Power   | 500    | 69.99       |

### Subscription Plans

| Plan    | Tokens/Month | Price (GBP) | Max Rollover |
| ------- | ------------ | ----------- | ------------ |
| Hobby   | 30           | 4.99        | 30           |
| Creator | 100          | 12.99       | 100          |
| Studio  | 300          | 29.99       | Unlimited    |

### Referral Program

- Each user gets a unique referral link
- New user signs up via link: both get 50 tokens
- Anti-fraud: IP checks, email verification, disposable email blocking

---

## Technical Architecture

### Stack

| Component | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | Next.js 15, React, Tailwind, shadcn |
| Backend   | Next.js API Routes, Prisma ORM      |
| Database  | PostgreSQL (Neon)                   |
| Storage   | Cloudflare R2                       |
| AI        | Google Gemini API                   |
| Payments  | Stripe                              |
| Auth      | NextAuth.js (GitHub, Google OAuth)  |

### Storage Structure

```
R2 Bucket:
├── originals/{userId}/{imageId}.{format}
└── enhanced/{userId}/{imageId}-{tier}.jpg
```

### Rate Limits

| Resource            | Limit        | Window   |
| ------------------- | ------------ | -------- |
| Image Upload        | 20 files     | 1 hour   |
| Image Enhancement   | 10 requests  | 1 minute |
| Token Balance Check | 100 requests | 1 hour   |

---

## API Reference

### Upload Image

```http
POST /api/images/upload
Content-Type: multipart/form-data
Authorization: Bearer {session_token}

file: <binary image data>
```

**Response (200)**:

```json
{
  "success": true,
  "image": {
    "id": "clya1b2c3d4e5f6g7h8i9j0k1",
    "url": "https://...",
    "width": 1920,
    "height": 1440
  }
}
```

### Enhance Image

```http
POST /api/images/enhance
Content-Type: application/json
Authorization: Bearer {session_token}

{
  "imageId": "clya1b2c3d4e5f6g7h8i9j0k1",
  "tier": "TIER_2K"
}
```

**Response (200)**:

```json
{
  "success": true,
  "jobId": "job_enhancement_123",
  "tokenCost": 5,
  "newBalance": 95
}
```

### Error Codes

| Status | Error               | Description               |
| ------ | ------------------- | ------------------------- |
| 400    | Invalid tier        | Tier not in valid options |
| 401    | Unauthorized        | User session invalid      |
| 402    | Insufficient tokens | Balance < token cost      |
| 429    | Too many requests   | Rate limit exceeded       |
| 500    | Enhancement failed  | AI processing error       |

For complete API documentation, see [API_REFERENCE.md](./API_REFERENCE.md).

---

## Database Schema

### Core Models

**EnhancedImage** - Stores uploaded images:

```prisma
model EnhancedImage {
  id                String   @id @default(cuid())
  userId            String
  originalUrl       String
  originalWidth     Int
  originalHeight    Int
  isPublic          Boolean  @default(false)
  enhancementJobs   ImageEnhancementJob[]
}
```

**ImageEnhancementJob** - Tracks enhancement requests:

```prisma
model ImageEnhancementJob {
  id                String          @id @default(cuid())
  imageId           String
  tier              EnhancementTier // TIER_1K, TIER_2K, TIER_4K
  status            JobStatus       // PENDING, PROCESSING, COMPLETED, FAILED
  tokensCost        Int
  enhancedUrl       String?
}
```

**UserTokenBalance** - User token balances:

```prisma
model UserTokenBalance {
  id               String   @id @default(cuid())
  userId           String   @unique
  balance          Int      @default(0)
  lastRegeneration DateTime
}
```

For complete Pixel-specific schema documentation including extended models, see
[archive/IMAGE_ENHANCEMENT_SCHEMA.md](./archive/IMAGE_ENHANCEMENT_SCHEMA.md).
For core Spike Land platform schema (User, App, Requirement, MonetizationModel),
see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

---

## Implementation Roadmap

### Phase Status

| Phase   | Focus           | Status   |
| ------- | --------------- | -------- |
| Phase 1 | MVP             | COMPLETE |
| Phase 2 | Token Economy   | COMPLETE |
| Phase 3 | Albums & Export | COMPLETE |
| Phase 4 | Referral        | COMPLETE |
| Phase 5 | Dashboard       | COMPLETE |

### Completed Features

- Image upload and enhancement (all tiers)
- Token balance management
- Stripe payment integration
- Album organization
- Batch upload and enhancement
- Referral program with anti-fraud
- Admin analytics dashboard
- Voucher system
- Legal pages (Terms, Privacy, Contact)

---

## Privacy & Compliance

### Data Collection

| Data Type       | Purpose                | Legal Basis          |
| --------------- | ---------------------- | -------------------- |
| Email           | Account identification | Contract performance |
| Uploaded images | Core service           | Contract performance |
| Payment info    | Process purchases      | Contract performance |

### What We DON'T Do

- Images are NOT used for AI training
- No biometric data extraction
- No facial recognition storage
- EXIF data stripped on upload

### Data Retention

| Data Type       | Retention Period          |
| --------------- | ------------------------- |
| User account    | Until deletion request    |
| Images          | 90 days after last access |
| Transaction log | 7 years (legal)           |

### User Rights (GDPR)

- **Access**: Export all data (JSON format)
- **Erasure**: Delete account and all data
- **Portability**: Download data in structured format
- **Objection**: Opt-out of analytics

### Security Measures

- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- OAuth 2.0 authentication
- Rate limiting on all endpoints
- CORS protection

---

## Future Features

### Planned Enhancements

| Feature             | Priority | Status  |
| ------------------- | -------- | ------- |
| AI Model Selection  | Medium   | Planned |
| Smart Suggestions   | Medium   | Planned |
| API Access (Public) | High     | Planned |
| Team Accounts       | Medium   | Planned |

### Not Currently Planned

- Mobile native app (PWA sufficient)
- Full editing suite (focus on AI enhancement)
- Gamification system (simple referral preferred)

---

## File Locations

### Implementation

| File                                  | Purpose           |
| ------------------------------------- | ----------------- |
| `src/app/apps/pixel/`                 | Main app pages    |
| `src/lib/storage/r2-client.ts`        | R2 storage client |
| `src/lib/ai/gemini-client.ts`         | Gemini AI client  |
| `src/lib/tokens/balance-manager.ts`   | Token management  |
| `src/app/api/images/enhance/route.ts` | Enhancement API   |

### Tests

| File                                     | Purpose        |
| ---------------------------------------- | -------------- |
| `e2e/features/image-enhancement.feature` | E2E tests      |
| `src/app/api/images/*.test.ts`           | API unit tests |

---

## Related Documentation

- [User Guide](./USER_GUIDE.md) - End-user documentation
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Full Prisma schema
- [Token System](./TOKEN_SYSTEM.md) - Token economics details

---

## Historical Documentation

The following documents have been archived as their content is now consolidated
here:

- `docs/archive/IMAGE_ENHANCEMENT.md`
- `docs/archive/IMAGE_ENHANCEMENT_VISION.md`
- `docs/archive/IMAGE_ENHANCEMENT_ROADMAP.md`
- `docs/archive/IMAGE_ENHANCEMENT_SCHEMA.md`
- `docs/archive/IMAGE_ENHANCEMENT_SUGGESTIONS.md`
- `docs/archive/IMAGE_ENHANCEMENT_PRIVACY.md`

---

_Last Updated: December 2025_
