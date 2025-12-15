# Image Enhancement App - Database Schema

This document describes the database schema for the Image Enhancement App, which
extends the Spike Land platform's core models.

## Overview

The schema is defined in `prisma/schema.prisma` using Prisma ORM with
PostgreSQL. The Image Enhancement App utilizes 19 interconnected models
organized into functional groups.

---

## Entity Relationship Diagram

```
                                    +------------------+
                                    |      User        |
                                    +------------------+
                                    | id               |
                                    | email            |
                                    | name             |
                                    | stripeCustomerId |
                                    +--------+---------+
                                             |
          +----------------------------------+----------------------------------+
          |                |                 |                |                 |
          v                v                 v                v                 v
+------------------+ +------------------+ +------------------+ +------------------+ +------------------+
| UserTokenBalance | | EnhancedImage    | | Album            | | Subscription     | | StripePayment    |
+------------------+ +------------------+ +------------------+ +------------------+ +------------------+
| balance          | | originalUrl      | | name             | | status           | | amountUSD        |
| lastRegeneration | | originalR2Key    | | privacy          | | tokensPerMonth   | | tokensGranted    |
+------------------+ | isPublic         | | shareToken       | | rolloverTokens   | +------------------+
                     +--------+---------+ +--------+---------+ +------------------+
                              |                    |
                              v                    v
                     +------------------+ +------------------+
                     | ImageEnhancement | | AlbumImage       |
                     | Job              | +------------------+
                     +------------------+ | sortOrder        |
                     | tier             | +------------------+
                     | tokensCost       |
                     | status           |
                     | enhancedUrl      |
                     +------------------+
```

---

## Core Models

### User Model

The central entity that owns all user-specific data.

```prisma
model User {
  id               String    @id @default(cuid())
  name             String?
  email            String?   @unique
  emailVerified    DateTime?
  image            String?
  stripeCustomerId String?   @unique
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relationships
  accounts          Account[]
  sessions          Session[]
  apps              App[]
  tokenBalance      UserTokenBalance?
  tokenTransactions TokenTransaction[]
  stripePayments    StripePayment[]
  subscription      Subscription?
  enhancedImages    EnhancedImage[]
  enhancementJobs   ImageEnhancementJob[]
  albums            Album[]
  voucherRedemptions VoucherRedemption[]
}
```

**Key Notes:**

- User ID is stable across OAuth providers (email-based hash via `src/auth.ts`)
- `stripeCustomerId` links to Stripe for payments
- One-to-one relationship with `UserTokenBalance`

---

## Image Enhancement Models

### EnhancedImage

Stores original uploaded images before enhancement.

```prisma
model EnhancedImage {
  id                String   @id @default(cuid())
  userId            String
  name              String
  description       String?
  originalUrl       String              // Public URL for display
  originalR2Key     String              // R2 storage key
  originalWidth     Int
  originalHeight    Int
  originalSizeBytes Int
  originalFormat    String              // e.g., "jpeg", "png", "webp"
  isPublic          Boolean  @default(false)
  viewCount         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relationships
  user            User                  @relation(...)
  enhancementJobs ImageEnhancementJob[]
  albumImages     AlbumImage[]

  // Indexes
  @@index([userId, createdAt])
  @@index([isPublic, createdAt])
}
```

**Storage Pattern:**

- Original images stored in Cloudflare R2
- `originalR2Key` is the storage identifier
- `originalUrl` is the public-facing URL

### ImageEnhancementJob

Tracks each enhancement request and its result.

```prisma
model ImageEnhancementJob {
  id                    String           @id @default(cuid())
  imageId               String
  userId                String
  tier                  EnhancementTier  // TIER_1K, TIER_2K, TIER_4K
  tokensCost            Int              // 2, 5, or 10 tokens
  status                JobStatus        // PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
  enhancedUrl           String?
  enhancedR2Key         String?
  enhancedWidth         Int?
  enhancedHeight        Int?
  enhancedSizeBytes     Int?
  errorMessage          String?
  retryCount            Int              @default(0)
  maxRetries            Int              @default(3)
  geminiPrompt          String?          // AI prompt used
  processingStartedAt   DateTime?
  processingCompletedAt DateTime?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  // Relationships
  image EnhancedImage @relation(...)
  user  User          @relation(...)

  // Indexes
  @@index([userId, status, createdAt])
  @@index([imageId])
  @@index([status, updatedAt])
}
```

**Enhancement Tiers:**

| Tier    | Max Dimension | Token Cost |
| ------- | ------------- | ---------- |
| TIER_1K | 1024px        | 2 tokens   |
| TIER_2K | 2048px        | 5 tokens   |
| TIER_4K | 4096px        | 10 tokens  |

