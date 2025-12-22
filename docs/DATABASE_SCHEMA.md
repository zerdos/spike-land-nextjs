# Database Schema Documentation

This document provides a detailed overview of the Spike Land database schema,
including models, relationships, and design decisions.

## Schema Version

- **Version**: 1.0.0
- **Last Updated**: 2025-01-23
- **Prisma Version**: 6.18.0
- **PostgreSQL Version**: 14+

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spike Land Database Schema                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    User      │◄────────┤   Account    │         │   Session    │
│              │         │              │         │              │
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ email        │◄────────┤ userId (FK)  │         │ sessionToken │
│ name         │         │ provider     │         │ userId (FK)  │
│ emailVerified│         │ providerAccId│         │ expires      │
│ image        │         └──────────────┘         └──────────────┘
│ createdAt    │                 │                        │
│ updatedAt    │                 └────────────────────────┘
└──────┬───────┘
       │
       │ 1:N
       │
       ▼
┌──────────────┐         ┌──────────────────┐    ┌─────────────────────┐
│     App      │◄────────┤   Requirement    │    │  MonetizationModel  │
│              │         │                  │    │                     │
│ id (PK)      │         │ id (PK)          │    │ id (PK)             │
│ name         │◄────────┤ appId (FK)       │    │ appId (FK)          │
│ description  │         │ description      │    │ type                │
│ userId (FK)  │         │ priority         │    │ price               │
│ forkedFrom   │◄───┐    │ status           │    │ version          │    │ subscriptionInterval│
│ status       │    │    │ version          │    │ features[]          │
│ domain       │    │    │ createdAt        │    │ createdAt           │
│ createdAt    │    │    │ updatedAt        │    │ updatedAt           │
│ updatedAt    │    │    └──────────────────┘    └─────────────────────┘
└──────────────┘    │                                       │
       │            │                                       │
       └────────────┘                                       │
       (Self-reference                                      │
        for forks)                                          │
```

(Note: This diagram shows a subset of the core tables. See below for all 55 tables.)

## Models

### User

Represents a user account in the system. Integrated with NextAuth.js for
authentication.

**Table Name**: `users`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String? | User's display name |
| email | String? | User's email address |
| emailVerified | DateTime? | Email verification timestamp |
| image | String? | User's avatar/profile image URL |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| stripeCustomerId | String? |  |
| role | UserRole |  |
| referralCode | String? |  |
| referredById | String? |  |
| referralCount | Int |  |
| passwordHash | String? |  |
| accounts | Account[] |  |
| albums | Album[] |  |
| apps | App[] |  |
| auditLogs | AuditLog[] |  |
| enhancedImages | EnhancedImage[] |  |
| enhancementJobs | ImageEnhancementJob[] |  |
| sessions | Session[] |  |
| stripePayments | StripePayment[] |  |
| subscription | Subscription? |  |
| tokenTransactions | TokenTransaction[] |  |
| tokenBalance | UserTokenBalance? |  |
| voucherRedemptions | VoucherRedemption[] |  |
| feedback | Feedback[] |  |
| emailLogs | EmailLog[] |  |
| trackedUrls | TrackedUrl[] |  |
| apiKeys | ApiKey[] |  |
| mcpGenerationJobs | McpGenerationJob[] |  |
| boxes | Box[] |  |
| pipelines | EnhancementPipeline[] |  |
| audioMixerProjects | AudioMixerProject[] |  |
| marketingAccounts | MarketingAccount[] |  |
| visitorSessions | VisitorSession[] |  |
| campaignAttributions | CampaignAttribution[] |  |
| merchCart | MerchCart? |  |
| merchOrders | MerchOrder[] |  |

**Relationships**:
- `refereeReferrals`: Referral[]
- `referrerReferrals`: Referral[]
- `referredBy`: User?
- `referrals`: User[]
- `createdGalleryItems`: FeaturedGalleryItem[]

**Indexes**:
- Unique index on `email`

**Design Notes**:
- Email is nullable to support OAuth-only accounts without email permission
- Uses CUID for globally unique, ordered IDs
- `emailVerified` tracks when user confirmed their email

---

### Account

Stores OAuth provider account information. Part of NextAuth.js adapter.

**Table Name**: `accounts`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| type | String |  |
| provider | String |  |
| providerAccountId | String |  |
| refresh_token | String? |  |
| access_token | String? |  |
| expires_at | Int? |  |
| token_type | String? |  |
| scope | String? |  |
| id_token | String? |  |
| session_state | String? |  |

**Relationships**:
- `user`: User

**Indexes**:
- Unique composite index on `[provider, providerAccountId]`

**Design Notes**:
- Supports multiple OAuth providers per user
- Tokens stored as TEXT for long strings
- Cascade delete ensures cleanup when user is deleted

---

### MarketingAccount

**Table Name**: `marketing_accounts`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| platform | MarketingPlatform |  |
| accountId | String | Platform-specific account ID (FB Ad Account ID, Google Ads Customer ID) |
| accountName | String? |  |
| accessToken | String | Encrypted access token |
| refreshToken | String? | Encrypted refresh token (for Google Ads) |
| expiresAt | DateTime? |  |
| isActive | Boolean |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User

---

### Session

Tracks active user sessions. Part of NextAuth.js adapter.

**Table Name**: `sessions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| sessionToken | String |  |
| userId | String |  |
| expires | DateTime |  |

