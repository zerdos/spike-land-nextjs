# Database Schema Documentation

This document provides a detailed overview of the Spike Land database schema, including models, relationships, and design decisions.

## Schema Version

- **Version**: 2.0.0
- **Last Updated**: 2025-12-30
- **Prisma Version**: 7.2.0
- **PostgreSQL Version**: 14+
- **Database Provider**: Neon (PostgreSQL-compatible serverless database)

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Authentication & User Management](#authentication--user-management)
3. [Token System](#token-system)
4. [Image Enhancement](#image-enhancement)
5. [Application Platform](#application-platform)
6. [Album & Gallery Management](#album--gallery-management)
7. [Subscription & Payment](#subscription--payment)
8. [Browser Agent Service](#browser-agent-service)
9. [Campaign Analytics](#campaign-analytics)
10. [Audio Mixer](#audio-mixer)
11. [Merchandise & Print-on-Demand](#merchandise--print-on-demand)
12. [External Agent Integration](#external-agent-integration)
13. [Enumerations](#enumerations)
14. [Indexes & Performance](#indexes--performance)
15. [Security Considerations](#security-considerations)

## Schema Overview

The Spike Land database consists of 55+ tables organized into logical domains:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spike Land Database Schema                    │
│                         (Simplified View)                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION & USERS                      │
├──────────────┬────────────────┬──────────────┬─────────────────┤
│    User      │   Account      │   Session    │ VerificationToken│
└──────┬───────┴────────────────┴──────────────┴──────────────────┘
       │
       ├─────────────────────────────────────────────────────────┐
       │                                                         │
┌──────▼──────────────────────────────────────────────────┐     │
│                   TOKEN SYSTEM                           │     │
├──────────────┬────────────────┬──────────────────────────┤     │
│UserTokenBalance│TokenTransaction│TokensPackage          │     │
└──────────────┴────────────────┴──────────────────────────┘     │
                                                                  │
┌──────────────────────────────────────────────────────────┐     │
│                IMAGE ENHANCEMENT                         │     │
├──────────────┬────────────────┬──────────────────────────┤     │
│EnhancedImage │ImageEnhancement│EnhancementPipeline      │     │
│              │Job             │                          │     │
└──────────────┴────────────────┴──────────────────────────┘     │
                                                                  │
┌──────────────────────────────────────────────────────────┐     │
│                  APP PLATFORM                            │     │
├──────────────┬────────────────┬──────────────────────────┤     │
│    App       │  Requirement   │ MonetizationModel       │     │
└──────────────┴────────────────┴──────────────────────────┘     │
                                                                  │
┌──────────────────────────────────────────────────────────┐     │
│            SUBSCRIPTIONS & PAYMENTS                      │     │
├──────────────┬────────────────┬──────────────────────────┤     │
│Subscription  │StripePayment   │SubscriptionPlan         │     │
└──────────────┴────────────────┴──────────────────────────┘     │
                                                                  │
┌──────────────────────────────────────────────────────────┐     │
│              ALBUMS & GALLERIES                          │◄────┘
├──────────────┬────────────────┬──────────────────────────┤
│   Album      │  AlbumImage    │FeaturedGalleryItem      │
└──────────────┴────────────────┴──────────────────────────┘

Additional Domains:
- Campaign Analytics (6 tables)
- Browser Agent Service (6 tables)
- Merchandise System (11 tables)
- Audio Mixer (2 tables)
- External Agent Integration (2 tables)
- System & Audit (8 tables)
```

---

## Authentication & User Management

### User

Core user account model integrated with NextAuth.js for authentication.

**Table Name**: `users`

| Column           | Type          | Constraints   | Description                        |
| ---------------- | ------------- | ------------- | ---------------------------------- |
| id               | String (CUID) | PRIMARY KEY   | Unique user identifier             |
| name             | String?       | NULL          | User's display name                |
| email            | String?       | UNIQUE, NULL  | User's email address               |
| emailVerified    | DateTime?     | NULL          | Email verification timestamp       |
| image            | String?       | NULL          | User's avatar/profile image URL    |
| createdAt        | DateTime      | DEFAULT now() | Account creation timestamp         |
| updatedAt        | DateTime      | AUTO UPDATE   | Last update timestamp              |
| stripeCustomerId | String?       | UNIQUE, NULL  | Stripe customer ID                 |
| role             | UserRole      | DEFAULT USER  | User role (USER/ADMIN/SUPER_ADMIN) |
| referralCode     | String?       | UNIQUE, NULL  | Unique referral code               |
| referredById     | String?       | FK → User.id  | User who referred this user        |
| referralCount    | Int           | DEFAULT 0     | Count of successful referrals      |
| passwordHash     | String?       | NULL          | Hashed password for email auth     |

**Relationships**:

- `accounts`: Account[] - OAuth provider accounts
- `albums`: Album[] - User's photo albums
- `apps`: App[] - User-created applications
- `auditLogs`: AuditLog[] - Audit trail of admin actions
- `enhancedImages`: EnhancedImage[] - User's uploaded images
- `enhancementJobs`: ImageEnhancementJob[] - Image enhancement jobs
- `refereeReferrals`: Referral[] - Referrals where user is referee
- `referrerReferrals`: Referral[] - Referrals where user is referrer
- `sessions`: Session[] - Active user sessions
- `stripePayments`: StripePayment[] - Payment history
- `subscription`: Subscription? - Active subscription (1:1)
- `tokenTransactions`: TokenTransaction[] - Token transaction history
- `tokenBalance`: UserTokenBalance? - Current token balance (1:1)
- `referredBy`: User? - Self-reference to referrer
- `referrals`: User[] - Users referred by this user
- `voucherRedemptions`: VoucherRedemption[] - Redeemed vouchers
- `feedback`: Feedback[] - Submitted feedback
- `createdGalleryItems`: FeaturedGalleryItem[] - Gallery items created by user
- `emailLogs`: EmailLog[] - Email communication history
- `trackedUrls`: TrackedUrl[] - Created tracked URLs
- `apiKeys`: ApiKey[] - API keys for MCP generation
- `mcpGenerationJobs`: McpGenerationJob[] - MCP generation jobs
- `boxes`: Box[] - Browser agent boxes
- `pipelines`: EnhancementPipeline[] - Custom enhancement pipelines
- `audioMixerProjects`: AudioMixerProject[] - Audio mixer projects
- `marketingAccounts`: MarketingAccount[] - Connected marketing accounts
- `visitorSessions`: VisitorSession[] - Analytics visitor sessions
- `campaignAttributions`: CampaignAttribution[] - Campaign conversion attributions
- `merchCart`: MerchCart? - Shopping cart (1:1)
- `merchOrders`: MerchOrder[] - Merchandise orders

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `email`
- UNIQUE index on `stripeCustomerId`
- UNIQUE index on `referralCode`

**Design Notes**:

- Email is nullable to support OAuth-only accounts without email permission
- Uses CUID (Collision-resistant Unique Identifier) for globally unique, ordered IDs
- `emailVerified` tracks when user confirmed their email address
- Password hash stored for credential-based authentication alongside OAuth
- Role-based access control (RBAC) via `role` enum
- Self-referencing relationship for referral tracking

---

### Account

OAuth provider account information. Part of NextAuth.js adapter schema.

**Table Name**: `accounts`

| Column            | Type    | Constraints  | Description                  |
| ----------------- | ------- | ------------ | ---------------------------- |
| id                | String  | PRIMARY KEY  | Unique account identifier    |
| userId            | String  | FK → User.id | Associated user ID           |
| type              | String  | NOT NULL     | Account type (oauth, etc.)   |
| provider          | String  | NOT NULL     | OAuth provider name          |
| providerAccountId | String  | NOT NULL     | Provider's user ID           |
| refresh_token     | String? | NULL         | OAuth refresh token          |
| access_token      | String? | NULL         | OAuth access token           |
| expires_at        | Int?    | NULL         | Token expiration (Unix time) |
| token_type        | String? | NULL         | Token type (Bearer, etc.)    |
| scope             | String? | NULL         | OAuth scopes granted         |
| id_token          | String? | NULL         | OpenID Connect ID token      |
| session_state     | String? | NULL         | OAuth session state          |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[provider, providerAccountId]`

**Design Notes**:

- Supports multiple OAuth providers per user (Google, GitHub, Facebook, etc.)
- Tokens stored as TEXT for long strings
- CASCADE delete ensures cleanup when user is deleted
- Composite unique constraint prevents duplicate provider accounts

---

### MarketingAccount

Connected marketing platform accounts for campaign management.

**Table Name**: `marketing_accounts`

| Column       | Type              | Constraints   | Description                               |
| ------------ | ----------------- | ------------- | ----------------------------------------- |
| id           | String            | PRIMARY KEY   | Unique account identifier                 |
| userId       | String            | FK → User.id  | Associated user ID                        |
| platform     | MarketingPlatform | NOT NULL      | Marketing platform (FACEBOOK/GOOGLE_ADS)  |
| accountId    | String            | NOT NULL      | Platform-specific account ID              |
| accountName  | String?           | NULL          | Human-readable account name               |
| accessToken  | String            | NOT NULL      | Encrypted OAuth access token              |
| refreshToken | String?           | NULL          | Encrypted refresh token (Google Ads only) |
| expiresAt    | DateTime?         | NULL          | Token expiration timestamp                |
| isActive     | Boolean           | DEFAULT true  | Account active status                     |
| createdAt    | DateTime          | DEFAULT now() | Account connection timestamp              |
| updatedAt    | DateTime          | AUTO UPDATE   | Last update timestamp                     |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[userId, platform, accountId]`
- Index on `userId`
- Index on `platform`

**Design Notes**:

- Stores encrypted tokens for Facebook Ads and Google Ads platforms
- One user can connect multiple accounts per platform
- Token encryption handled at application layer
- Used for campaign ROI tracking and analytics

---

### Session

Active user session tracking. Part of NextAuth.js adapter schema.

**Table Name**: `sessions`

| Column       | Type     | Constraints     | Description               |
| ------------ | -------- | --------------- | ------------------------- |
| id           | String   | PRIMARY KEY     | Unique session identifier |
| sessionToken | String   | UNIQUE NOT NULL | Session token (secret)    |
| userId       | String   | FK → User.id    | Associated user ID        |
| expires      | DateTime | NOT NULL        | Session expiration time   |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `sessionToken`

**Design Notes**:

- Session tokens should be treated as secrets (not logged)
- Expired sessions should be cleaned up periodically via cron job
- CASCADE delete ensures sessions are removed when user is deleted
- Used for stateless session management

---

### VerificationToken

Email verification and passwordless sign-in tokens. Part of NextAuth.js adapter schema.

**Table Name**: `verification_tokens`

| Column     | Type     | Constraints | Description                 |
| ---------- | -------- | ----------- | --------------------------- |
| identifier | String   | NOT NULL    | Email or identifier         |
| token      | String   | UNIQUE      | Verification token (secret) |
| expires    | DateTime | NOT NULL    | Token expiration timestamp  |

**Indexes**:

- UNIQUE composite index on `[identifier, token]`
- UNIQUE index on `token`

**Design Notes**:

- No primary key or relations (standalone token table)
- Tokens should be cleaned up after use or expiration
- Used for email verification and magic link authentication
- Single-use tokens (deleted after verification)

---

## Token System

### UserTokenBalance

Current token balance and regeneration tracking for each user.

**Table Name**: `user_token_balances`

| Column           | Type             | Constraints   | Description                      |
| ---------------- | ---------------- | ------------- | -------------------------------- |
| id               | String           | PRIMARY KEY   | Unique balance record identifier |
| userId           | String           | UNIQUE FK     | Associated user ID (1:1)         |
| balance          | Int              | DEFAULT 0     | Current token balance            |
| lastRegeneration | DateTime         | DEFAULT now() | Last token regeneration time     |
| tier             | SubscriptionTier | DEFAULT FREE  | User's subscription tier         |
| createdAt        | DateTime         | DEFAULT now() | Record creation timestamp        |
| updatedAt        | DateTime         | AUTO UPDATE   | Last update timestamp            |

**Relationships**:

- `user`: User (1:1, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `userId`
- Index on `tier`

**Design Notes**:

- One-to-one relationship with User (each user has one balance)
- Balance regenerates based on subscription tier
- Tracks last regeneration for monthly rollover calculation
- Used to enforce token consumption limits

---

### TokenTransaction

Immutable transaction log for all token movements.

**Table Name**: `token_transactions`

| Column       | Type                 | Constraints   | Description                         |
| ------------ | -------------------- | ------------- | ----------------------------------- |
| id           | String               | PRIMARY KEY   | Unique transaction identifier       |
| userId       | String               | FK → User.id  | Associated user ID                  |
| amount       | Int                  | NOT NULL      | Token amount (positive or negative) |
| type         | TokenTransactionType | NOT NULL      | Transaction type enum               |
| source       | String?              | NULL          | Transaction source description      |
| sourceId     | String?              | NULL          | Source entity ID (job, payment)     |
| balanceAfter | Int                  | NOT NULL      | Balance after transaction           |
| metadata     | Json?                | NULL          | Additional transaction data         |
| createdAt    | DateTime             | DEFAULT now() | Transaction timestamp               |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, createdAt]` (for user transaction history)
- Index on `sourceId` (for reverse lookups)

**Design Notes**:

- Immutable audit trail (no updates or deletes)
- Positive amounts = token credits, negative = debits
- `balanceAfter` enables point-in-time balance reconstruction
- `sourceId` links to related entities (e.g., enhancement job ID)
- Supports double-entry accounting verification

---

### TokensPackage

Purchasable token packages for one-time token top-ups.

**Table Name**: `tokens_packages`

| Column        | Type          | Constraints     | Description                   |
| ------------- | ------------- | --------------- | ----------------------------- |
| id            | String        | PRIMARY KEY     | Unique package identifier     |
| name          | String        | NOT NULL        | Package display name          |
| tokens        | Int           | NOT NULL        | Number of tokens in package   |
| priceUSD      | Decimal(10,2) | NOT NULL        | Price in USD                  |
| stripePriceId | String        | UNIQUE NOT NULL | Stripe Price ID               |
| active        | Boolean       | DEFAULT true    | Package availability status   |
| sortOrder     | Int           | DEFAULT 0       | Display order on pricing page |
| createdAt     | DateTime      | DEFAULT now()   | Package creation timestamp    |
| updatedAt     | DateTime      | AUTO UPDATE     | Last update timestamp         |

**Relationships**:

- `stripePayments`: StripePayment[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `stripePriceId`
- Composite index on `[active, sortOrder]`

**Design Notes**:

- Used for one-time token purchases (not subscriptions)
- Prices stored as Decimal(10,2) for precise currency handling
- Inactive packages hidden from UI but preserved for historical data
- Sort order allows flexible pricing page layout

---

### StripePayment

Payment transaction records for token package purchases.

**Table Name**: `stripe_payments`

| Column                | Type                | Constraints     | Description                  |
| --------------------- | ------------------- | --------------- | ---------------------------- |
| id                    | String              | PRIMARY KEY     | Unique payment identifier    |
| userId                | String              | FK → User.id    | Associated user ID           |
| packageId             | String              | FK → Package.id | Purchased package ID         |
| tokensGranted         | Int                 | NOT NULL        | Tokens granted from purchase |
| amountUSD             | Decimal(10,2)       | NOT NULL        | Payment amount in USD        |
| stripePaymentIntentId | String              | UNIQUE NOT NULL | Stripe Payment Intent ID     |
| status                | StripePaymentStatus | NOT NULL        | Payment status enum          |
| metadata              | Json?               | NULL            | Additional payment metadata  |
| createdAt             | DateTime            | DEFAULT now()   | Payment creation timestamp   |
| updatedAt             | DateTime            | AUTO UPDATE     | Last status update timestamp |

**Relationships**:

- `package`: TokensPackage (FK)
- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `stripePaymentIntentId`
- Composite index on `[userId, createdAt]`

**Design Notes**:

- Tracks both successful and failed payments
- Links to Stripe Payment Intent for webhook processing
- Tokens granted only when status = SUCCEEDED
- Refunds create compensating token transactions
- Metadata stores Stripe webhook data

---

## Image Enhancement

### EnhancedImage

Original uploaded images and their metadata.

**Table Name**: `enhanced_images`

| Column            | Type     | Constraints   | Description                     |
| ----------------- | -------- | ------------- | ------------------------------- |
| id                | String   | PRIMARY KEY   | Unique image identifier         |
| userId            | String   | FK → User.id  | Image owner ID                  |
| name              | String   | NOT NULL      | Image display name              |
| description       | String?  | NULL          | Optional image description      |
| originalUrl       | String   | NOT NULL      | R2 CDN public URL               |
| originalR2Key     | String   | NOT NULL      | R2 storage key                  |
| originalWidth     | Int      | NOT NULL      | Original width in pixels        |
| originalHeight    | Int      | NOT NULL      | Original height in pixels       |
| originalSizeBytes | Int      | NOT NULL      | Original file size              |
| originalFormat    | String   | NOT NULL      | Image format (JPEG, PNG, WebP)  |
| isPublic          | Boolean  | DEFAULT false | Public visibility flag          |
| viewCount         | Int      | DEFAULT 0     | View counter for analytics      |
| createdAt         | DateTime | DEFAULT now() | Upload timestamp                |
| updatedAt         | DateTime | AUTO UPDATE   | Last update timestamp           |
| shareToken        | String?  | UNIQUE NULL   | Unique token for public sharing |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `albumImages`: AlbumImage[]
- `enhancementJobs`: ImageEnhancementJob[]
- `blendTargetJobs`: ImageEnhancementJob[] (as blend source)
- `featuredGalleryItems`: FeaturedGalleryItem[]
- `merchCartItems`: MerchCartItem[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, createdAt]` (user gallery)
- Composite index on `[isPublic, createdAt]` (public gallery)
- Index on `shareToken`

**Design Notes**:

- Stores original image metadata (enhancements stored in jobs)
- R2 (Cloudflare R2) used for object storage
- Share tokens enable password-free public sharing
- View count incremented on public image access
- Images soft-deleted when user is deleted (CASCADE)

---

### ImageEnhancementJob

AI image enhancement job tracking and results.

**Table Name**: `image_enhancement_jobs`

| Column                | Type            | Constraints      | Description                |
| --------------------- | --------------- | ---------------- | -------------------------- |
| id                    | String          | PRIMARY KEY      | Unique job identifier      |
| imageId               | String          | FK → Image.id    | Source image ID            |
| userId                | String          | FK → User.id     | Job owner ID               |
| tier                  | EnhancementTier | NOT NULL         | Enhancement quality tier   |
| tokensCost            | Int             | NOT NULL         | Tokens consumed            |
| status                | JobStatus       | NOT NULL         | Job status enum            |
| currentStage          | PipelineStage?  | NULL             | Current pipeline stage     |
| enhancedUrl           | String?         | NULL             | Enhanced image R2 URL      |
| enhancedR2Key         | String?         | NULL             | Enhanced image R2 key      |
| enhancedWidth         | Int?            | NULL             | Enhanced width in pixels   |
| enhancedHeight        | Int?            | NULL             | Enhanced height in pixels  |
| enhancedSizeBytes     | Int?            | NULL             | Enhanced file size         |
| errorMessage          | String?         | NULL             | Error details if failed    |
| retryCount            | Int             | DEFAULT 0        | Number of retry attempts   |
| maxRetries            | Int             | DEFAULT 3        | Maximum retry attempts     |
| geminiPrompt          | String?         | NULL             | Generated Gemini prompt    |
| geminiModel           | String?         | NULL             | Gemini model used          |
| geminiTemp            | Float?          | NULL             | Generation temperature     |
| processingStartedAt   | DateTime?       | NULL             | Processing start time      |
| processingCompletedAt | DateTime?       | NULL             | Processing completion time |
| createdAt             | DateTime        | DEFAULT now()    | Job creation timestamp     |
| updatedAt             | DateTime        | AUTO UPDATE      | Last update timestamp      |
| workflowRunId         | String?         | NULL             | External workflow run ID   |
| analysisResult        | Json?           | NULL             | AI image analysis results  |
| analysisSource        | String?         | NULL             | Analysis model name        |
| wasCropped            | Boolean         | DEFAULT false    | Auto-crop applied flag     |
| cropDimensions        | Json?           | NULL             | Crop coordinates {x,y,w,h} |
| pipelineId            | String?         | FK → Pipeline.id | Enhancement pipeline used  |
| sourceImageId         | String?         | FK → Image.id    | Blend source image ID      |
| isBlend               | Boolean         | DEFAULT false    | Blend enhancement flag     |
| isAnonymous           | Boolean         | DEFAULT false    | Anonymous user job flag    |

**Relationships**:

- `image`: EnhancedImage (FK, CASCADE on delete)
- `user`: User (FK, CASCADE on delete)
- `pipeline`: EnhancementPipeline? (FK, optional)
- `sourceImage`: EnhancedImage? (FK for blend mode, SET NULL on delete)
- `featuredGalleryItems`: FeaturedGalleryItem[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, status, createdAt]`
- Index on `imageId`
- Composite index on `[status, updatedAt]` (job queue)
- Index on `workflowRunId`
- Index on `pipelineId`
- Composite index on `[status, currentStage]` (SSE streaming)

**Design Notes**:

- Supports multi-stage pipeline processing (analyze, crop, prompt, generate)
- Retry logic with exponential backoff
- Stores both original and enhanced image metadata
- Token cost deducted when job is created
- Blend mode allows image-to-image enhancement
- Pipeline reference creates audit trail
- Anonymous jobs support non-authenticated usage

---

### EnhancementPipeline

Reusable AI enhancement pipeline configurations.

**Table Name**: `enhancement_pipelines`

| Column           | Type               | Constraints     | Description                       |
| ---------------- | ------------------ | --------------- | --------------------------------- |
| id               | String             | PRIMARY KEY     | Unique pipeline identifier        |
| name             | String             | NOT NULL        | Pipeline display name             |
| description      | String?            | NULL            | Pipeline description              |
| userId           | String?            | FK → User.id    | Owner ID (NULL = system pipeline) |
| visibility       | PipelineVisibility | DEFAULT PRIVATE | Visibility setting                |
| shareToken       | String?            | UNIQUE NULL     | Link-based sharing token          |
| tier             | EnhancementTier    | DEFAULT TIER_1K | Default enhancement tier          |
| analysisConfig   | Json?              | NULL            | Analysis stage settings           |
| autoCropConfig   | Json?              | NULL            | Auto-crop behavior config         |
| promptConfig     | Json?              | NULL            | Dynamic prompt generation config  |
| generationConfig | Json?              | NULL            | Gemini generation settings        |
| usageCount       | Int                | DEFAULT 0       | Times pipeline has been used      |
| createdAt        | DateTime           | DEFAULT now()   | Pipeline creation timestamp       |
| updatedAt        | DateTime           | AUTO UPDATE     | Last update timestamp             |

**Relationships**:

- `user`: User? (FK, CASCADE on delete)
- `albums`: Album[] (albums using this pipeline)
- `jobs`: ImageEnhancementJob[] (jobs using this pipeline)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `shareToken`
- Index on `userId`
- Index on `visibility`

**Design Notes**:

- System pipelines have NULL userId (created by admins)
- JSON configs allow flexible pipeline customization
- Visibility controls: PRIVATE (owner only), PUBLIC (all users), LINK (share token)
- Share tokens enable pipeline template sharing
- Usage count tracks pipeline popularity
- Pipelines can be forked/cloned by users

---

## Application Platform

### App

User-created applications with requirements and monetization.

**Table Name**: `apps`

| Column      | Type      | Constraints   | Description             |
| ----------- | --------- | ------------- | ----------------------- |
| id          | String    | PRIMARY KEY   | Unique app identifier   |
| name        | String    | NOT NULL      | App display name        |
| description | String?   | NULL          | App description         |
| userId      | String    | FK → User.id  | App owner ID            |
| forkedFrom  | String?   | FK → App.id   | Parent app ID if forked |
| status      | AppStatus | DEFAULT DRAFT | App lifecycle status    |
| domain      | String?   | UNIQUE NULL   | Custom domain name      |
| createdAt   | DateTime  | DEFAULT now() | App creation timestamp  |
| updatedAt   | DateTime  | AUTO UPDATE   | Last update timestamp   |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `parentApp`: App? (FK, SET NULL on delete)
- `forks`: App[] (apps forked from this one)
- `monetizationModels`: MonetizationModel[]
- `requirements`: Requirement[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `domain`
- Index on `userId`
- Index on `forkedFrom`
- Index on `status`

**Design Notes**:

- Self-referencing relationship enables app forking/inheritance
- Domain uniqueness enforces one app per custom domain
- Cascade delete removes all app data when user is deleted
- Set null on parent delete preserves fork history
- Draft apps hidden from public directory

---

### Requirement

Feature requirements and specifications for applications.

**Table Name**: `requirements`

| Column      | Type                | Constraints     | Description                    |
| ----------- | ------------------- | --------------- | ------------------------------ |
| id          | String              | PRIMARY KEY     | Unique requirement identifier  |
| appId       | String              | FK → App.id     | Associated app ID              |
| description | String              | NOT NULL        | Requirement description        |
| priority    | RequirementPriority | DEFAULT MEDIUM  | Priority level                 |
| status      | RequirementStatus   | DEFAULT PENDING | Implementation status          |
| version     | Int                 | DEFAULT 1       | Requirement version number     |
| createdAt   | DateTime            | DEFAULT now()   | Requirement creation timestamp |
| updatedAt   | DateTime            | AUTO UPDATE     | Last update timestamp          |

**Relationships**:

- `app`: App (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `appId`
- Index on `status`
- Index on `priority`

**Design Notes**:

- Version tracking allows requirement evolution
- Multiple indexes support filtering by status and priority
- Cascade delete removes requirements with app
- Text type allows long, detailed descriptions
- Priority guides development roadmap

---

### MonetizationModel

Pricing and monetization strategies for applications.

**Table Name**: `monetization_models`

| Column               | Type                  | Constraints   | Description                        |
| -------------------- | --------------------- | ------------- | ---------------------------------- |
| id                   | String                | PRIMARY KEY   | Unique model identifier            |
| appId                | String                | FK → App.id   | Associated app ID                  |
| type                 | MonetizationType      | DEFAULT FREE  | Monetization type                  |
| price                | Decimal(10,2)?        | NULL          | Price amount                       |
| subscriptionInterval | SubscriptionInterval? | NULL          | Billing interval (if subscription) |
| features             | String[]              | NOT NULL      | Included features list             |
| createdAt            | DateTime              | DEFAULT now() | Model creation timestamp           |
| updatedAt            | DateTime              | AUTO UPDATE   | Last update timestamp              |

**Relationships**:

- `app`: App (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `appId`
- Index on `type`

**Design Notes**:

- Apps can have multiple monetization models (pricing tiers)
- Price stored as Decimal(10,2) for precise currency handling
- Features array stores included feature descriptions
- subscriptionInterval only required for SUBSCRIPTION type
- Cascade delete removes models with app
- Supports freemium, subscription, and usage-based pricing

---

## Album & Gallery Management

### Album

Photo album organization for user images.

**Table Name**: `albums`

| Column       | Type            | Constraints      | Description                        |
| ------------ | --------------- | ---------------- | ---------------------------------- |
| id           | String          | PRIMARY KEY      | Unique album identifier            |
| userId       | String          | FK → User.id     | Album owner ID                     |
| name         | String          | NOT NULL         | Album display name                 |
| description  | String?         | NULL             | Album description                  |
| coverImageId | String?         | NULL             | Cover image ID (not FK)            |
| privacy      | AlbumPrivacy    | DEFAULT PRIVATE  | Album visibility setting           |
| defaultTier  | EnhancementTier | DEFAULT TIER_1K  | Default enhancement tier for album |
| shareToken   | String?         | UNIQUE NULL      | Link-based sharing token           |
| sortOrder    | Int             | DEFAULT 0        | User's album display order         |
| createdAt    | DateTime        | DEFAULT now()    | Album creation timestamp           |
| updatedAt    | DateTime        | AUTO UPDATE      | Last update timestamp              |
| pipelineId   | String?         | FK → Pipeline.id | Default enhancement pipeline       |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `pipeline`: EnhancementPipeline? (FK, optional)
- `albumImages`: AlbumImage[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[userId, name, privacy]` (prevents duplicate default albums)
- Composite index on `[userId, createdAt]`
- Index on `privacy`
- Index on `shareToken`
- Index on `pipelineId`

**Design Notes**:

- Privacy levels: PRIVATE (owner only), UNLISTED (link only), PUBLIC (gallery)
- Default tier applied to all images uploaded to album
- Share token enables password-free album sharing
- Pipeline setting allows bulk processing with custom settings
- Each user has system-created default albums per privacy level

---

### AlbumImage

Many-to-many relationship between albums and images.

**Table Name**: `album_images`

| Column    | Type     | Constraints   | Description                    |
| --------- | -------- | ------------- | ------------------------------ |
| id        | String   | PRIMARY KEY   | Unique relationship identifier |
| albumId   | String   | FK → Album.id | Album ID                       |
| imageId   | String   | FK → Image.id | Image ID                       |
| sortOrder | Int      | DEFAULT 0     | Image order within album       |
| addedAt   | DateTime | DEFAULT now() | Image added to album timestamp |

**Relationships**:

- `album`: Album (FK, CASCADE on delete)
- `image`: EnhancedImage (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[albumId, imageId]` (prevents duplicates)
- Composite index on `[albumId, sortOrder]` (album gallery display)
- Index on `imageId` (reverse lookup)
- Composite index on `[albumId, addedAt]` (chronological view)

**Design Notes**:

- Join table enabling images in multiple albums
- Sort order allows manual image reordering within album
- addedAt tracks when image was added (different from image upload time)
- Cascade delete from both sides ensures referential integrity

---

### FeaturedGalleryItem

Curated showcase images for public gallery.

**Table Name**: `featured_gallery_items`

| Column        | Type            | Constraints      | Description                    |
| ------------- | --------------- | ---------------- | ------------------------------ |
| id            | String          | PRIMARY KEY      | Unique gallery item identifier |
| title         | String          | NOT NULL         | Display title                  |
| description   | String?         | NULL             | Item description               |
| category      | GalleryCategory | DEFAULT PORTRAIT | Gallery category               |
| originalUrl   | String          | NOT NULL         | Original image URL             |
| enhancedUrl   | String          | NOT NULL         | Enhanced image URL             |
| width         | Int             | DEFAULT 16       | Aspect ratio width             |
| height        | Int             | DEFAULT 9        | Aspect ratio height            |
| sourceImageId | String?         | FK → Image.id    | Source image reference         |
| sourceJobId   | String?         | FK → Job.id      | Enhancement job reference      |
| sortOrder     | Int             | DEFAULT 0        | Display order in gallery       |
| isActive      | Boolean         | DEFAULT true     | Visibility flag                |
| createdAt     | DateTime        | DEFAULT now()    | Item creation timestamp        |
| updatedAt     | DateTime        | AUTO UPDATE      | Last update timestamp          |
| createdBy     | String          | FK → User.id     | Creator user ID (admin)        |

**Relationships**:

- `sourceImage`: EnhancedImage? (FK, SET NULL on delete)
- `sourceJob`: ImageEnhancementJob? (FK, SET NULL on delete)
- `creator`: User (FK, required)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[isActive, sortOrder]`
- Composite index on `[isActive, category, sortOrder]`

**Design Notes**:

- Admin-curated showcase for marketing and inspiration
- Categories: PORTRAIT, LANDSCAPE, PRODUCT, ARCHITECTURE
- Links to source for attribution and reproducibility
- Width/height for aspect ratio (not actual dimensions)
- Inactive items hidden but preserved for analytics

---

## Subscription & Payment

### Subscription

User subscription management with Stripe integration.

**Table Name**: `subscriptions`

| Column               | Type               | Constraints     | Description                         |
| -------------------- | ------------------ | --------------- | ----------------------------------- |
| id                   | String             | PRIMARY KEY     | Unique subscription identifier      |
| userId               | String             | UNIQUE FK       | Associated user ID (1:1)            |
| stripeSubscriptionId | String             | UNIQUE NOT NULL | Stripe Subscription ID              |
| stripePriceId        | String             | NOT NULL        | Stripe Price ID                     |
| status               | SubscriptionStatus | NOT NULL        | Subscription status                 |
| tier                 | SubscriptionTier   | DEFAULT BASIC   | Subscription tier level             |
| currentPeriodStart   | DateTime           | NOT NULL        | Current billing period start        |
| currentPeriodEnd     | DateTime           | NOT NULL        | Current billing period end          |
| cancelAtPeriodEnd    | Boolean            | DEFAULT false   | Scheduled cancellation flag         |
| downgradeTo          | SubscriptionTier?  | NULL            | Scheduled downgrade tier            |
| tokensPerMonth       | Int                | NOT NULL        | Monthly token allocation            |
| rolloverTokens       | Int                | DEFAULT 0       | Rollover tokens from previous month |
| maxRollover          | Int                | DEFAULT 0       | Maximum rollover allowed            |
| createdAt            | DateTime           | DEFAULT now()   | Subscription creation timestamp     |
| updatedAt            | DateTime           | AUTO UPDATE     | Last update timestamp               |

**Relationships**:

- `user`: User (1:1, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `userId`
- UNIQUE index on `stripeSubscriptionId`
- Index on `status`
- Index on `tier`

**Design Notes**:

- One-to-one relationship with User
- Stripe webhook updates keep status synchronized
- Rollover tokens prevent monthly token loss
- Scheduled downgrades execute at period end
- cancelAtPeriodEnd allows graceful subscription ending
- Tier determines monthly token allocation and features

---

### SubscriptionPlan

Available subscription plan configurations.

**Table Name**: `subscription_plans`

| Column         | Type          | Constraints     | Description                   |
| -------------- | ------------- | --------------- | ----------------------------- |
| id             | String        | PRIMARY KEY     | Unique plan identifier        |
| name           | String        | NOT NULL        | Plan display name             |
| tokensPerMonth | Int           | NOT NULL        | Monthly token allocation      |
| priceGBP       | Decimal(10,2) | NOT NULL        | Monthly price in GBP          |
| stripePriceId  | String        | UNIQUE NOT NULL | Stripe Price ID               |
| maxRollover    | Int           | DEFAULT 0       | Maximum rollover tokens       |
| priority       | Boolean       | DEFAULT false   | Priority processing flag      |
| apiAccess      | Boolean       | DEFAULT false   | API access enabled flag       |
| active         | Boolean       | DEFAULT true    | Plan availability status      |
| sortOrder      | Int           | DEFAULT 0       | Display order on pricing page |
| createdAt      | DateTime      | DEFAULT now()   | Plan creation timestamp       |
| updatedAt      | DateTime      | AUTO UPDATE     | Last update timestamp         |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `stripePriceId`
- Composite index on `[active, sortOrder]`

**Design Notes**:

- Template for creating user subscriptions
- Price in GBP (UK-based business)
- Priority flag enables fast-track job processing
- API access unlocks MCP generation features
- Inactive plans hidden but preserved for legacy subscribers
- Sort order controls pricing page presentation

---

## Browser Agent Service

### BoxTier

Resource tiers for browser agent virtual machines.

**Table Name**: `box_tiers`

| Column        | Type     | Constraints   | Description                  |
| ------------- | -------- | ------------- | ---------------------------- |
| id            | String   | PRIMARY KEY   | Unique tier identifier       |
| name          | String   | NOT NULL      | Tier name (e.g., "Standard") |
| description   | String?  | NULL          | Tier description             |
| cpu           | Int      | NOT NULL      | vCPU count                   |
| ram           | Int      | NOT NULL      | RAM in MB                    |
| storage       | Int      | NOT NULL      | Storage in GB                |
| pricePerHour  | Int      | NOT NULL      | Token cost per hour          |
| pricePerMonth | Int      | NOT NULL      | Token cost per month         |
| isActive      | Boolean  | DEFAULT true  | Tier availability            |
| sortOrder     | Int      | DEFAULT 0     | Display order                |
| createdAt     | DateTime | DEFAULT now() | Tier creation timestamp      |
| updatedAt     | DateTime | AUTO UPDATE   | Last update timestamp        |

**Relationships**:

- `boxes`: Box[]

**Indexes**:

- PRIMARY KEY on `id`

**Design Notes**:

- Resource tiers for browser automation VMs
- Token-based pricing (hourly or monthly)
- Inactive tiers hidden but preserved for existing boxes
- Storage for persistent browser state

---

### Box

Browser agent virtual machine instances.

**Table Name**: `boxes`

| Column          | Type      | Constraints     | Description                  |
| --------------- | --------- | --------------- | ---------------------------- |
| id              | String    | PRIMARY KEY     | Unique box identifier        |
| name            | String    | NOT NULL        | Box display name             |
| description     | String?   | NULL            | Box description              |
| userId          | String    | FK → User.id    | Box owner ID                 |
| tierId          | String?   | FK → BoxTier.id | Resource tier ID             |
| status          | BoxStatus | DEFAULT STOPPED | Box lifecycle status         |
| connectionUrl   | String?   | NULL            | VNC/NoVNC access URL         |
| storageVolumeId | String?   | NULL            | Persistent storage volume ID |
| createdAt       | DateTime  | DEFAULT now()   | Box creation timestamp       |
| updatedAt       | DateTime  | AUTO UPDATE     | Last update timestamp        |
| deletedAt       | DateTime? | NULL            | Soft deletion timestamp      |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `tier`: BoxTier? (FK, optional)
- `actions`: BoxAction[]
- `tasks`: AgentTask[]
- `messages`: BoxMessage[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, createdAt]`
- Index on `status`

**Design Notes**:

- Browser automation virtual machines
- Soft delete via deletedAt timestamp
- Connection URL for remote desktop access
- Storage volume for persistent browser state
- Status lifecycle: CREATING → RUNNING → STOPPED → TERMINATED

---

### BoxAction

Action history for box lifecycle management.

**Table Name**: `box_actions`

| Column    | Type          | Constraints     | Description               |
| --------- | ------------- | --------------- | ------------------------- |
| id        | String        | PRIMARY KEY     | Unique action identifier  |
| boxId     | String        | FK → Box.id     | Associated box ID         |
| action    | BoxActionType | NOT NULL        | Action type               |
| status    | JobStatus     | DEFAULT PENDING | Action execution status   |
| metadata  | Json?         | NULL            | Action parameters         |
| error     | String?       | NULL            | Error message if failed   |
| createdAt | DateTime      | DEFAULT now()   | Action creation timestamp |
| updatedAt | DateTime      | AUTO UPDATE     | Last update timestamp     |

**Relationships**:

- `box`: Box (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[boxId, createdAt]`

**Design Notes**:

- Audit trail for box lifecycle actions
- Actions: CREATE, START, STOP, RESTART, DELETE, CLONE
- Async execution tracked via status
- Error messages for troubleshooting

---

### AgentTask

Browser automation task queue.

**Table Name**: `agent_tasks`

| Column    | Type      | Constraints     | Description                       |
| --------- | --------- | --------------- | --------------------------------- |
| id        | String    | PRIMARY KEY     | Unique task identifier            |
| boxId     | String    | FK → Box.id     | Associated box ID                 |
| type      | String    | NOT NULL        | Task type (NAVIGATE, CLICK, TYPE) |
| payload   | Json?     | NULL            | Task parameters                   |
| status    | JobStatus | DEFAULT PENDING | Task execution status             |
| result    | Json?     | NULL            | Task execution result             |
| error     | String?   | NULL            | Error message if failed           |
| createdAt | DateTime  | DEFAULT now()   | Task creation timestamp           |
| updatedAt | DateTime  | AUTO UPDATE     | Last update timestamp             |

**Relationships**:

- `box`: Box (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[boxId, status]` (task queue)

**Design Notes**:

- Task queue for browser automation
- Payload stores action-specific parameters (e.g., URL, selector)
- Result stores extracted data or screenshots
- Status enables async task processing

---

### BoxMessage

Chat conversation between user and browser agent.

**Table Name**: `box_messages`

| Column    | Type           | Constraints   | Description               |
| --------- | -------------- | ------------- | ------------------------- |
| id        | String         | PRIMARY KEY   | Unique message identifier |
| boxId     | String         | FK → Box.id   | Associated box ID         |
| role      | BoxMessageRole | NOT NULL      | Message sender role       |
| content   | String         | NOT NULL      | Message content           |
| createdAt | DateTime       | DEFAULT now() | Message timestamp         |

**Relationships**:

- `box`: Box (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[boxId, createdAt]` (chat history)

**Design Notes**:

- Chat interface for browser agent interaction
- Roles: USER (user input), AGENT (AI response), SYSTEM (status messages)
- Used to build LLM conversation context
- Messages ordered chronologically per box

---

## Campaign Analytics

### VisitorSession

Anonymous visitor tracking with UTM parameters.

**Table Name**: `visitor_sessions`

| Column        | Type      | Constraints   | Description                         |
| ------------- | --------- | ------------- | ----------------------------------- |
| id            | String    | PRIMARY KEY   | Unique session identifier           |
| visitorId     | String    | NOT NULL      | Anonymous fingerprint/cookie ID     |
| userId        | String?   | FK → User.id  | Linked user ID after signup         |
| sessionStart  | DateTime  | DEFAULT now() | Session start timestamp             |
| sessionEnd    | DateTime? | NULL          | Session end timestamp               |
| deviceType    | String?   | NULL          | Device type (mobile/tablet/desktop) |
| browser       | String?   | NULL          | Browser name                        |
| os            | String?   | NULL          | Operating system                    |
| ipCountry     | String?   | NULL          | ISO 2-letter country code           |
| ipCity        | String?   | NULL          | City name                           |
| referrer      | String?   | NULL          | Full referrer URL                   |
| landingPage   | String    | NOT NULL      | First page of session               |
| exitPage      | String?   | NULL          | Last page of session                |
| pageViewCount | Int       | DEFAULT 0     | Number of page views                |
| utmSource     | String?   | NULL          | UTM source parameter                |
| utmMedium     | String?   | NULL          | UTM medium parameter                |
| utmCampaign   | String?   | NULL          | UTM campaign parameter              |
| utmTerm       | String?   | NULL          | UTM term parameter                  |
| utmContent    | String?   | NULL          | UTM content parameter               |
| gclid         | String?   | NULL          | Google Click ID                     |
| fbclid        | String?   | NULL          | Facebook Click ID                   |

**Relationships**:

- `user`: User? (FK, SET NULL on delete)
- `pageViews`: PageView[]
- `events`: AnalyticsEvent[]

**Indexes**:

- PRIMARY KEY on `id`
- Index on `visitorId`
- Index on `userId`
- Index on `utmCampaign`
- Index on `utmSource`
- Index on `sessionStart`
- Index on `gclid`
- Index on `fbclid`

**Design Notes**:

- Tracks anonymous visitors before and after signup
- UTM parameters for campaign attribution
- Click IDs enable direct platform ROI tracking
- IP geolocation for geographic analytics
- Sessions linked to users upon signup/login

---

### PageView

Individual page view tracking within sessions.

**Table Name**: `page_views`

| Column      | Type     | Constraints     | Description                 |
| ----------- | -------- | --------------- | --------------------------- |
| id          | String   | PRIMARY KEY     | Unique page view identifier |
| sessionId   | String   | FK → Session.id | Associated session ID       |
| path        | String   | NOT NULL        | Page path (URL path)        |
| title       | String?  | NULL            | Page title                  |
| timestamp   | DateTime | DEFAULT now()   | Page view timestamp         |
| timeOnPage  | Int?     | NULL            | Seconds spent on page       |
| scrollDepth | Int?     | NULL            | Percentage scrolled (0-100) |

**Relationships**:

- `session`: VisitorSession (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[sessionId, timestamp]`
- Index on `path`

**Design Notes**:

- Detailed page-level analytics
- Time on page calculated from next page view
- Scroll depth for engagement metrics
- Used to identify popular content

---

### AnalyticsEvent

Custom event tracking for user behavior.

**Table Name**: `analytics_events`

| Column    | Type     | Constraints     | Description                            |
| --------- | -------- | --------------- | -------------------------------------- |
| id        | String   | PRIMARY KEY     | Unique event identifier                |
| sessionId | String   | FK → Session.id | Associated session ID                  |
| name      | String   | NOT NULL        | Event name (e.g., "signup_started")    |
| category  | String?  | NULL            | Event category (conversion/engagement) |
| value     | Float?   | NULL            | Numeric value (tokens/revenue)         |
| metadata  | Json?    | NULL            | Additional event data                  |
| timestamp | DateTime | DEFAULT now()   | Event timestamp                        |

**Relationships**:

- `session`: VisitorSession (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[sessionId, timestamp]`
- Index on `name`
- Index on `category`

**Design Notes**:

- Custom event tracking for conversion funnel
- Value field for revenue/token tracking
- Metadata stores event-specific data
- Category enables event grouping

---

### CampaignAttribution

Links users to marketing campaigns for ROI tracking.

**Table Name**: `campaign_attributions`

| Column             | Type            | Constraints   | Description                        |
| ------------------ | --------------- | ------------- | ---------------------------------- |
| id                 | String          | PRIMARY KEY   | Unique attribution identifier      |
| userId             | String          | FK → User.id  | Converted user ID                  |
| sessionId          | String          | NOT NULL      | Session ID (not FK)                |
| attributionType    | AttributionType | NOT NULL      | Attribution model                  |
| platform           | String?         | NULL          | Platform (FACEBOOK/GOOGLE_ADS/etc) |
| externalCampaignId | String?         | NULL          | External campaign ID               |
| utmCampaign        | String?         | NULL          | UTM campaign parameter             |
| utmSource          | String?         | NULL          | UTM source parameter               |
| utmMedium          | String?         | NULL          | UTM medium parameter               |
| conversionType     | ConversionType  | NOT NULL      | Conversion type enum               |
| conversionValue    | Float?          | NULL          | Token/revenue value                |
| convertedAt        | DateTime        | DEFAULT now() | Conversion timestamp               |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `userId`
- Index on `utmCampaign`
- Index on `externalCampaignId`
- Index on `convertedAt`
- Index on `conversionType`
- Index on `attributionType`

**Design Notes**:

- Attribution models: FIRST_TOUCH, LAST_TOUCH
- Conversion types: SIGNUP, ENHANCEMENT, PURCHASE
- External campaign ID links to Facebook/Google Ads
- Used to calculate campaign ROI
- Session ID stored but not FK (sessions may be purged)

---

### CampaignMetricsCache

Cached campaign metrics for dashboard performance.

**Table Name**: `campaign_metrics_cache`

| Column     | Type     | Constraints     | Description                    |
| ---------- | -------- | --------------- | ------------------------------ |
| id         | String   | PRIMARY KEY     | Unique cache identifier        |
| cacheKey   | String   | UNIQUE NOT NULL | Cache key (date range + model) |
| metrics    | Json     | NOT NULL        | Cached metrics data            |
| computedAt | DateTime | DEFAULT now()   | Computation timestamp          |
| expiresAt  | DateTime | NOT NULL        | Cache expiration timestamp     |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `cacheKey`
- Index on `expiresAt`

**Design Notes**:

- Caches expensive campaign metric calculations
- Cache key format: "overview:2024-01-01:2024-01-31:first_touch"
- Expires after 1 hour (configurable)
- Improves dashboard load time

---

### CampaignLink

Maps UTM campaigns to external platform campaign IDs.

**Table Name**: `campaign_links`

| Column               | Type     | Constraints   | Description                    |
| -------------------- | -------- | ------------- | ------------------------------ |
| id                   | String   | PRIMARY KEY   | Unique link identifier         |
| utmCampaign          | String   | NOT NULL      | UTM campaign parameter         |
| platform             | String   | NOT NULL      | Platform (FACEBOOK/GOOGLE_ADS) |
| externalCampaignId   | String   | NOT NULL      | External campaign ID           |
| externalCampaignName | String?  | NULL          | Campaign name from platform    |
| createdAt            | DateTime | DEFAULT now() | Link creation timestamp        |
| updatedAt            | DateTime | AUTO UPDATE   | Last update timestamp          |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[utmCampaign, platform]`
- Index on `platform`
- Index on `externalCampaignId`

**Design Notes**:

- Links internal UTM parameters to external platforms
- Enables ROI calculation from platform APIs
- Updated automatically when campaign detected
- Supports multi-platform campaigns

---

## Audio Mixer

### AudioMixerProject

Audio mixing project container.

**Table Name**: `audio_mixer_projects`

| Column      | Type     | Constraints   | Description                |
| ----------- | -------- | ------------- | -------------------------- |
| id          | String   | PRIMARY KEY   | Unique project identifier  |
| userId      | String   | FK → User.id  | Project owner ID           |
| name        | String   | NOT NULL      | Project display name       |
| description | String?  | NULL          | Project description        |
| createdAt   | DateTime | DEFAULT now() | Project creation timestamp |
| updatedAt   | DateTime | AUTO UPDATE   | Last update timestamp      |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `tracks`: AudioTrack[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, createdAt]`

**Design Notes**:

- Container for audio mixing projects
- Each project contains multiple audio tracks
- Supports browser-based audio mixing

---

### AudioTrack

Individual audio tracks within mixing projects.

**Table Name**: `audio_tracks`

| Column        | Type             | Constraints     | Description                 |
| ------------- | ---------------- | --------------- | --------------------------- |
| id            | String           | PRIMARY KEY     | Unique track identifier     |
| projectId     | String           | FK → Project.id | Associated project ID       |
| name          | String           | NOT NULL        | Track display name          |
| fileUrl       | String?          | NULL            | R2 public URL               |
| fileR2Key     | String?          | NULL            | R2 storage key              |
| fileFormat    | String           | NOT NULL        | Audio format (wav/mp3/webm) |
| duration      | Float            | NOT NULL        | Duration in seconds         |
| fileSizeBytes | Int              | NOT NULL        | File size in bytes          |
| volume        | Float            | DEFAULT 1.0     | Track volume (0.0-1.0)      |
| muted         | Boolean          | DEFAULT false   | Mute status                 |
| solo          | Boolean          | DEFAULT false   | Solo status                 |
| sortOrder     | Int              | DEFAULT 0       | Track display order         |
| storageType   | AudioStorageType | DEFAULT R2      | Storage location (R2/OPFS)  |
| createdAt     | DateTime         | DEFAULT now()   | Track creation timestamp    |
| updatedAt     | DateTime         | AUTO UPDATE     | Last update timestamp       |

**Relationships**:

- `project`: AudioMixerProject (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[projectId, sortOrder]`

**Design Notes**:

- Storage types: R2 (server), OPFS (browser local)
- Volume range 0.0 (silent) to 1.0 (full)
- Solo isolates track for editing
- Sort order allows track reordering

---

## Merchandise & Print-on-Demand

### MerchCategory

Product category organization.

**Table Name**: `merch_categories`

| Column      | Type     | Constraints     | Description                 |
| ----------- | -------- | --------------- | --------------------------- |
| id          | String   | PRIMARY KEY     | Unique category identifier  |
| name        | String   | UNIQUE NOT NULL | Category display name       |
| slug        | String   | UNIQUE NOT NULL | URL-friendly slug           |
| description | String?  | NULL            | Category description        |
| icon        | String?  | NULL            | Icon identifier             |
| sortOrder   | Int      | DEFAULT 0       | Display order               |
| isActive    | Boolean  | DEFAULT true    | Category visibility         |
| createdAt   | DateTime | DEFAULT now()   | Category creation timestamp |
| updatedAt   | DateTime | AUTO UPDATE     | Last update timestamp       |

**Relationships**:

- `products`: MerchProduct[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `name`
- UNIQUE index on `slug`
- Composite index on `[isActive, sortOrder]`

**Design Notes**:

- Categories: Prints, Canvas, Framed, etc.
- Slug used in URLs (/shop/canvas)
- Inactive categories hidden but products preserved

---

### MerchProduct

Print-on-demand product catalog.

**Table Name**: `merch_products`

| Column          | Type          | Constraints      | Description                |
| --------------- | ------------- | ---------------- | -------------------------- |
| id              | String        | PRIMARY KEY      | Unique product identifier  |
| name            | String        | NOT NULL         | Product display name       |
| description     | String?       | NULL             | Product description        |
| categoryId      | String        | FK → Category.id | Product category ID        |
| provider        | PodProvider   | NOT NULL         | POD provider enum          |
| providerSku     | String        | NOT NULL         | External SKU from provider |
| basePrice       | Decimal(10,2) | NOT NULL         | Cost from provider         |
| retailPrice     | Decimal(10,2) | NOT NULL         | Selling price to customer  |
| currency        | String        | DEFAULT "GBP"    | Currency code              |
| isActive        | Boolean       | DEFAULT true     | Product availability       |
| minDpi          | Int           | DEFAULT 150      | Minimum image DPI          |
| minWidth        | Int           | DEFAULT 1800     | Minimum image width (px)   |
| minHeight       | Int           | DEFAULT 1800     | Minimum image height (px)  |
| printAreaWidth  | Int?          | NULL             | Print area width (px)      |
| printAreaHeight | Int?          | NULL             | Print area height (px)     |
| mockupTemplate  | String?       | NULL             | Mockup overlay image URL   |
| sortOrder       | Int           | DEFAULT 0        | Display order in category  |
| createdAt       | DateTime      | DEFAULT now()    | Product creation timestamp |
| updatedAt       | DateTime      | AUTO UPDATE      | Last update timestamp      |

**Relationships**:

- `category`: MerchCategory (FK)
- `variants`: MerchVariant[]
- `cartItems`: MerchCartItem[]
- `orderItems`: MerchOrderItem[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[categoryId, isActive]`
- Composite index on `[provider, providerSku]`
- Composite index on `[isActive, sortOrder]`

**Design Notes**:

- Multi-provider support (Prodigi, Printful)
- Image requirements ensure print quality
- Mockup template for product visualization
- Margin = retailPrice - basePrice

---

### MerchVariant

Product size/color/material variants.

**Table Name**: `merch_variants`

| Column      | Type          | Constraints     | Description                       |
| ----------- | ------------- | --------------- | --------------------------------- |
| id          | String        | PRIMARY KEY     | Unique variant identifier         |
| productId   | String        | FK → Product.id | Associated product ID             |
| name        | String        | NOT NULL        | Variant name ("30x40cm", "Black") |
| providerSku | String        | NOT NULL        | Provider-specific variant SKU     |
| priceDelta  | Decimal(10,2) | DEFAULT 0       | Price adjustment from base        |
| isActive    | Boolean       | DEFAULT true    | Variant availability              |
| attributes  | Json?         | NULL            | Variant attributes JSON           |
| createdAt   | DateTime      | DEFAULT now()   | Variant creation timestamp        |
| updatedAt   | DateTime      | AUTO UPDATE     | Last update timestamp             |

**Relationships**:

- `product`: MerchProduct (FK, CASCADE on delete)
- `cartItems`: MerchCartItem[]
- `orderItems`: MerchOrderItem[]

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[productId, isActive]`

**Design Notes**:

- Flexible variant system via attributes JSON
- Price delta adds/subtracts from product base price
- Separate provider SKUs for each variant
- Examples: sizes (30x40cm), colors (Black/White), materials (Canvas/Photo Paper)

---

### MerchCart

User shopping cart (one per user).

**Table Name**: `merch_carts`

| Column    | Type     | Constraints   | Description              |
| --------- | -------- | ------------- | ------------------------ |
| id        | String   | PRIMARY KEY   | Unique cart identifier   |
| userId    | String   | UNIQUE FK     | Associated user ID (1:1) |
| createdAt | DateTime | DEFAULT now() | Cart creation timestamp  |
| updatedAt | DateTime | AUTO UPDATE   | Last update timestamp    |

**Relationships**:

- `user`: User (1:1, CASCADE on delete)
- `items`: MerchCartItem[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `userId`

**Design Notes**:

- One cart per user (1:1 relationship)
- Cart persists across sessions
- Cascade delete removes cart items when cart deleted

---

### MerchCartItem

Items in shopping cart.

**Table Name**: `merch_cart_items`

| Column             | Type     | Constraints     | Description                 |
| ------------------ | -------- | --------------- | --------------------------- |
| id                 | String   | PRIMARY KEY     | Unique cart item identifier |
| cartId             | String   | FK → Cart.id    | Associated cart ID          |
| productId          | String   | FK → Product.id | Product ID                  |
| variantId          | String?  | FK → Variant.id | Variant ID (optional)       |
| imageId            | String?  | FK → Image.id   | User's existing image ID    |
| uploadedImageR2Key | String?  | NULL            | Direct upload R2 key        |
| uploadedImageUrl   | String?  | NULL            | Direct upload public URL    |
| quantity           | Int      | DEFAULT 1       | Item quantity               |
| customText         | String?  | NULL            | Personalization text        |
| createdAt          | DateTime | DEFAULT now()   | Item added timestamp        |
| updatedAt          | DateTime | AUTO UPDATE     | Last update timestamp       |

**Relationships**:

- `cart`: MerchCart (FK, CASCADE on delete)
- `product`: MerchProduct (FK)
- `variant`: MerchVariant? (FK, optional)
- `image`: EnhancedImage? (FK, optional)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[cartId, productId, variantId, imageId, uploadedImageR2Key]`
- Index on `cartId`
- Index on `productId`

**Design Notes**:

- Image source: either existing user image OR direct upload
- Unique constraint prevents duplicate cart items
- Custom text for personalized products
- Quantity > 1 for bulk orders

---

### MerchOrder

Customer orders for merchandise.

**Table Name**: `merch_orders`

| Column                | Type             | Constraints     | Description                     |
| --------------------- | ---------------- | --------------- | ------------------------------- |
| id                    | String           | PRIMARY KEY     | Unique order identifier         |
| userId                | String           | FK → User.id    | Customer user ID                |
| orderNumber           | String           | UNIQUE NOT NULL | Human-readable order number     |
| status                | MerchOrderStatus | DEFAULT PENDING | Order lifecycle status          |
| subtotal              | Decimal(10,2)    | NOT NULL        | Items total before shipping/tax |
| shippingCost          | Decimal(10,2)    | NOT NULL        | Shipping cost                   |
| taxAmount             | Decimal(10,2)    | DEFAULT 0       | Tax amount                      |
| totalAmount           | Decimal(10,2)    | NOT NULL        | Grand total                     |
| currency              | String           | DEFAULT "GBP"   | Currency code                   |
| stripePaymentIntentId | String?          | UNIQUE NULL     | Stripe Payment Intent ID        |
| stripePaymentStatus   | String?          | NULL            | Stripe payment status           |
| shippingAddress       | Json             | NOT NULL        | Shipping address JSON           |
| billingAddress        | Json?            | NULL            | Billing address JSON            |
| customerEmail         | String           | NOT NULL        | Customer email                  |
| customerPhone         | String?          | NULL            | Customer phone number           |
| notes                 | String?          | NULL            | Order notes                     |
| createdAt             | DateTime         | DEFAULT now()   | Order creation timestamp        |
| updatedAt             | DateTime         | AUTO UPDATE     | Last update timestamp           |
| paidAt                | DateTime?        | NULL            | Payment completion timestamp    |

**Relationships**:

- `user`: User (FK)
- `items`: MerchOrderItem[]
- `shipments`: MerchShipment[]
- `events`: MerchOrderEvent[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `orderNumber`
- UNIQUE index on `stripePaymentIntentId`
- Composite index on `[userId, createdAt]`
- Index on `status`

**Design Notes**:

- Order lifecycle: PENDING → PAID → SUBMITTED → IN_PRODUCTION → SHIPPED → DELIVERED
- Addresses stored as JSON for flexibility
- Stripe payment intent for payment processing
- paidAt tracks actual payment timestamp

---

### MerchOrderItem

Line items in orders (immutable snapshot).

**Table Name**: `merch_order_items`

| Column      | Type          | Constraints      | Description                   |
| ----------- | ------------- | ---------------- | ----------------------------- |
| id          | String        | PRIMARY KEY      | Unique order item identifier  |
| orderId     | String        | FK → Order.id    | Associated order ID           |
| productId   | String        | FK → Product.id  | Product ID (reference only)   |
| variantId   | String?       | FK → Variant.id  | Variant ID (reference only)   |
| productName | String        | NOT NULL         | Product name snapshot         |
| variantName | String?       | NULL             | Variant name snapshot         |
| imageUrl    | String        | NOT NULL         | Image URL snapshot            |
| imageR2Key  | String        | NOT NULL         | Image R2 key for POD          |
| quantity    | Int           | NOT NULL         | Item quantity                 |
| unitPrice   | Decimal(10,2) | NOT NULL         | Unit price snapshot           |
| totalPrice  | Decimal(10,2) | NOT NULL         | Total price (unit × quantity) |
| customText  | String?       | NULL             | Personalization text          |
| podOrderId  | String?       | NULL             | Provider order ID             |
| podStatus   | String?       | NULL             | Provider-specific status      |
| createdAt   | DateTime      | DEFAULT now()    | Item creation timestamp       |
| updatedAt   | DateTime      | AUTO UPDATE      | Last update timestamp         |
| shipmentId  | String?       | FK → Shipment.id | Associated shipment ID        |

**Relationships**:

- `order`: MerchOrder (FK, CASCADE on delete)
- `product`: MerchProduct (FK, reference only)
- `variant`: MerchVariant? (FK, reference only)
- `shipment`: MerchShipment? (FK, optional)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `orderId`
- Index on `podOrderId`

**Design Notes**:

- Immutable snapshot of product/variant/price at order time
- Product/variant FKs for reference only (prices/names snapshotted)
- Image R2 key for POD provider submission
- POD order ID tracks external fulfillment

---

### MerchShipment

Shipment tracking for order fulfillment.

**Table Name**: `merch_shipments`

| Column         | Type           | Constraints     | Description                  |
| -------------- | -------------- | --------------- | ---------------------------- |
| id             | String         | PRIMARY KEY     | Unique shipment identifier   |
| orderId        | String         | FK → Order.id   | Associated order ID          |
| provider       | PodProvider    | NOT NULL        | POD provider enum            |
| providerShipId | String?        | NULL            | Provider's shipment ID       |
| carrier        | String?        | NULL            | Carrier name (FedEx/UPS/etc) |
| trackingNumber | String?        | NULL            | Tracking number              |
| trackingUrl    | String?        | NULL            | Tracking URL                 |
| status         | ShipmentStatus | DEFAULT PENDING | Shipment status enum         |
| shippedAt      | DateTime?      | NULL            | Shipment timestamp           |
| deliveredAt    | DateTime?      | NULL            | Delivery timestamp           |
| createdAt      | DateTime       | DEFAULT now()   | Shipment creation timestamp  |
| updatedAt      | DateTime       | AUTO UPDATE     | Last update timestamp        |

**Relationships**:

- `order`: MerchOrder (FK, CASCADE on delete)
- `items`: MerchOrderItem[]

**Indexes**:

- PRIMARY KEY on `id`
- Index on `orderId`
- Index on `trackingNumber`

**Design Notes**:

- One order can have multiple shipments (split fulfillment)
- Tracking info from POD provider webhooks
- Status lifecycle: PENDING → PROCESSING → SHIPPED → IN_TRANSIT → DELIVERED
- Delivery updates via carrier webhooks

---

### MerchOrderEvent

Audit trail for order lifecycle events.

**Table Name**: `merch_order_events`

| Column    | Type     | Constraints   | Description             |
| --------- | -------- | ------------- | ----------------------- |
| id        | String   | PRIMARY KEY   | Unique event identifier |
| orderId   | String   | FK → Order.id | Associated order ID     |
| type      | String   | NOT NULL      | Event type              |
| data      | Json?    | NULL          | Event-specific data     |
| createdAt | DateTime | DEFAULT now() | Event timestamp         |

**Relationships**:

- `order`: MerchOrder (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[orderId, createdAt]`

**Design Notes**:

- Immutable audit trail for order events
- Event types: ORDER_CREATED, PAYMENT_AUTHORIZED, PAYMENT_CAPTURED, SUBMITTED_TO_POD, etc.
- Data field stores event-specific details
- Used for order history timeline

---

### MerchWebhookEvent

Webhook event deduplication and processing.

**Table Name**: `merch_webhook_events`

| Column      | Type      | Constraints     | Description                        |
| ----------- | --------- | --------------- | ---------------------------------- |
| id          | String    | PRIMARY KEY     | Unique webhook event identifier    |
| provider    | String    | NOT NULL        | Provider (STRIPE/PRODIGI/PRINTFUL) |
| eventId     | String    | UNIQUE NOT NULL | External event ID (deduplication)  |
| eventType   | String    | NOT NULL        | Event type                         |
| processed   | Boolean   | DEFAULT false   | Processing status                  |
| payload     | Json      | NOT NULL        | Full webhook payload               |
| processedAt | DateTime? | NULL            | Processing completion timestamp    |
| createdAt   | DateTime  | DEFAULT now()   | Webhook receipt timestamp          |

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `eventId`
- Composite index on `[provider, eventType]`
- Composite index on `[processed, createdAt]`

**Design Notes**:

- Prevents duplicate webhook processing
- Stores raw payload for debugging
- Async processing via background jobs
- Retention policy: purge after 90 days

---

## External Agent Integration

### ExternalAgentSession

Jules/Codex agent coding session tracking.

**Table Name**: `external_agent_sessions`

| Column         | Type                | Constraints     | Description                 |
| -------------- | ------------------- | --------------- | --------------------------- |
| id             | String              | PRIMARY KEY     | Unique session identifier   |
| externalId     | String              | UNIQUE NOT NULL | External session ID         |
| provider       | AgentProvider       | DEFAULT JULES   | Agent provider enum         |
| name           | String              | NOT NULL        | Task name/title             |
| description    | String?             | NULL            | Task description            |
| status         | ExternalAgentStatus | NOT NULL        | Session status enum         |
| sourceRepo     | String?             | NULL            | Source repository           |
| startingBranch | String?             | NULL            | Starting git branch         |
| outputBranch   | String?             | NULL            | Output git branch           |
| pullRequestUrl | String?             | NULL            | Created PR URL              |
| planSummary    | String?             | NULL            | Agent's implementation plan |
| planApprovedAt | DateTime?           | NULL            | Plan approval timestamp     |
| lastActivityAt | DateTime?           | NULL            | Last activity timestamp     |
| errorMessage   | String?             | NULL            | Error details if failed     |
| metadata       | Json?               | NULL            | Provider-specific data      |
| createdAt      | DateTime            | DEFAULT now()   | Session creation timestamp  |
| updatedAt      | DateTime            | AUTO UPDATE     | Last update timestamp       |

**Relationships**:

- `activities`: AgentSessionActivity[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `externalId`
- Composite index on `[provider, status]`
- Composite index on `[status, lastActivityAt]`

**Design Notes**:

- Integrates external AI coding agents (Jules, Codex)
- Tracks async coding tasks in external systems
- Status lifecycle: QUEUED → PLANNING → AWAITING_PLAN_APPROVAL → IN_PROGRESS → COMPLETED/FAILED
- Pull request URL for code review
- Metadata stores provider-specific data

---

### AgentSessionActivity

Activity stream for agent sessions.

**Table Name**: `agent_session_activities`

| Column     | Type     | Constraints     | Description                |
| ---------- | -------- | --------------- | -------------------------- |
| id         | String   | PRIMARY KEY     | Unique activity identifier |
| sessionId  | String   | FK → Session.id | Associated session ID      |
| externalId | String?  | NULL            | External activity ID       |
| type       | String   | NOT NULL        | Activity type              |
| content    | String?  | NULL            | Activity description       |
| metadata   | Json?    | NULL            | Activity-specific data     |
| createdAt  | DateTime | DEFAULT now()   | Activity timestamp         |

**Relationships**:

- `session`: ExternalAgentSession (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[sessionId, createdAt]`

**Design Notes**:

- Activity types: user_message, plan_generated, code_committed, etc.
- Content stores human-readable activity description
- Ordered chronologically for activity timeline
- Used to display agent progress to user

---

## System & Audit

### AuditLog

Audit trail for admin actions.

**Table Name**: `audit_logs`

| Column    | Type        | Constraints   | Description           |
| --------- | ----------- | ------------- | --------------------- |
| id        | String      | PRIMARY KEY   | Unique log identifier |
| userId    | String      | FK → User.id  | Admin user ID         |
| action    | AuditAction | NOT NULL      | Action type enum      |
| targetId  | String?     | NULL          | Target entity ID      |
| metadata  | Json?       | NULL          | Action details        |
| ipAddress | String?     | NULL          | Admin IP address      |
| createdAt | DateTime    | DEFAULT now() | Action timestamp      |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `userId`
- Index on `action`
- Index on `targetId`
- Index on `createdAt`

**Design Notes**:

- Immutable audit trail for compliance
- Action types: ROLE_CHANGE, TOKEN_ADJUSTMENT, VOUCHER_CREATE, etc.
- Target ID references affected entity
- IP address for security audit
- Retention: indefinite

---

### ErrorLog

Error logging for application monitoring.

**Table Name**: `error_logs`

| Column       | Type             | Constraints   | Description                |
| ------------ | ---------------- | ------------- | -------------------------- |
| id           | String           | PRIMARY KEY   | Unique error identifier    |
| timestamp    | DateTime         | DEFAULT now() | Error occurrence timestamp |
| message      | String           | NOT NULL      | Error message              |
| stack        | String?          | NULL          | Stack trace                |
| sourceFile   | String?          | NULL          | Source file path           |
| sourceLine   | Int?             | NULL          | Source line number         |
| sourceColumn | Int?             | NULL          | Source column number       |
| callerName   | String?          | NULL          | Function/method name       |
| userId       | String?          | NULL          | User ID (if applicable)    |
| route        | String?          | NULL          | API route or page path     |
| environment  | ErrorEnvironment | NOT NULL      | Environment enum           |
| errorType    | String?          | NULL          | Error type/class name      |
| errorCode    | String?          | NULL          | Custom error code          |
| metadata     | Json?            | NULL          | Additional error context   |

**Indexes**:

- PRIMARY KEY on `id`
- Index on `timestamp`
- Index on `sourceFile`
- Index on `errorType`
- Index on `environment`

**Design Notes**:

- Captures frontend (browser) and backend (server) errors
- Source maps for stack trace resolution
- Metadata stores request context, user agent, etc.
- Retention: 30 days
- Used for error monitoring and debugging

---

### Feedback

User-submitted feedback and bug reports.

**Table Name**: `feedback`

| Column    | Type           | Constraints   | Description                      |
| --------- | -------------- | ------------- | -------------------------------- |
| id        | String         | PRIMARY KEY   | Unique feedback identifier       |
| userId    | String?        | FK → User.id  | User ID (optional for anonymous) |
| email     | String?        | NULL          | Contact email                    |
| type      | FeedbackType   | NOT NULL      | Feedback type enum               |
| message   | String         | NOT NULL      | Feedback message                 |
| page      | String         | NOT NULL      | Page where feedback submitted    |
| userAgent | String?        | NULL          | Browser user agent               |
| status    | FeedbackStatus | DEFAULT NEW   | Processing status                |
| adminNote | String?        | NULL          | Admin response notes             |
| createdAt | DateTime       | DEFAULT now() | Feedback submission timestamp    |
| updatedAt | DateTime       | AUTO UPDATE   | Last update timestamp            |

**Relationships**:

- `user`: User? (FK, SET NULL on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Index on `userId`
- Index on `status`
- Index on `type`
- Index on `createdAt`

**Design Notes**:

- Supports anonymous feedback (NULL userId)
- Types: BUG, IDEA, OTHER
- Status workflow: NEW → REVIEWED → RESOLVED/DISMISSED
- Admin notes for internal tracking
- Email optional for follow-up

---

### Voucher

Promotional voucher codes.

**Table Name**: `vouchers`

| Column      | Type          | Constraints     | Description                     |
| ----------- | ------------- | --------------- | ------------------------------- |
| id          | String        | PRIMARY KEY     | Unique voucher identifier       |
| code        | String        | UNIQUE NOT NULL | Voucher code (case-insensitive) |
| type        | VoucherType   | NOT NULL        | Voucher type enum               |
| value       | Int           | NOT NULL        | Voucher value (tokens or %)     |
| maxUses     | Int?          | NULL            | Maximum redemptions (NULL = ∞)  |
| currentUses | Int           | DEFAULT 0       | Current redemption count        |
| expiresAt   | DateTime?     | NULL            | Expiration timestamp            |
| status      | VoucherStatus | DEFAULT ACTIVE  | Voucher status enum             |
| metadata    | Json?         | NULL            | Additional voucher data         |
| createdAt   | DateTime      | DEFAULT now()   | Voucher creation timestamp      |
| updatedAt   | DateTime      | AUTO UPDATE     | Last update timestamp           |

**Relationships**:

- `redemptions`: VoucherRedemption[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `code`
- Composite index on `[status, expiresAt]`

**Design Notes**:

- Types: FIXED_TOKENS, PERCENTAGE_BONUS, SUBSCRIPTION_TRIAL
- Status: ACTIVE, INACTIVE, EXPIRED, DEPLETED
- Code stored uppercase for case-insensitive lookup
- Unlimited use vouchers have NULL maxUses
- Metadata for campaign tracking

---

### VoucherRedemption

Voucher redemption history.

**Table Name**: `voucher_redemptions`

| Column        | Type     | Constraints     | Description                  |
| ------------- | -------- | --------------- | ---------------------------- |
| id            | String   | PRIMARY KEY     | Unique redemption identifier |
| voucherId     | String   | FK → Voucher.id | Voucher ID                   |
| userId        | String   | FK → User.id    | User who redeemed            |
| tokensGranted | Int      | NOT NULL        | Tokens granted to user       |
| redeemedAt    | DateTime | DEFAULT now()   | Redemption timestamp         |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `voucher`: Voucher (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[voucherId, userId]` (one redemption per user)
- Composite index on `[userId, redeemedAt]`

**Design Notes**:

- One redemption per user per voucher
- Tokens granted calculated at redemption time
- Immutable audit trail
- Links to token transactions

---

### Referral

Referral program tracking.

**Table Name**: `referrals`

| Column        | Type           | Constraints     | Description                      |
| ------------- | -------------- | --------------- | -------------------------------- |
| id            | String         | PRIMARY KEY     | Unique referral identifier       |
| referrerId    | String         | FK → User.id    | Referrer user ID                 |
| refereeId     | String         | FK → User.id    | Referee user ID                  |
| status        | ReferralStatus | DEFAULT PENDING | Referral status enum             |
| tokensGranted | Int            | DEFAULT 0       | Tokens granted to referrer       |
| ipAddress     | String?        | NULL            | Referee IP address (fraud check) |
| createdAt     | DateTime       | DEFAULT now()   | Referral creation timestamp      |
| completedAt   | DateTime?      | NULL            | Completion timestamp             |

**Relationships**:

- `referrer`: User (FK, CASCADE on delete)
- `referee`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE composite index on `[referrerId, refereeId]` (prevents duplicate referrals)
- Composite index on `[referrerId, status]`
- Index on `refereeId`
- Composite index on `[status, createdAt]`

**Design Notes**:

- Status: PENDING → COMPLETED (when referee completes action) or INVALID (fraud detected)
- Tokens granted when status = COMPLETED
- IP address used for fraud detection
- One referral per referee

---

### EmailLog

Email communication history and tracking.

**Table Name**: `email_logs`

| Column    | Type        | Constraints   | Description                |
| --------- | ----------- | ------------- | -------------------------- |
| id        | String      | PRIMARY KEY   | Unique email identifier    |
| userId    | String      | FK → User.id  | Recipient user ID          |
| to        | String      | NOT NULL      | Recipient email address    |
| subject   | String      | NOT NULL      | Email subject line         |
| template  | String      | NOT NULL      | Email template name        |
| status    | EmailStatus | DEFAULT SENT  | Email delivery status      |
| resendId  | String?     | UNIQUE NULL   | Resend email ID            |
| sentAt    | DateTime    | DEFAULT now() | Send timestamp             |
| openedAt  | DateTime?   | NULL          | Open timestamp (tracking)  |
| clickedAt | DateTime?   | NULL          | Click timestamp (tracking) |
| bouncedAt | DateTime?   | NULL          | Bounce timestamp           |
| metadata  | Json?       | NULL          | Additional email data      |

**Relationships**:

- `user`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `resendId`
- Index on `userId`
- Index on `status`
- Index on `sentAt`
- Index on `template`

**Design Notes**:

- Email provider: Resend
- Status: PENDING → SENT → DELIVERED → OPENED → CLICKED
- Bounce tracking for email deliverability
- Template-based email system
- Metadata stores dynamic email data

---

### TrackedUrl

Custom URL tracking for analytics.

**Table Name**: `tracked_urls`

| Column      | Type     | Constraints     | Description               |
| ----------- | -------- | --------------- | ------------------------- |
| id          | String   | PRIMARY KEY     | Unique URL identifier     |
| path        | String   | UNIQUE NOT NULL | URL path (without domain) |
| label       | String?  | NULL            | Human-readable label      |
| isActive    | Boolean  | DEFAULT true    | Tracking enabled status   |
| createdAt   | DateTime | DEFAULT now()   | URL creation timestamp    |
| updatedAt   | DateTime | AUTO UPDATE     | Last update timestamp     |
| createdById | String   | FK → User.id    | Creator user ID           |

**Relationships**:

- `createdBy`: User (FK, CASCADE on delete)

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `path`
- Index on `isActive`

**Design Notes**:

- Tracks custom landing pages and campaigns
- Path stored without domain (e.g., "/promo/summer2024")
- Used in campaign attribution
- Label for dashboard display

---

### ApiKey

API keys for MCP generation access.

**Table Name**: `api_keys`

| Column     | Type      | Constraints     | Description                   |
| ---------- | --------- | --------------- | ----------------------------- |
| id         | String    | PRIMARY KEY     | Unique key identifier         |
| userId     | String    | FK → User.id    | Key owner user ID             |
| name       | String    | NOT NULL        | Key display name              |
| keyHash    | String    | UNIQUE NOT NULL | Hashed API key                |
| keyPrefix  | String    | NOT NULL        | Key prefix for identification |
| lastUsedAt | DateTime? | NULL            | Last usage timestamp          |
| isActive   | Boolean   | DEFAULT true    | Key active status             |
| createdAt  | DateTime  | DEFAULT now()   | Key creation timestamp        |
| updatedAt  | DateTime  | AUTO UPDATE     | Last update timestamp         |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `mcpGenerationJobs`: McpGenerationJob[]

**Indexes**:

- PRIMARY KEY on `id`
- UNIQUE index on `keyHash`
- Composite index on `[userId, isActive]`

**Design Notes**:

- Only hash stored (never plain text)
- Prefix shown to user for identification (e.g., "sk_live_abc...")
- Last used for activity monitoring
- Inactive keys rejected at authentication

---

### McpGenerationJob

MCP API image generation jobs.

**Table Name**: `mcp_generation_jobs`

| Column                | Type            | Constraints    | Description                     |
| --------------------- | --------------- | -------------- | ------------------------------- |
| id                    | String          | PRIMARY KEY    | Unique job identifier           |
| userId                | String          | FK → User.id   | Job owner user ID               |
| apiKeyId              | String?         | FK → ApiKey.id | API key used (optional)         |
| type                  | McpJobType      | NOT NULL       | Job type enum                   |
| tier                  | EnhancementTier | NOT NULL       | Enhancement quality tier        |
| tokensCost            | Int             | NOT NULL       | Tokens consumed                 |
| status                | JobStatus       | NOT NULL       | Job status enum                 |
| prompt                | String          | NOT NULL       | Generation prompt               |
| inputImageUrl         | String?         | NULL           | Input image URL (modify type)   |
| inputImageR2Key       | String?         | NULL           | Input image R2 key              |
| outputImageUrl        | String?         | NULL           | Output image URL                |
| outputImageR2Key      | String?         | NULL           | Output image R2 key             |
| outputWidth           | Int?            | NULL           | Output width in pixels          |
| outputHeight          | Int?            | NULL           | Output height in pixels         |
| outputSizeBytes       | Int?            | NULL           | Output file size                |
| errorMessage          | String?         | NULL           | Error details if failed         |
| geminiModel           | String?         | NULL           | Gemini model used               |
| processingStartedAt   | DateTime?       | NULL           | Processing start timestamp      |
| processingCompletedAt | DateTime?       | NULL           | Processing completion timestamp |
| createdAt             | DateTime        | DEFAULT now()  | Job creation timestamp          |
| updatedAt             | DateTime        | AUTO UPDATE    | Last update timestamp           |

**Relationships**:

- `user`: User (FK, CASCADE on delete)
- `apiKey`: ApiKey? (FK, SET NULL on delete)

**Indexes**:

- PRIMARY KEY on `id`
- Composite index on `[userId, status, createdAt]`
- Index on `apiKeyId`
- Composite index on `[status, updatedAt]`

**Design Notes**:

- Job types: GENERATE (text-to-image), MODIFY (image-to-image)
- API key optional (can be created via UI)
- Token cost deducted when job created
- Supports Gemini 3 Flash and Pro image models

---

## Enumerations

### UserRole

- `USER` - Standard user account
- `ADMIN` - Administrator with elevated privileges
- `SUPER_ADMIN` - Super administrator with full access

### MarketingPlatform

- `FACEBOOK` - Facebook Ads platform
- `GOOGLE_ADS` - Google Ads platform

### AppStatus

- `DRAFT` - App under development
- `ACTIVE` - Published and accessible
- `ARCHIVED` - No longer active but preserved
- `DELETED` - Soft deleted

### RequirementPriority

- `LOW` - Nice to have
- `MEDIUM` - Should have
- `HIGH` - Must have
- `CRITICAL` - Blocking issue

### RequirementStatus

- `PENDING` - Not started
- `IN_PROGRESS` - Currently being worked on
- `COMPLETED` - Finished and deployed
- `REJECTED` - Will not implement

### MonetizationType

- `FREE` - No cost
- `ONE_TIME` - Single payment
- `SUBSCRIPTION` - Recurring payment
- `FREEMIUM` - Free with paid upgrades
- `USAGE_BASED` - Pay per use

### SubscriptionInterval

- `MONTHLY` - Billed monthly
- `QUARTERLY` - Billed every 3 months
- `YEARLY` - Billed annually

### VoucherType

- `FIXED_TOKENS` - Grant fixed number of tokens
- `PERCENTAGE_BONUS` - Percentage bonus on purchase
- `SUBSCRIPTION_TRIAL` - Free subscription trial

### VoucherStatus

- `ACTIVE` - Available for redemption
- `INACTIVE` - Disabled by admin
- `EXPIRED` - Past expiration date
- `DEPLETED` - Maximum uses reached

### TokenTransactionType

- `EARN_REGENERATION` - Monthly token regeneration
- `EARN_PURCHASE` - Token package purchase
- `EARN_BONUS` - Referral or promotional bonus
- `EARN_ADMIN_ADJUSTMENT` - Manual admin adjustment
- `SPEND_ENHANCEMENT` - Image enhancement cost
- `SPEND_MCP_GENERATION` - MCP API generation cost
- `SPEND_BOX_CREATION` - Browser box creation cost
- `REFUND` - Token refund

### McpJobType

- `GENERATE` - Text-to-image generation
- `MODIFY` - Image-to-image modification

### StripePaymentStatus

- `PENDING` - Payment intent created
- `SUCCEEDED` - Payment completed
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

### EnhancementTier

- `FREE` - Free tier (limited quality)
- `TIER_1K` - 1024px output (2 tokens)
- `TIER_2K` - 2048px output (5 tokens)
- `TIER_4K` - 4096px output (10 tokens)

### JobStatus

- `PENDING` - Job queued
- `PROCESSING` - Job in progress
- `COMPLETED` - Job finished successfully
- `FAILED` - Job failed
- `REFUNDED` - Job failed and refunded
- `CANCELLED` - Job cancelled by user

### PipelineStage

- `ANALYZING` - Image analysis with vision model
- `CROPPING` - Auto-crop based on analysis
- `PROMPTING` - Build dynamic enhancement prompt
- `GENERATING` - Gemini API image generation

### SubscriptionStatus

- `ACTIVE` - Subscription active
- `CANCELED` - Subscription cancelled
- `PAST_DUE` - Payment failed
- `UNPAID` - Payment not received
- `TRIALING` - In trial period

### SubscriptionTier

- `FREE` - Free tier
- `BASIC` - Basic subscription
- `STANDARD` - Standard subscription
- `PREMIUM` - Premium subscription

### AlbumPrivacy

- `PRIVATE` - Visible only to owner
- `UNLISTED` - Accessible via share link
- `PUBLIC` - Visible in public gallery

### ReferralStatus

- `PENDING` - Awaiting completion
- `COMPLETED` - Referral completed
- `INVALID` - Fraud detected

### AuditAction

- `ROLE_CHANGE` - User role modified
- `TOKEN_ADJUSTMENT` - Manual token adjustment
- `VOUCHER_CREATE` - Voucher created
- `VOUCHER_UPDATE` - Voucher updated
- `VOUCHER_DELETE` - Voucher deleted
- `USER_DELETE` - User deleted
- `ADMIN_LOGIN` - Admin logged in

### FeedbackType

- `BUG` - Bug report
- `IDEA` - Feature idea
- `OTHER` - Other feedback

### FeedbackStatus

- `NEW` - Not yet reviewed
- `REVIEWED` - Reviewed by admin
- `RESOLVED` - Issue resolved
- `DISMISSED` - Dismissed

### ErrorEnvironment

- `FRONTEND` - Browser/client-side error
- `BACKEND` - Server-side error

### GalleryCategory

- `PORTRAIT` - Portrait photography
- `LANDSCAPE` - Landscape photography
- `PRODUCT` - Product photography
- `ARCHITECTURE` - Architecture photography

### EmailStatus

- `PENDING` - Email queued
- `SENT` - Email sent
- `DELIVERED` - Email delivered
- `OPENED` - Email opened
- `CLICKED` - Link clicked
- `BOUNCED` - Email bounced
- `FAILED` - Delivery failed

### BoxStatus

- `CREATING` - Box being created
- `STARTING` - Box starting up
- `RUNNING` - Box running
- `PAUSED` - Box paused
- `STOPPING` - Box shutting down
- `STOPPED` - Box stopped
- `TERMINATED` - Box terminated
- `ERROR` - Box in error state

### BoxActionType

- `CREATE` - Create new box
- `START` - Start stopped box
- `STOP` - Stop running box
- `RESTART` - Restart box
- `DELETE` - Delete box
- `CLONE` - Clone box

### BoxMessageRole

- `USER` - User message
- `AGENT` - AI agent message
- `SYSTEM` - System message

### PipelineVisibility

- `PRIVATE` - Only owner can use
- `PUBLIC` - Anyone can use/fork
- `LINK` - Accessible via share token

### AudioStorageType

- `R2` - Cloudflare R2 storage
- `OPFS` - Browser Origin Private File System

### AttributionType

- `FIRST_TOUCH` - First campaign touchpoint
- `LAST_TOUCH` - Last campaign touchpoint

### ConversionType

- `SIGNUP` - User signup
- `ENHANCEMENT` - Image enhancement
- `PURCHASE` - Token purchase

### PodProvider

- `PRODIGI` - Prodigi print-on-demand
- `PRINTFUL` - Printful print-on-demand

### MerchOrderStatus

- `PENDING` - Order created, awaiting payment
- `PAYMENT_PENDING` - Payment authorized
- `PAID` - Payment captured
- `SUBMITTED` - Sent to POD provider
- `IN_PRODUCTION` - Being manufactured
- `SHIPPED` - In transit
- `DELIVERED` - Delivered
- `CANCELLED` - Cancelled
- `REFUNDED` - Fully refunded

### ShipmentStatus

- `PENDING` - Shipment pending
- `PROCESSING` - Being processed
- `SHIPPED` - Shipped
- `IN_TRANSIT` - In transit
- `OUT_FOR_DELIVERY` - Out for delivery
- `DELIVERED` - Delivered
- `FAILED` - Delivery failed

### AgentProvider

- `JULES` - Jules coding agent
- `CODEX` - Codex coding agent
- `OTHER` - Other agent provider

### ExternalAgentStatus

- `QUEUED` - Task queued
- `PLANNING` - Agent planning
- `AWAITING_PLAN_APPROVAL` - Waiting for plan approval
- `AWAITING_USER_FEEDBACK` - Waiting for user feedback
- `IN_PROGRESS` - Task in progress
- `PAUSED` - Task paused
- `FAILED` - Task failed
- `COMPLETED` - Task completed

---

## Indexes & Performance

### Index Strategy

The database employs a comprehensive indexing strategy optimized for common query patterns:

#### Primary Keys

- All tables use CUID (Collision-resistant Unique Identifier) for primary keys
- CUIDs are URL-safe, sortable, and globally unique
- Enables efficient distributed ID generation without central coordination

#### Foreign Key Indexes

- All foreign keys automatically indexed for join performance
- Composite indexes on frequently joined columns
- Example: `[userId, createdAt]` for user timeline queries

#### Status Field Indexes

- Status fields indexed for filtering active/pending items
- Composite indexes like `[status, updatedAt]` for job queues
- Example: Image enhancement jobs filtered by status and ordered by update time

#### Unique Constraints

- Email addresses (nullable unique)
- Session tokens
- Share tokens
- Stripe IDs
- OAuth provider combinations
- Voucher codes

#### Composite Indexes

Optimized for common query patterns:

- `[userId, status, createdAt]` - User's jobs by status timeline
- `[isPublic, createdAt]` - Public gallery chronological view
- `[albumId, sortOrder]` - Album image ordering
- `[status, currentStage]` - Pipeline stage filtering for SSE streaming

### Query Optimization Guidelines

1. **Use `select` to limit returned fields**
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, name: true, email: true },
   });
   ```

2. **Use `include` judiciously to avoid N+1 queries**
   ```typescript
   const albums = await prisma.album.findMany({
     include: {
       albumImages: {
         include: { image: true },
         orderBy: { sortOrder: "asc" },
       },
     },
   });
   ```

3. **Implement pagination for large result sets**
   ```typescript
   const images = await prisma.enhancedImage.findMany({
     take: 20,
     skip: (page - 1) * 20,
     orderBy: { createdAt: "desc" },
   });
   ```

4. **Use database-level limits**
   - Connection pool size: 10-20 connections (Neon serverless)
   - Query timeout: 30 seconds
   - Statement timeout: 60 seconds

### Connection Pooling

- **Provider**: Neon serverless PostgreSQL with connection pooling
- **Pool Configuration**:
  - Min connections: 0 (serverless auto-scaling)
  - Max connections: 10 per instance
  - Idle timeout: 10 seconds
  - Connection lifetime: 1 hour

- **Best Practices**:
  - Use Prisma's built-in connection pooling
  - Close connections properly in serverless functions
  - Reuse Prisma Client instances across requests
  - Monitor connection usage via Neon dashboard

---

## Security Considerations

### Sensitive Data Protection

1. **Access Tokens**
   - OAuth access/refresh tokens stored as TEXT
   - Should be encrypted at application layer using AES-256-GCM
   - Encryption keys managed via environment variables
   - Token rotation enforced by OAuth providers

2. **Session Tokens**
   - Treated as secrets (never logged)
   - HTTPS-only transmission
   - Secure, HttpOnly cookies
   - Automatic expiration via NextAuth.js

3. **API Keys**
   - Only hashed values stored (SHA-256)
   - Prefix stored for user identification
   - Never returned in API responses
   - Revocable via user dashboard

4. **Password Hashes**
   - bcrypt with cost factor 12
   - Salted automatically by bcrypt
   - Only for credential-based authentication
   - Never exposed in API responses

### Database Security Recommendations

1. **Encryption at Rest**
   - Enable PostgreSQL native encryption
   - Neon provides automatic encryption at rest
   - Backup encryption enabled by default

2. **Encryption in Transit**
   - SSL/TLS required for all connections
   - Minimum TLS 1.2
   - Certificate validation enforced

3. **Access Control**
   - Principle of least privilege for database roles
   - Separate read-only role for analytics
   - Connection credentials rotated quarterly
   - IP allowlisting for production database

4. **Audit Logging**
   - All admin actions logged to `audit_logs`
   - Token adjustments tracked
   - User deletions recorded
   - IP addresses logged for security events

5. **SQL Injection Prevention**
   - Parameterized queries via Prisma (automatic)
   - No raw SQL in application code
   - Input validation at API layer
   - Type safety via TypeScript

---

## Scalability

### Vertical Scaling

Current schema supports:

- **100K+ users** on single instance
- **10M+ images** with partitioning
- **1M+ jobs/day** with optimized indexes

Scaling recommendations:

- Add read replicas for read-heavy workloads
- Implement table partitioning for very large tables (>10M rows)
- Use materialized views for complex analytics queries

### Horizontal Scaling

Schema designed for sharding by `userId`:

- User-centric data model enables clean partitioning
- Each shard contains complete user data
- Cross-shard queries minimized via denormalization

### Caching Strategy

1. **Application-Level Caching**
   - Redis for session data (NextAuth.js)
   - User token balances cached (5-minute TTL)
   - Public gallery cached (1-hour TTL)
   - Campaign metrics cached (1-hour TTL)

2. **Database Query Caching**
   - Neon serverless includes automatic query caching
   - Frequently accessed data cached at edge
   - Cache invalidation via Prisma middleware

3. **CDN Caching**
   - R2 object storage with Cloudflare CDN
   - Image URLs cached at edge locations
   - Aggressive caching for immutable assets

---

## Migration Strategy

### Backward Compatibility

Always follow these steps for schema changes:

1. **Add new column (nullable)**
   ```sql
   ALTER TABLE users ADD COLUMN new_field TEXT;
   ```

2. **Deploy code that writes to both old and new columns**
   ```typescript
   await prisma.user.update({
     data: { oldField: value, newField: value },
   });
   ```

3. **Backfill old data**
   ```sql
   UPDATE users SET new_field = old_field WHERE new_field IS NULL;
   ```

4. **Deploy code that reads from new column**
   ```typescript
   const value = user.newField;
   ```

5. **Make column required (if needed)**
   ```sql
   ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;
   ```

6. **Remove old column (optional)**
   ```sql
   ALTER TABLE users DROP COLUMN old_field;
   ```

### Zero-Downtime Deployments

Multi-phase migration example:

**Phase 1: Add New Field**

```prisma
model User {
  // ... existing fields
  newField String? // Nullable initially
}
```

**Phase 2: Dual Write**

- Application writes to both fields
- No breaking changes to existing queries

**Phase 3: Backfill**

```typescript
await prisma.$executeRaw`
  UPDATE users
  SET new_field = old_field
  WHERE new_field IS NULL
`;
```

**Phase 4: Cut Over**

- Switch reads to new field
- Monitor for errors

**Phase 5: Cleanup**

- Remove old field
- Remove dual-write code

### Migration Tools

- **Prisma Migrate**: Schema migration management
- **Migration Files**: SQL migration files in `prisma/migrations/`
- **Shadow Database**: Temporary database for migration validation
- **Migration History**: `_prisma_migrations` table tracks applied migrations

---

## Version History

### v2.0.0 (2025-12-30)

- **COMPREHENSIVE UPDATE**: Complete documentation overhaul
- Added detailed descriptions for all 55+ tables
- Documented all relationships and indexes
- Added 30+ enumerations with descriptions
- Expanded security considerations
- Added scalability guidelines
- Enhanced migration strategy
- Updated to Prisma 7.2.0
- Added merchandise/print-on-demand system (11 tables)
- Added external agent integration (2 tables)
- Added campaign analytics system (6 tables)
- Added audio mixer system (2 tables)
- Enhanced enhancement pipeline with multi-stage processing

### v1.0.0 (2025-01-23)

- Initial schema documentation
- Core models: User, App, Requirement, MonetizationModel
- Basic authentication via NextAuth.js
- Token system foundation
- Image enhancement basics

---

## Appendix

### Sample Queries

**Get user with all enhancement jobs:**

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    enhancementJobs: {
      where: { status: "COMPLETED" },
      include: { image: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    },
  },
});
```

**Get public albums with images:**

```typescript
const albums = await prisma.album.findMany({
  where: { privacy: "PUBLIC" },
  include: {
    albumImages: {
      include: { image: true },
      orderBy: { sortOrder: "asc" },
    },
  },
  orderBy: { createdAt: "desc" },
});
```

**Get campaign attribution for date range:**

```typescript
const attributions = await prisma.campaignAttribution.findMany({
  where: {
    convertedAt: {
      gte: startDate,
      lte: endDate,
    },
    attributionType: "FIRST_TOUCH",
  },
  include: { user: true },
});
```

**Get merchandise order with items and shipments:**

```typescript
const order = await prisma.merchOrder.findUnique({
  where: { id: orderId },
  include: {
    items: {
      include: {
        product: true,
        variant: true,
      },
    },
    shipments: true,
    events: { orderBy: { createdAt: "desc" } },
  },
});
```

### Database Statistics Queries

**Table sizes:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Row counts:**

```sql
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

**Index usage:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Unused indexes:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Related Documentation

- [TOKEN_SYSTEM.md](/Users/z/Developer/spike-land-nextjs/docs/TOKEN_SYSTEM.md) - Detailed token economics
- [API_REFERENCE.md](/Users/z/Developer/spike-land-nextjs/docs/API_REFERENCE.md) - API endpoints using this schema
- [DATABASE_SETUP.md](/Users/z/Developer/spike-land-nextjs/docs/DATABASE_SETUP.md) - Database setup instructions
- [FEATURES.md](/Users/z/Developer/spike-land-nextjs/docs/FEATURES.md) - Platform features overview

---

**Document Maintained By**: Technical Documentation Team
**Last Reviewed**: 2025-12-30
**Next Review**: 2026-01-30