**Job Status Flow:**

```
PENDING -> PROCESSING -> COMPLETED
                     \-> FAILED -> (retry) -> PROCESSING
                                          \-> REFUNDED
```

---

## Token System Models

### UserTokenBalance

Tracks each user's current token balance.

```prisma
model UserTokenBalance {
  id               String   @id @default(cuid())
  userId           String   @unique
  balance          Int      @default(0)
  lastRegeneration DateTime @default(now())  // For auto-regeneration
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(...)
}
```

**Regeneration:**

- 1 token every 15 minutes (configurable)
- Maximum balance cap: 100 tokens (free regeneration limit)

### TokenTransaction

Audit log for all token changes.

```prisma
model TokenTransaction {
  id           String               @id @default(cuid())
  userId       String
  amount       Int                  // Positive = earn, Negative = spend
  type         TokenTransactionType
  source       String?              // e.g., "stripe", "enhancement", "voucher"
  sourceId     String?              // Reference to source entity
  balanceAfter Int                  // Balance after transaction
  metadata     Json?
  createdAt    DateTime             @default(now())

  user User @relation(...)
}
```

**Transaction Types:**

- `EARN_REGENERATION` - Auto-regenerated tokens
- `EARN_PURCHASE` - Purchased via Stripe
- `EARN_BONUS` - Promotional/voucher tokens
- `SPEND_ENHANCEMENT` - Used for image enhancement
- `REFUND` - Refunded due to failed job

### TokensPackage

Purchasable token packages.

```prisma
model TokensPackage {
  id            String   @id @default(cuid())
  name          String
  tokens        Int
  priceUSD      Decimal  @db.Decimal(10, 2)
  stripePriceId String   @unique
  active        Boolean  @default(true)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  stripePayments StripePayment[]
}
```

**Current Packages:**

| Package | Tokens | Price (GBP) |
| ------- | ------ | ----------- |
| Starter | 10     | 2.99        |
| Basic   | 50     | 9.99        |
| Pro     | 150    | 24.99       |
| Power   | 500    | 69.99       |

### StripePayment

Records of completed payments.

```prisma
model StripePayment {
  id                    String              @id @default(cuid())
  userId                String
  packageId             String
  tokensGranted         Int
  amountUSD             Decimal             @db.Decimal(10, 2)
  stripePaymentIntentId String              @unique
  status                StripePaymentStatus // PENDING, SUCCEEDED, FAILED, REFUNDED
  metadata              Json?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  user    User          @relation(...)
  package TokensPackage @relation(...)
}
```

---

## Subscription Models

### Subscription

Active user subscriptions.

```prisma
model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  stripeSubscriptionId String             @unique
  stripePriceId        String
  status               SubscriptionStatus // ACTIVE, CANCELED, PAST_DUE, UNPAID, TRIALING
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  tokensPerMonth       Int
  rolloverTokens       Int                @default(0)
  maxRollover          Int                @default(0)  // 0 = unlimited
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  user User @relation(...)
}
```

### SubscriptionPlan

Available subscription tiers.