**Relationships**:
- `user`: User

**Indexes**:
- Unique index on `sessionToken`

**Design Notes**:
- Session tokens should be treated as secrets
- Expired sessions should be cleaned up periodically
- Cascade delete ensures sessions are removed with user

---

### VerificationToken

Email verification tokens. Part of NextAuth.js adapter.

**Table Name**: `verification_tokens`

| Column | Type | Description |
|---|---|---|
| identifier | String |  |
| token | String |  |
| expires | DateTime |  |

**Indexes**:
- Unique composite index on `[identifier, token]`
- Unique index on `token`

**Design Notes**:
- No relations (standalone tokens)
- Should be cleaned up after use or expiration
- Used for passwordless sign-in or email verification

---

### App

Core entity representing user-created applications.

**Table Name**: `apps`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| description | String? |  |
| userId | String |  |
| forkedFrom | String? |  |
| status | AppStatus |  |
| domain | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| monetizationModels | MonetizationModel[] |  |
| requirements | Requirement[] |  |

**Relationships**:
- `parentApp`: App?
- `forks`: App[]
- `user`: User

**Indexes**:
- Index on `userId`
- Index on `forkedFrom`
- Index on `status`
- Unique index on `domain`

**Enums - AppStatus**:
- `DRAFT` - App under development
- `ACTIVE` - Published and accessible
- `ARCHIVED` - No longer active but preserved
- `DELETED` - Soft deleted

**Design Notes**:
- `forkedFrom` enables app inheritance/forking feature
- Domain uniqueness enforces one app per custom domain
- Cascade delete removes all app data when user is deleted
- Set null on parent app delete preserves fork history

---

### Requirement

Feature requirements or specifications for an app.

**Table Name**: `requirements`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| appId | String |  |
| description | String |  |
| priority | RequirementPriority |  |
| status | RequirementStatus |  |
| version | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `app`: App

**Indexes**:
- Index on `appId`
- Index on `status`
- Index on `priority`

**Enums - RequirementPriority**:
- `LOW` - Nice to have
- `MEDIUM` - Should have
- `HIGH` - Must have
- `CRITICAL` - Blocking issue

**Enums - RequirementStatus**:
- `PENDING` - Not started
- `IN_PROGRESS` - Currently being worked on
- `COMPLETED` - Finished and deployed
- `REJECTED` - Will not implement

**Design Notes**:
- Version tracking allows requirement evolution
- Multiple indexes support filtering by status and priority
- Cascade delete removes requirements with app
- Text type allows long descriptions

---

### MonetizationModel

Pricing and monetization strategies for apps.

**Table Name**: `monetization_models`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| appId | String |  |
| type | MonetizationType |  |
| price | Decimal? |  |
| subscriptionInterval | SubscriptionInterval? |  |
| features | String[] |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `app`: App

**Indexes**:
- Index on `appId`
- Index on `type`

**Enums - MonetizationType**:
- `FREE` - No cost
- `ONE_TIME` - Single payment
- `SUBSCRIPTION` - Recurring payment
- `FREEMIUM` - Free with paid upgrades
- `USAGE_BASED` - Pay per use

**Enums - SubscriptionInterval**:
- `MONTHLY` - Billed monthly
- `QUARTERLY` - Billed every 3 months
- `YEARLY` - Billed annually

**Design Notes**:
- Apps can have multiple monetization models (tiers)
- Price stored as Decimal(10,2) for precise currency handling
- Features array stores included feature descriptions
- subscriptionInterval only required for SUBSCRIPTION type
- Cascade delete removes models with app

