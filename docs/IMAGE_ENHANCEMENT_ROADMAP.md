# Image Enhancement App - Implementation Roadmap

This document outlines the phased implementation plan for the Image Enhancement
App, organized by priority and dependencies.

---

## Overview

The implementation is divided into 5 phases, each building upon the previous.
Each phase has clear deliverables and success criteria.

```
Phase 1 (MVP)         Phase 2              Phase 3              Phase 4              Phase 5
[Core Features]  -->  [Token Economy]  --> [Albums & Export] --> [Referral]      --> [Dashboard]
     |                     |                    |                    |                   |
   Upload             All 3 Tiers          Album CRUD          Simple Referral     Analytics
   Single Tier        Stripe Checkout      Export Formats      Fraud Prevention    Admin Tools
   Comparison         Balance Mgmt         Version History     Tracking            Monitoring
```

---

## Phase 1: MVP (Core Features)

**Goal:** Validate core value proposition - users can upload and enhance images
with AI.

### Deliverables

| Feature                 | Description                          | Status   |
| ----------------------- | ------------------------------------ | -------- |
| Image Upload UI         | Single image upload with drag-drop   | Required |
| Upload to R2            | Store originals in Cloudflare R2     | Required |
| Single-Tier Enhancement | TIER_1K (1024px) only                | Required |
| Gemini Integration      | AI enhancement via Google Gemini API | Required |
| Before/After Comparison | Side-by-side slider component        | Required |
| Download Enhanced       | Download enhanced image              | Required |
| Basic Error Handling    | User-friendly error messages         | Required |
| Authentication          | Login required for enhancement       | Required |

### Technical Tasks

```
[ ] Create /enhance page with upload zone
[ ] Implement R2 upload handler (src/lib/storage/upload-handler.ts exists)
[ ] Create enhancement job API route (/api/enhance)
[ ] Integrate Gemini client for image processing
[ ] Build ImageComparisonSlider component (exists)
[ ] Add download functionality
[ ] Connect to existing auth (NextAuth)
[ ] Basic loading states and error handling
```

### Database Models Used

- `User` (existing)
- `EnhancedImage`
- `ImageEnhancementJob`
- `UserTokenBalance` (basic balance check)

### Success Criteria

- User can upload image and receive enhanced version
- Enhancement completes in < 30 seconds
- Download works correctly
- Error states are handled gracefully

### Dependencies

- Cloudflare R2 credentials configured
- Google Gemini API key configured
- NextAuth working

---

## Phase 2: Token Economy

**Goal:** Enable monetization through token purchases and all enhancement tiers.

### Deliverables

| Feature               | Description                        | Status   |
| --------------------- | ---------------------------------- | -------- |
| All Enhancement Tiers | TIER_1K, TIER_2K, TIER_4K          | Required |
| Token Balance Display | Show balance in header/sidebar     | Required |
| Stripe Checkout       | Purchase token packages            | Required |
| Low Balance Warnings  | Alert when tokens running low      | Required |
| Transaction History   | View past token transactions       | Required |
| Failed Job Refunds    | Auto-refund on enhancement failure | Required |
| Token Regeneration    | 1 token per 15 min (max 100)       | Required |

### Technical Tasks

```
[ ] Enable tier selection in enhancement UI
[ ] Build token balance component (header widget)
[ ] Create Stripe checkout flow (/api/checkout)
[ ] Implement webhook handler (/api/webhooks/stripe)
[ ] Build transaction history page
[ ] Add auto-refund logic for FAILED jobs
[ ] Implement token regeneration cron/scheduled task
[ ] Add low-balance toast notifications
```

### Database Models Used

- `UserTokenBalance`
- `TokenTransaction`
- `TokensPackage`
- `StripePayment`

### Token Costs (from `src/lib/tokens/costs.ts`)

| Tier    | Max Dimension | Cost      |
| ------- | ------------- | --------- |
| TIER_1K | 1024px        | 2 tokens  |
| TIER_2K | 2048px        | 5 tokens  |
| TIER_4K | 4096px        | 10 tokens |

### Token Packages (from `src/lib/stripe/client.ts`)