```prisma
model SubscriptionPlan {
  id             String   @id @default(cuid())
  name           String
  tokensPerMonth Int
  priceGBP       Decimal  @db.Decimal(10, 2)
  stripePriceId  String   @unique
  maxRollover    Int      @default(0)
  priority       Boolean  @default(false)  // Priority queue access
  apiAccess      Boolean  @default(false)
  active         Boolean  @default(true)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Current Plans:**

| Plan    | Tokens/Month | Price (GBP) | Max Rollover |
| ------- | ------------ | ----------- | ------------ |
| Hobby   | 30           | 4.99        | 30           |
| Creator | 100          | 12.99       | 100          |
| Studio  | 300          | 29.99       | Unlimited    |

---

## Album & Gallery Models

### Album

User-created collections of images.

```prisma
model Album {
  id           String       @id @default(cuid())
  userId       String
  name         String
  description  String?      @db.Text
  coverImageId String?
  privacy      AlbumPrivacy @default(PRIVATE)  // PRIVATE, UNLISTED, PUBLIC
  shareToken   String?      @unique            // For unlisted sharing
  sortOrder    Int          @default(0)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  user        User         @relation(...)
  albumImages AlbumImage[]
}
```

**Privacy Levels:**

- `PRIVATE` - Only owner can view
- `UNLISTED` - Accessible via share link
- `PUBLIC` - Listed in public gallery

### AlbumImage

Junction table for album contents.

```prisma
model AlbumImage {
  id        String   @id @default(cuid())
  albumId   String
  imageId   String
  sortOrder Int      @default(0)
  addedAt   DateTime @default(now())

  album Album         @relation(...)
  image EnhancedImage @relation(...)

  @@unique([albumId, imageId])  // Prevent duplicates
}
```

---

## Voucher System Models

### Voucher

Promotional codes for free tokens or bonuses.

```prisma
model Voucher {
  id          String        @id @default(cuid())
  code        String        @unique
  type        VoucherType   // FIXED_TOKENS, PERCENTAGE_BONUS, SUBSCRIPTION_TRIAL
  value       Int           // Token amount or percentage
  maxUses     Int?          // null = unlimited
  currentUses Int           @default(0)
  expiresAt   DateTime?
  status      VoucherStatus @default(ACTIVE)
  metadata    Json?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  redemptions VoucherRedemption[]
}
```

**Voucher Types:**

- `FIXED_TOKENS` - Grants exact number of tokens
- `PERCENTAGE_BONUS` - Bonus on next purchase
- `SUBSCRIPTION_TRIAL` - Free trial period

### VoucherRedemption

Tracks voucher usage.

```prisma
model VoucherRedemption {
  id            String   @id @default(cuid())
  voucherId     String
  userId        String
  tokensGranted Int
  redeemedAt    DateTime @default(now())

  voucher Voucher @relation(...)
  user    User    @relation(...)

  @@unique([voucherId, userId])  // One redemption per user
}
```

---

## Platform Models (Spike Land Core)

### App

User-created applications on the platform.

```prisma
model App {
  id          String    @id @default(cuid())
  name        String
  description String?   @db.Text
  userId      String
  forkedFrom  String?               // Original app if forked
  status      AppStatus @default(DRAFT)  // DRAFT, ACTIVE, ARCHIVED, DELETED
  domain      String?   @unique     // Custom domain
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user               User                @relation(...)
  parentApp          App?                @relation("AppForks", ...)
  forks              App[]               @relation("AppForks")
  requirements       Requirement[]
  monetizationModels MonetizationModel[]
}
```

### Requirement

App requirements for AI agent building.

```prisma
model Requirement {
  id          String              @id @default(cuid())
  appId       String
  description String              @db.Text
  priority    RequirementPriority @default(MEDIUM)  // LOW, MEDIUM, HIGH, CRITICAL
  status      RequirementStatus   @default(PENDING) // PENDING, IN_PROGRESS, COMPLETED, REJECTED
  version     Int                 @default(1)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  app App @relation(...)
}
```

### MonetizationModel

App monetization configuration.

```prisma
model MonetizationModel {
  id                   String                @id @default(cuid())
  appId                String
  type                 MonetizationType      @default(FREE)
  price                Decimal?              @db.Decimal(10, 2)
  subscriptionInterval SubscriptionInterval?
  features             String[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  app App @relation(...)
}
```

**Monetization Types:**

- `FREE` - No charge
- `ONE_TIME` - Single purchase
- `SUBSCRIPTION` - Recurring payment
- `FREEMIUM` - Free + paid features
- `USAGE_BASED` - Pay per use

---

## Authentication Models (NextAuth)

### Account

OAuth provider connections.

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String       // "github", "google"
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(...)

  @@unique([provider, providerAccountId])
}
```

### Session

User sessions.

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(...)
}
```

### VerificationToken

Email verification tokens.

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## Indexes Summary

| Model               | Indexed Fields                | Purpose                |
| ------------------- | ----------------------------- | ---------------------- |
| EnhancedImage       | `[userId, createdAt]`         | User's images by date  |
| EnhancedImage       | `[isPublic, createdAt]`       | Public gallery         |
| ImageEnhancementJob | `[userId, status, createdAt]` | User's jobs by status  |
| ImageEnhancementJob | `[status, updatedAt]`         | Job queue processing   |
| TokenTransaction    | `[userId, createdAt]`         | Transaction history    |
| Album               | `[userId, createdAt]`         | User's albums          |
| Album               | `[shareToken]`                | Share link lookup      |
| Voucher             | `[code]`                      | Code lookup            |
| Voucher             | `[status, expiresAt]`         | Active voucher queries |

---

## Migration

The initial migration is located at:

```
prisma/migrations/0_init/migration.sql
```

To apply migrations:

```bash
npx prisma migrate deploy
```

To generate Prisma client:

```bash
npx prisma generate
```

---

## Related Documentation

- [Image Enhancement Vision](./IMAGE_ENHANCEMENT_VISION.md)
- [Implementation Roadmap](./IMAGE_ENHANCEMENT_ROADMAP.md)
- [Privacy & Compliance](./IMAGE_ENHANCEMENT_PRIVACY.md)