---

### UserTokenBalance

**Table Name**: `user_token_balances`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| balance | Int |  |
| lastRegeneration | DateTime |  |
| tier | SubscriptionTier |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User

---

### TokenTransaction

**Table Name**: `token_transactions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| amount | Int |  |
| type | TokenTransactionType |  |
| source | String? |  |
| sourceId | String? |  |
| balanceAfter | Int |  |
| metadata | Json? |  |
| createdAt | DateTime |  |

**Relationships**:
- `user`: User

---

### TokensPackage

**Table Name**: `tokens_packages`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| tokens | Int |  |
| priceUSD | Decimal |  |
| stripePriceId | String |  |
| active | Boolean |  |
| sortOrder | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| stripePayments | StripePayment[] |  |

---

### StripePayment

**Table Name**: `stripe_payments`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| packageId | String |  |
| tokensGranted | Int |  |
| amountUSD | Decimal |  |
| stripePaymentIntentId | String |  |
| status | StripePaymentStatus |  |
| metadata | Json? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `package`: TokensPackage
- `user`: User

---

### EnhancedImage

**Table Name**: `enhanced_images`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| name | String |  |
| description | String? |  |
| originalUrl | String |  |
| originalR2Key | String |  |
| originalWidth | Int |  |
| originalHeight | Int |  |
| originalSizeBytes | Int |  |
| originalFormat | String |  |
| isPublic | Boolean |  |
| viewCount | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| shareToken | String? |  |
| albumImages | AlbumImage[] |  |
| enhancementJobs | ImageEnhancementJob[] |  |
| featuredGalleryItems | FeaturedGalleryItem[] |  |
| merchCartItems | MerchCartItem[] |  |

**Relationships**:
- `user`: User
- `blendTargetJobs`: ImageEnhancementJob[]

---

### ImageEnhancementJob

**Table Name**: `image_enhancement_jobs`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| imageId | String |  |
| userId | String |  |
| tier | EnhancementTier |  |
| tokensCost | Int |  |
| status | JobStatus |  |
| currentStage | PipelineStage? | Current pipeline stage for progress tracking |
| enhancedUrl | String? |  |
| enhancedR2Key | String? |  |
| enhancedWidth | Int? |  |
| enhancedHeight | Int? |  |
| enhancedSizeBytes | Int? |  |
| errorMessage | String? |  |
| retryCount | Int |  |
| maxRetries | Int |  |
| geminiPrompt | String? |  |
| geminiModel | String? |  |
| geminiTemp | Float? |  |
| processingStartedAt | DateTime? |  |
| processingCompletedAt | DateTime? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| workflowRunId | String? |  |
| analysisResult | Json? | Stores full AnalysisDetailedResult JSON |
| analysisSource | String? | Model used for analysis (e.g., "gemini-3-pro-image-preview") |
| wasCropped | Boolean |  |
| cropDimensions | Json? | Stores { left, top, width, height } pixel values used |
| pipelineId | String? |  |
| sourceImageId | String? |  |
| isBlend | Boolean | True when job uses blend enhancement (file upload or stored image) |
| featuredGalleryItems | FeaturedGalleryItem[] |  |

**Relationships**:
- `pipeline`: EnhancementPipeline?
- `sourceImage`: EnhancedImage?
- `image`: EnhancedImage
- `user`: User

---

### Subscription

**Table Name**: `subscriptions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| stripeSubscriptionId | String |  |
| stripePriceId | String |  |
| status | SubscriptionStatus |  |
| tier | SubscriptionTier |  |
| currentPeriodStart | DateTime |  |
| currentPeriodEnd | DateTime |  |
| cancelAtPeriodEnd | Boolean |  |
| downgradeTo | SubscriptionTier? |  |
| tokensPerMonth | Int |  |
| rolloverTokens | Int |  |
| maxRollover | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User

---

### SubscriptionPlan

**Table Name**: `subscription_plans`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| tokensPerMonth | Int |  |
| priceGBP | Decimal |  |
| stripePriceId | String |  |
| maxRollover | Int |  |
| priority | Boolean |  |
| apiAccess | Boolean |  |
| active | Boolean |  |
| sortOrder | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

---

### Album