| Package | Tokens | Price |
| ------- | ------ | ----- |
| Starter | 10     | 2.99  |
| Basic   | 50     | 9.99  |
| Pro     | 150    | 24.99 |
| Power   | 500    | 69.99 |

### Success Criteria

- Users can select any tier before enhancement
- Token balance updates after purchase
- Stripe payments process successfully
- Failed jobs auto-refund tokens
- Transaction history shows all activity

### Dependencies

- Phase 1 complete
- Stripe account configured
- Webhook endpoint deployed

---

## Phase 3: Albums & Export

**Goal:** Enable users to organize images and export in multiple formats.

**Status:** COMPLETE

### Deliverables

| Feature            | Description                    | Status       |
| ------------------ | ------------------------------ | ------------ |
| Album Creation     | Create/edit/delete albums      | [x] COMPLETE |
| Album Organization | Add/remove images from albums  | [x] COMPLETE |
| Album Sharing      | Unlisted links for sharing     | [x] COMPLETE |
| Export Formats     | PNG, JPEG, WebP export options | [x] COMPLETE |
| Version History    | View all enhancement versions  | [x] COMPLETE |
| Batch Upload       | Upload multiple images at once | [x] COMPLETE |
| Batch Enhancement  | Enhance multiple images        | [x] COMPLETE |

### Technical Tasks

```
[x] Create album management UI (/my-albums)
[x] Build album detail page with image grid
[x] Implement share link generation
[x] Add export format selector
[x] Build version history component
[x] Create batch upload component
[x] Add batch enhancement queue
[x] Album cover image selection
```

### Completion Notes

- Batch upload endpoint (`POST /api/images/batch-upload`)
- Batch enhancement endpoint (`POST /api/images/batch-enhance`)
- Image export endpoint (`POST /api/images/export`)
- Version history endpoint (`GET /api/images/[id]/versions`)
- Album management fully functional with CRUD operations

### Database Models Used

- `Album`
- `AlbumImage`
- `EnhancedImage` (isPublic, viewCount)

### Privacy Levels

| Level    | Visibility        | Use Case           |
| -------- | ----------------- | ------------------ |
| PRIVATE  | Owner only        | Personal photos    |
| UNLISTED | Via share link    | Share with friends |
| PUBLIC   | Listed in gallery | Portfolio showcase |

### Success Criteria

- Users can create and organize albums
- Share links work for unlisted albums
- Export downloads correct format
- Version history shows all enhancements of an image
- Batch operations work reliably

### Dependencies

- Phase 2 complete
- R2 storage for multiple formats

---

## Phase 4: Referral Program

**Goal:** Grow user base through word-of-mouth referrals.

**Status:** COMPLETE

### Simplified Approach (Per PR Review Recommendation)

Instead of 30% lifetime commission (complex, fraud-prone), implemented:

**Phase 4: Simple Referral**

- "Refer a friend, both get 50 free tokens"
- One-time reward per referral
- Simple tracking
- Low fraud risk

### Deliverables

| Feature             | Description                         | Status       |
| ------------------- | ----------------------------------- | ------------ |
| Referral Link       | Unique link per user                | [x] COMPLETE |
| Sign-up Attribution | Track referrer on registration      | [x] COMPLETE |
| Token Rewards       | 50 tokens each (referrer + referee) | [x] COMPLETE |
| Referral Dashboard  | View referral stats                 | [x] COMPLETE |
| Anti-Fraud Basic    | Prevent self-referrals              | [x] COMPLETE |

### Technical Tasks

```
[x] Add referralCode field to User model
[x] Create referral link generator
[x] Track referrer in sign-up flow
[x] Grant tokens on successful referral
[x] Build referral stats page
[x] Add basic fraud checks (IP, email domain)
```

### Completion Notes

- Referral link generation endpoint (`GET /api/referral/link`)
- Referral stats endpoint (`GET /api/referral/stats`)
- Referral tracking via sign-up flow
- Basic fraud prevention (IP-based, email domain verification)
- Automatic token grants on referral completion (50 tokens each)

### Anti-Fraud Measures

- Prevent same IP referrals
- Block disposable email domains
- Require email verification
- Rate limit referral rewards

### Success Criteria

- Users can share referral links
- Both parties receive tokens on sign-up
- Basic fraud is prevented
- Dashboard shows referral stats