**Table Name**: `albums`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| name | String |  |
| description | String? |  |
| coverImageId | String? |  |
| privacy | AlbumPrivacy |  |
| defaultTier | EnhancementTier |  |
| shareToken | String? |  |
| sortOrder | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| pipelineId | String? |  |
| albumImages | AlbumImage[] |  |

**Relationships**:
- `pipeline`: EnhancementPipeline?
- `user`: User

---

### AlbumImage

**Table Name**: `album_images`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| albumId | String |  |
| imageId | String |  |
| sortOrder | Int |  |
| addedAt | DateTime |  |

**Relationships**:
- `album`: Album
- `image`: EnhancedImage

---

### Voucher

**Table Name**: `vouchers`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| code | String |  |
| type | VoucherType |  |
| value | Int |  |
| maxUses | Int? |  |
| currentUses | Int |  |
| expiresAt | DateTime? |  |
| status | VoucherStatus |  |
| metadata | Json? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| redemptions | VoucherRedemption[] |  |

---

### VoucherRedemption

**Table Name**: `voucher_redemptions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| voucherId | String |  |
| userId | String |  |
| tokensGranted | Int |  |
| redeemedAt | DateTime |  |

**Relationships**:
- `user`: User
- `voucher`: Voucher

---

### Referral

**Table Name**: `referrals`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| referrerId | String |  |
| refereeId | String |  |
| status | ReferralStatus |  |
| tokensGranted | Int |  |
| ipAddress | String? |  |
| createdAt | DateTime |  |
| completedAt | DateTime? |  |

**Relationships**:
- `referee`: User
- `referrer`: User

---

### AuditLog

**Table Name**: `audit_logs`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| action | AuditAction |  |
| targetId | String? |  |
| metadata | Json? |  |
| ipAddress | String? |  |
| createdAt | DateTime |  |

**Relationships**:
- `user`: User

---

### ErrorLog

**Table Name**: `error_logs`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| timestamp | DateTime |  |
| message | String |  |
| stack | String? |  |
| sourceFile | String? |  |
| sourceLine | Int? |  |
| sourceColumn | Int? |  |
| callerName | String? |  |
| userId | String? |  |
| route | String? |  |
| environment | ErrorEnvironment |  |
| errorType | String? |  |
| errorCode | String? |  |
| metadata | Json? |  |

---

### Feedback

**Table Name**: `feedback`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String? |  |
| email | String? |  |
| type | FeedbackType |  |
| message | String |  |
| page | String |  |
| userAgent | String? |  |
| status | FeedbackStatus |  |
| adminNote | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User?

---

### FeaturedGalleryItem

**Table Name**: `featured_gallery_items`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| title | String |  |
| description | String? |  |
| category | GalleryCategory |  |
| originalUrl | String |  |
| enhancedUrl | String |  |
| width | Int |  |
| height | Int |  |
| sourceImageId | String? |  |
| sourceJobId | String? |  |
| sortOrder | Int |  |
| isActive | Boolean |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| createdBy | String |  |

**Relationships**:
- `sourceImage`: EnhancedImage?
- `sourceJob`: ImageEnhancementJob?
- `creator`: User

---

### BoxTier

**Table Name**: `box_tiers`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String | e.g. "Standard", "Pro", "Ultra" |
| description | String? |  |
| cpu | Int | vCPU count |
| ram | Int | RAM in MB |
| storage | Int | Storage in GB |
| pricePerHour | Int | Token cost per hour |
| pricePerMonth | Int | Token cost per month (if subscription) |
| isActive | Boolean |  |
| sortOrder | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| boxes | Box[] |  |

---

### Box

**Table Name**: `boxes`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| description | String? |  |
| userId | String |  |
| tierId | String? |  |
| status | BoxStatus |  |
| connectionUrl | String? | URL to access the VNC/NoVNC interface |
| storageVolumeId | String? | ID of the persistent storage volume (R2/S3) |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| deletedAt | DateTime? |  |
| actions | BoxAction[] |  |
| tasks | AgentTask[] |  |
| messages | BoxMessage[] |  |

**Relationships**:
- `user`: User
- `tier`: BoxTier?

---

### BoxAction

**Table Name**: `box_actions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| boxId | String |  |
| action | BoxActionType |  |
| status | JobStatus |  |
| metadata | Json? |  |
| error | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `box`: Box

---

### AgentTask

**Table Name**: `agent_tasks`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| boxId | String |  |
| type | String | e.g. "NAVIGATE", "CLICK", "TYPE" |
| payload | Json? | e.g. { url: "https://google.com" } |
| status | JobStatus |  |
| result | Json? |  |
| error | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `box`: Box

---

### EmailLog

**Table Name**: `email_logs`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| to | String |  |
| subject | String |  |
| template | String |  |
| status | EmailStatus |  |
| resendId | String? |  |
| sentAt | DateTime |  |
| openedAt | DateTime? |  |
| clickedAt | DateTime? |  |
| bouncedAt | DateTime? |  |
| metadata | Json? |  |

**Relationships**:
- `user`: User

---

### TrackedUrl

**Table Name**: `tracked_urls`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| path | String | Store path only (e.g., "/custom-page"), not full URL |
| label | String? |  |
| isActive | Boolean |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| createdById | String |  |

**Relationships**:
- `createdBy`: User

---

### ApiKey

**Table Name**: `api_keys`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| name | String |  |
| keyHash | String |  |
| keyPrefix | String |  |
| lastUsedAt | DateTime? |  |
| isActive | Boolean |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| mcpGenerationJobs | McpGenerationJob[] |  |

**Relationships**:
- `user`: User

---

### McpGenerationJob

**Table Name**: `mcp_generation_jobs`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| apiKeyId | String? |  |
| type | McpJobType |  |
| tier | EnhancementTier |  |
| tokensCost | Int |  |
| status | JobStatus |  |
| prompt | String |  |
| inputImageUrl | String? |  |
| inputImageR2Key | String? |  |
| outputImageUrl | String? |  |
| outputImageR2Key | String? |  |
| outputWidth | Int? |  |
| outputHeight | Int? |  |
| outputSizeBytes | Int? |  |
| errorMessage | String? |  |
| geminiModel | String? |  |
| processingStartedAt | DateTime? |  |
| processingCompletedAt | DateTime? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User
- `apiKey`: ApiKey?

---

### BoxMessage

**Table Name**: `box_messages`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| boxId | String |  |
| role | BoxMessageRole |  |
| content | String |  |
| createdAt | DateTime |  |

**Relationships**:
- `box`: Box

---

### EnhancementPipeline

**Table Name**: `enhancement_pipelines`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| description | String? |  |
| userId | String? |  |
| visibility | PipelineVisibility |  |
| shareToken | String? | For link-based sharing |
| tier | EnhancementTier |  |
| analysisConfig | Json? | Analysis stage settings |
| autoCropConfig | Json? | Auto-crop behavior |
| promptConfig | Json? | Dynamic prompt generation |
| generationConfig | Json? | Gemini generation settings |
| usageCount | Int |  |
| albums | Album[] |  |
| jobs | ImageEnhancementJob[] |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `user`: User?

---

### VisitorSession

**Table Name**: `visitor_sessions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| visitorId | String | Anonymous fingerprint/cookie ID |
| userId | String? | Linked user ID after signup/login |
| sessionStart | DateTime |  |
| sessionEnd | DateTime? |  |
| deviceType | String? | mobile, tablet, desktop |
| browser | String? |  |
| os | String? |  |
| ipCountry | String? | ISO 2-letter country code |
| ipCity | String? |  |
| referrer | String? | Full referrer URL |
| landingPage | String | First page of session |
| exitPage | String? | Last page of session |
| pageViewCount | Int |  |
| utmSource | String? |  |
| utmMedium | String? |  |
| utmCampaign | String? |  |
| utmTerm | String? |  |
| utmContent | String? |  |
| gclid | String? | Google Click ID |
| fbclid | String? | Facebook Click ID |
| pageViews | PageView[] |  |
| events | AnalyticsEvent[] |  |

**Relationships**:
- `user`: User?

---

### PageView

**Table Name**: `page_views`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| sessionId | String |  |
| path | String |  |
| title | String? |  |
| timestamp | DateTime |  |
| timeOnPage | Int? | Seconds spent on page |
| scrollDepth | Int? | Percentage scrolled (0-100) |

**Relationships**:
- `session`: VisitorSession

---

### AnalyticsEvent

**Table Name**: `analytics_events`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| sessionId | String |  |
| name | String | e.g., "signup_started", "enhancement_completed" |
| category | String? | e.g., "conversion", "engagement" |
| value | Float? | Numeric value (e.g., token amount, revenue) |
| metadata | Json? | Additional event data |
| timestamp | DateTime |  |

**Relationships**:
- `session`: VisitorSession

---

### CampaignAttribution

**Table Name**: `campaign_attributions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| sessionId | String |  |
| attributionType | AttributionType |  |
| platform | String? | "FACEBOOK", "GOOGLE_ADS", "ORGANIC", "DIRECT", etc. |
| externalCampaignId | String? | Campaign ID from FB/Google for ROI matching |
| utmCampaign | String? |  |
| utmSource | String? |  |
| utmMedium | String? |  |
| conversionType | ConversionType |  |
| conversionValue | Float? | Token/revenue value |
| convertedAt | DateTime |  |