### Dependencies

- Phase 2 complete (token system)
- Email verification in place

---

## Phase 5: Admin Dashboard

**Goal:** Provide analytics and admin tools for platform management.

**Status:** COMPLETE

### Deliverables

| Feature         | Description                       | Status       |
| --------------- | --------------------------------- | ------------ |
| User Analytics  | Registrations, MAU, retention     | [x] COMPLETE |
| Token Economics | Purchases, usage, burn rate       | [x] COMPLETE |
| System Health   | Job queue, failure rates          | [x] COMPLETE |
| Admin Tools     | User management, voucher creation | [x] COMPLETE |
| Event Tracking  | Console errors, performance       | [x] COMPLETE |
| Legal Pages     | Terms, Privacy, Contact           | [x] COMPLETE |

### Technical Tasks

```
[x] Create /admin route (role-gated)
[x] Build analytics dashboard components
[x] Implement metrics aggregation queries
[x] Create voucher management UI
[x] Add user search/management
[x] Build job queue monitoring
[x] Add error tracking integration (structured logging)
[x] Create legal pages (Terms of Service, Privacy Policy, Contact)
```

### Completion Notes

- Admin analytics endpoints:
  - `GET /api/admin/analytics/users` - User metrics and growth
  - `GET /api/admin/analytics/tokens` - Token economy analysis
  - `GET /api/admin/system/health` - System health status
- Admin management endpoints:
  - `GET /api/admin/users` - User search and management
  - `POST /api/admin/vouchers` - Voucher creation and management
- Legal pages implemented with proper compliance
- Email infrastructure integrated (Resend for transactional emails)

### Metrics to Track

**User Metrics:**

- Daily/weekly/monthly registrations
- Active users (DAU/MAU)
- User retention curves
- Conversion rate (free -> paid)

**Token Metrics:**

- Tokens purchased vs. spent
- Average tokens per user
- Revenue per user (ARPU)
- Token regeneration usage

**System Metrics:**

- Enhancement jobs per hour
- Average processing time
- Failure rate by tier
- Queue depth

### Success Criteria

- Admin can view key metrics
- Voucher creation works
- User management functional
- System health visible

### Dependencies

- All previous phases complete
- Role-based access control

---

## Timeline Overview

| Phase   | Focus           | Effort Estimate   |
| ------- | --------------- | ----------------- |
| Phase 1 | MVP             | Foundation        |
| Phase 2 | Token Economy   | Core monetization |
| Phase 3 | Albums & Export | User value        |
| Phase 4 | Referral        | Growth            |
| Phase 5 | Dashboard       | Operations        |

**Note:** Per CLAUDE.md guidelines, no specific time estimates are provided.
Work is broken into actionable steps for team scheduling.

---

## Risk Mitigation

### Technical Risks

| Risk                      | Mitigation                         |
| ------------------------- | ---------------------------------- |
| Gemini API rate limits    | Implement queue with backoff       |
| R2 storage costs at scale | Monitor usage, set alerts          |
| Stripe webhook failures   | Idempotent handlers, retry logic   |
| Large image processing    | File size limits, async processing |

### Business Risks

| Risk                | Mitigation                                |
| ------------------- | ----------------------------------------- |
| Low conversion rate | A/B test pricing, free tier               |
| High churn          | Email re-engagement, feature improvements |
| Referral fraud      | Start simple, add verification            |
| Support burden      | Self-service tools, good error messages   |

---

## Feature Dependency Graph

```
Auth (existing)
    |
    v
Phase 1: MVP
    |
    +---> Phase 2: Token Economy
    |         |
    |         v
    |    Phase 3: Albums & Export
    |         |
    |         +---> Phase 4: Referral
    |                   |
    v                   v
                   Phase 5: Dashboard
```

---

## Related Documentation

- [Vision Document](./IMAGE_ENHANCEMENT_VISION.md) - Product vision and features
- [Database Schema](./IMAGE_ENHANCEMENT_SCHEMA.md) - Data models
- [Suggestions](./IMAGE_ENHANCEMENT_SUGGESTIONS.md) - Future feature ideas
- [Privacy & Compliance](./IMAGE_ENHANCEMENT_PRIVACY.md) - Legal requirements