**Relationships**:
- `user`: User

---

### CampaignMetricsCache

**Table Name**: `campaign_metrics_cache`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| cacheKey | String | e.g., "overview:2024-01-01:2024-01-31:first_touch" |
| metrics | Json | Cached metrics data |
| computedAt | DateTime |  |
| expiresAt | DateTime |  |

---

### CampaignLink

**Table Name**: `campaign_links`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| utmCampaign | String |  |
| platform | String | "FACEBOOK" | "GOOGLE_ADS" |
| externalCampaignId | String |  |
| externalCampaignName | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

---

### AudioMixerProject

**Table Name**: `audio_mixer_projects`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| name | String |  |
| description | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| tracks | AudioTrack[] |  |

**Relationships**:
- `user`: User

---

### AudioTrack

**Table Name**: `audio_tracks`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| projectId | String |  |
| name | String |  |
| fileUrl | String? | R2 public URL |
| fileR2Key | String? | R2 key for server operations |
| fileFormat | String | wav, mp3, webm, etc. |
| duration | Float | seconds |
| fileSizeBytes | Int |  |
| volume | Float |  |
| muted | Boolean |  |
| solo | Boolean |  |
| sortOrder | Int |  |
| storageType | AudioStorageType |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `project`: AudioMixerProject

---

### MerchCategory

**Table Name**: `merch_categories`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| slug | String |  |
| description | String? |  |
| icon | String? |  |
| sortOrder | Int |  |
| isActive | Boolean |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| products | MerchProduct[] |  |

---

### MerchProduct

**Table Name**: `merch_products`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| name | String |  |
| description | String? |  |
| categoryId | String |  |
| provider | PodProvider |  |
| providerSku | String | External SKU from POD provider |
| basePrice | Decimal | Cost from provider |
| retailPrice | Decimal | Selling price |
| currency | String |  |
| isActive | Boolean |  |
| minDpi | Int |  |
| minWidth | Int |  |
| minHeight | Int |  |
| printAreaWidth | Int? | Print area in pixels |
| printAreaHeight | Int? |  |
| mockupTemplate | String? | URL to mockup overlay image |
| sortOrder | Int |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| variants | MerchVariant[] |  |
| cartItems | MerchCartItem[] |  |
| orderItems | MerchOrderItem[] |  |

**Relationships**:
- `category`: MerchCategory

---

### MerchVariant

**Table Name**: `merch_variants`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| productId | String |  |
| name | String | "30x40cm", "Large", "Black", etc. |
| providerSku | String | Provider-specific SKU for this variant |
| priceDelta | Decimal | Price adjustment from base |
| isActive | Boolean |  |
| attributes | Json? | { size: "30x40", color: "black" } |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| cartItems | MerchCartItem[] |  |
| orderItems | MerchOrderItem[] |  |

**Relationships**:
- `product`: MerchProduct

---

### MerchCart

**Table Name**: `merch_carts`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| items | MerchCartItem[] |  |

**Relationships**:
- `user`: User

---

### MerchCartItem

**Table Name**: `merch_cart_items`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| cartId | String |  |
| productId | String |  |
| variantId | String? |  |
| imageId | String? | EnhancedImage reference (if using existing) |
| uploadedImageR2Key | String? | R2 key (if direct upload) |
| uploadedImageUrl | String? | Public URL for direct uploads |
| quantity | Int |  |
| customText | String? | Optional personalization text |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |

**Relationships**:
- `cart`: MerchCart
- `product`: MerchProduct
- `variant`: MerchVariant?
- `image`: EnhancedImage?

---

### MerchOrder

**Table Name**: `merch_orders`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| userId | String |  |
| orderNumber | String | Human-readable order number |
| status | MerchOrderStatus |  |
| subtotal | Decimal |  |
| shippingCost | Decimal |  |
| taxAmount | Decimal |  |
| totalAmount | Decimal |  |
| currency | String |  |
| stripePaymentIntentId | String? |  |
| stripePaymentStatus | String? | authorized, captured, cancelled |
| shippingAddress | Json | { name, line1, line2, city, postalCode, country } |
| billingAddress | Json? |  |
| customerEmail | String |  |
| customerPhone | String? |  |
| notes | String? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| paidAt | DateTime? |  |
| items | MerchOrderItem[] |  |
| shipments | MerchShipment[] |  |
| events | MerchOrderEvent[] |  |

**Relationships**:
- `user`: User

---

### MerchOrderItem

**Table Name**: `merch_order_items`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| orderId | String |  |
| productId | String |  |
| variantId | String? |  |
| productName | String | Snapshot at order time |
| variantName | String? |  |
| imageUrl | String | Snapshot of image URL for display |
| imageR2Key | String | R2 key for reprints and POD submission |
| quantity | Int |  |
| unitPrice | Decimal |  |
| totalPrice | Decimal |  |
| customText | String? |  |
| podOrderId | String? | Provider order ID |
| podStatus | String? | Provider-specific status |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| shipmentId | String? |  |

**Relationships**:
- `order`: MerchOrder
- `product`: MerchProduct
- `variant`: MerchVariant?
- `shipment`: MerchShipment?

---

### MerchShipment

**Table Name**: `merch_shipments`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| orderId | String |  |
| provider | PodProvider |  |
| providerShipId | String? | Shipment ID from provider |
| carrier | String? | FedEx, UPS, Royal Mail, etc. |
| trackingNumber | String? |  |
| trackingUrl | String? |  |
| status | ShipmentStatus |  |
| shippedAt | DateTime? |  |
| deliveredAt | DateTime? |  |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| items | MerchOrderItem[] |  |

**Relationships**:
- `order`: MerchOrder

---

### MerchOrderEvent

**Table Name**: `merch_order_events`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| orderId | String |  |
| type | String | ORDER_CREATED, PAYMENT_AUTHORIZED, PAYMENT_CAPTURED, SUBMITTED_TO_POD, etc. |
| data | Json? | Event-specific data |
| createdAt | DateTime |  |

**Relationships**:
- `order`: MerchOrder

---

### MerchWebhookEvent

**Table Name**: `merch_webhook_events`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| provider | String | STRIPE, PRODIGI, PRINTFUL |
| eventId | String | External event ID for deduplication |
| eventType | String |  |
| processed | Boolean |  |
| payload | Json |  |
| processedAt | DateTime? |  |
| createdAt | DateTime |  |

---

### ExternalAgentSession

**Table Name**: `external_agent_sessions`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| externalId | String | e.g., "sessions/abc123" from Jules |
| provider | AgentProvider |  |
| name | String | Task name/title |
| description | String? | Task description |
| status | ExternalAgentStatus |  |
| sourceRepo | String? | e.g., "sources/github/zerdos/spike-land-nextjs" |
| startingBranch | String? | e.g., "main" |
| outputBranch | String? | Branch created by agent |
| pullRequestUrl | String? | PR URL if created |
| planSummary | String? | Summary of agent's plan |
| planApprovedAt | DateTime? |  |
| lastActivityAt | DateTime? |  |
| errorMessage | String? |  |
| metadata | Json? | Additional provider-specific data |
| createdAt | DateTime |  |
| updatedAt | DateTime |  |
| activities | AgentSessionActivity[] |  |

---

### AgentSessionActivity

**Table Name**: `agent_session_activities`

| Column | Type | Description |
|---|---|---|
| id | String | Primary Key |
| sessionId | String |  |
| externalId | String? | Activity ID from provider |
| type | String | e.g., "user_message", "plan_generated", "code_committed" |
| content | String? | Activity content/description |
| metadata | Json? |  |
| createdAt | DateTime |  |

**Relationships**:
- `session`: ExternalAgentSession

---

## Relationships Summary

### One-to-Many Relationships

(See "Models" section for per-table relationship details)

### Self-Referencing Relationships

1. **App → App** (forkedFrom)
   - An app can be forked from another app
   - Set null on parent delete (preserves fork history)

## Database Constraints

### Primary Keys

- All models use CUID (Collision-resistant Unique Identifier)
- CUIDs are URL-safe, sortable, and globally unique

### Foreign Keys

- All foreign keys have defined cascade/set null behavior
- Cascade delete used for dependent data (sessions, apps, requirements)
- Set null used for optional references (app forks)

### Unique Constraints

- User email (nullable unique)
- Account (provider + providerAccountId)
- Session sessionToken
- App domain (nullable unique)
- VerificationToken token and (identifier + token)

### Check Constraints

None currently defined. Consider adding:

- Price must be positive
- Version must be positive
- Email format validation

## Indexes Strategy

### Performance Indexes

- **Foreign Keys**: All foreign keys indexed for join performance
- **Status Fields**: Indexed for filtering active/draft apps
- **Priority**: Indexed for sorting requirements

### Composite Indexes

Consider adding for common query patterns:

```prisma
@@index([userId, status]) // User's active apps
@@index([appId, status])  // App's pending requirements
@@index([type, price])    // Pricing tier filtering
```

## Data Types

### String Types

- **CUID**: IDs (fixed length, efficient)
- **Text**: Long content (descriptions)
- **Varchar**: Short strings (names, tokens)

### Numeric Types

- **Decimal(10,2)**: Prices (avoids floating-point errors)
- **Int**: Counters, timestamps, versions

### Date/Time Types

- **DateTime**: All timestamps (UTC stored)

### Array Types

- **String[]**: Feature lists (PostgreSQL native array)

## Security Considerations

### Sensitive Data

- **Access Tokens**: Stored as TEXT, should be encrypted at rest
- **Refresh Tokens**: Stored as TEXT, should be encrypted at rest
- **Session Tokens**: Should be treated as secrets
- **Verification Tokens**: Single-use, time-limited

### Recommendations

1. Enable PostgreSQL encryption at rest
2. Use SSL/TLS for database connections
3. Implement row-level security (RLS) for multi-tenant scenarios
4. Audit access to tokens table
5. Implement token rotation for long-lived sessions

## Performance Considerations

### Query Optimization

- Use `select` to limit returned fields
- Use `include` judiciously (avoid N+1 queries)
- Implement pagination for large result sets
- Consider adding database-level limits

### Connection Pooling

- Use PgBouncer or Prisma's connection pooling
- Recommended pool size: 10-20 connections
- Set appropriate timeouts

### Caching Strategy

- Cache frequently accessed, rarely changed data
- Use Redis for session caching
- Implement cache invalidation strategy

## Scalability

### Vertical Scaling

- Current schema supports 100K+ users
- Add read replicas for read-heavy workloads
- Consider table partitioning for very large tables

### Horizontal Scaling

- Schema designed for sharding by userId
- Consider separate databases for different app domains
- Use connection pooling for serverless deployments

## Migration Strategy

### Backward Compatibility

- Always add nullable columns first
- Backfill data before making columns required
- Use multi-step migrations for breaking changes

### Zero-Downtime Deployments

1. Add new column (nullable)
2. Deploy code that writes to both columns
3. Backfill old data
4. Deploy code that reads from new column
5. Make column required
6. Remove old column (optional)

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed procedures.

## Future Enhancements

### Planned Features

- [ ] Audit log table for tracking changes
- [ ] Notification preferences table
- [ ] App collaboration (multiple owners)
- [ ] App analytics/metrics table
- [ ] Payment transactions table
- [ ] App categories and tags
- [ ] User roles and permissions

### Schema Evolution

- Consider adding `deletedAt` for soft deletes
- Add `archivedAt` for archival tracking
- Implement versioning for apps
- Add metadata JSONB column for extensibility

## Appendix

### Sample Queries

**Get user with all apps:**

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    apps: {
      include: {
        requirements: true,
        monetizationModels: true,
      },
    },
  },
});
```

**Get active apps with pending requirements:**

```typescript
const apps = await prisma.app.findMany({
  where: {
    status: "ACTIVE",
    requirements: {
      some: {
        status: "PENDING",
        priority: { in: ["HIGH", "CRITICAL"] },
      },
    },
  },
  include: {
    requirements: {
      where: { status: "PENDING" },
      orderBy: { priority: "desc" },
    },
  },
});
```

**Get app with fork hierarchy:**

```typescript
const app = await prisma.app.findUnique({
  where: { id: appId },
  include: {
    parentApp: true, // Parent if this is a fork
    forks: { // All forks of this app
      include: {
        user: true,
      },
    },
  },
});
```

### Database Statistics

Run these queries to analyze database:

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Version History

- **v1.0.0** (2025-01-23): Initial schema with User, App, Requirement,
  MonetizationModel
