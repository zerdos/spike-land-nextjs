# Image Enhancement App - Vision Document

> **Note**: This document is only editable by the project owner or upon explicit request.

---

## Overview

The Image Enhancement App is an AI-powered platform that allows users to upload photos and albums, enhance their quality using advanced AI models, and compare/export the improved versions.

---

## Platform Integration

### How This Fits Into Spike Land

The Image Enhancement App serves multiple roles within the Spike Land ecosystem:

1. **Showcase Application**: Demonstrates platform capabilities to visitors, showing what AI-powered apps can achieve
2. **Template App**: Can be forked by users in Phase 3 to create specialized variations (e.g., portrait-focused, product photography)
3. **Revenue Generator**: Generates platform revenue through token sales
4. **Technical Reference**: Provides integration patterns for future apps built on the platform

### Integration with Existing Infrastructure

| Component      | Status     | Details                                                                  |
| -------------- | ---------- | ------------------------------------------------------------------------ |
| Authentication | Integrated | Uses NextAuth.js (GitHub, Google OAuth)                                  |
| Database       | Integrated | Prisma schema with 19 models (`prisma/schema.prisma`)                    |
| Storage        | Integrated | Cloudflare R2 for image storage (`src/lib/storage/r2-client.ts`)         |
| Payments       | Integrated | Stripe for token packages and subscriptions (`src/lib/stripe/client.ts`) |
| AI             | Integrated | Google Gemini for image enhancement (`src/lib/ai/gemini-client.ts`)      |
| Tokens         | Integrated | Balance management (`src/lib/tokens/balance-manager.ts`)                 |
| Vouchers       | Integrated | Redemption system (`src/lib/vouchers/voucher-manager.ts`)                |

### Relationship to Platform Vision

From CLAUDE.md:

> "Spike Land is an innovative platform that democratizes app development by connecting users with AI agents to create, modify, and deploy applications on demand."

The Image Enhancement App is:

- **Phase 2 deliverable**: A working example app for the "My Apps" section
- **Forkable template**: Users can clone and customize for their needs
- **Revenue model demo**: Shows token-based monetization in action

---

## Core Features

### 1. Image Upload & Management

- **Single & Batch Upload**: Upload individual photos or entire albums
- **Supported Formats**: JPEG, PNG, WebP
- **Album Organization**: Group photos into albums for batch processing
- **Cloud Storage**: Secure storage on R2 (Cloudflare)

### 2. AI-Powered Enhancement

- **Three Quality Tiers**:
  | Tier | Max Resolution | Token Cost |
  | ---- | -------------- | ---------- |
  | 1K   | 1024px         | 2 tokens   |
  | 2K   | 2048px         | 5 tokens   |
  | 4K   | 4096px         | 10 tokens  |

- **Aspect Ratio Preservation**: Original proportions maintained
- **Quality Output**: JPEG at 95% quality
- **Batch Enhancement**: Process multiple images in queue

### 3. Comparison & Export

- **Interactive Slider**: Side-by-side before/after comparison
- **Version History**: View all enhancement versions per image
- **Export Options**: Download enhanced images individually or in bulk
- **Multiple Formats**: Export as JPEG, PNG, or WebP

---

## Token Economy

### Token System

- Users consume tokens for each enhancement
- Token balance displayed in real-time
- Low balance warnings when < 5 tokens
- Refunds issued automatically on failed enhancements

### Token Packages (Stripe Integration)

Users can purchase token packages via Stripe:

| Package | Tokens | Price (USD) |
| ------- | ------ | ----------- |
| Starter | 50     | $4.99       |
| Pro     | 150    | $12.99      |
| Power   | 500    | $39.99      |

_Prices and packages are configurable_

### Token Pricing Rationale

Our pricing is based on three factors:

**1. Cost Structure**

| Component            | Cost per Enhancement |
| -------------------- | -------------------- |
| Gemini API call      | ~$0.01-0.05          |
| R2 storage (90 days) | ~$0.001              |
| Processing overhead  | ~$0.01               |
| **Total cost**       | ~$0.02-0.07          |

**2. Value-Based Pricing**

| Tier           | Token Cost | User Pays          | Margin |
| -------------- | ---------- | ------------------ | ------ |
| 1K (2 tokens)  | $0.20      | ~$0.15 actual cost | 25%    |
| 2K (5 tokens)  | $0.50      | ~$0.25 actual cost | 50%    |
| 4K (10 tokens) | $1.00      | ~$0.50 actual cost | 50%    |

Higher tiers have better margins due to higher perceived value.

**3. Competitive Analysis**

| Competitor      | Price per Image      | Our Price   |
| --------------- | -------------------- | ----------- |
| Topaz Gigapixel | $99 one-time         | Pay-per-use |
| Adobe Enhance   | $9.99/month          | Pay-per-use |
| Let's Enhance   | $9/month (10 images) | ~$0.20-1.00 |

Our model offers flexibility without monthly commitment.

### Voucher / Promo Codes

- **Fixed Tokens**: Grant a set number of free tokens
- **Percentage Bonus**: Extra tokens on purchase (e.g., +20%)
- **Trial Codes**: Limited-time access to premium features
- **Unique Redemption**: One use per user per code

---

## Referral Program

### Phase 1: Simple Referral (MVP)

A straightforward referral system focused on growth with minimal fraud risk:

**How It Works:**

1. Each user gets a **unique referral link**
2. Users share link on social media, blogs, etc.
3. When a new user registers via the link:
   - Referrer receives **50 free tokens**
   - New user receives **50 free tokens**

| Event              | Referrer Gets | Referee Gets |
| ------------------ | ------------- | ------------ |
| Successful sign-up | 50 tokens     | 50 tokens    |

**Anti-Fraud Measures:**

- One reward per referral relationship
- Prevent same-IP referrals
- Block disposable email domains
- Require email verification before reward

### Phase 2: Commission-Based (Future)

After validating economics and implementing fraud prevention infrastructure, consider:

| Model              | Details                 | Risk Level |
| ------------------ | ----------------------- | ---------- |
| Simple (Phase 1)   | Fixed token reward      | Low        |
| Tiered (Future)    | 10% first purchase only | Medium     |
| Recurring (Future) | 5-10% ongoing, capped   | High       |

**Prerequisites for Phase 2:**

- [ ] Fraud detection system
- [ ] Payout infrastructure (Stripe Connect)
- [ ] Unit economics validation
- [ ] Legal review of affiliate terms

_Note: Original 30% lifetime commission was reconsidered due to fraud risk and margin impact._

---

## Developer Dashboard

### Purpose

A dedicated dashboard for monitoring app health, user activity, and debugging issues.

### Features

- **Event Tracking**: All user actions logged (uploads, enhancements, purchases)
- **Console Errors**: Real-time error capture from client-side
- **Performance Metrics**: Page load times, API response times
- **User Analytics**: Active users, retention, conversion rates
- **Token Economics**: Token circulation, purchase patterns, refund rates
- **System Health**: API uptime, job queue status, storage usage

### Access

- Admin-only access
- Role-based permissions for team members

---

## User Journey

```
1. Visit Landing Page
   └── View demo & pricing

2. Sign Up / Login
   └── OAuth (GitHub, Google) or Phone

3. Upload Images
   └── Single or batch upload
   └── Organize into albums

4. Enhance Images
   └── Select tier (1K, 2K, 4K)
   └── Confirm token cost
   └── Wait for processing

5. Compare Results
   └── Use comparison slider
   └── View all versions

6. Export
   └── Download enhanced images
   └── Bulk export albums

7. Purchase More Tokens
   └── Select package
   └── Pay via Stripe
   └── Apply voucher codes

8. Share & Earn
   └── Get referral link
   └── Share on social media
   └── Both get 50 free tokens
```

---

## Technical Architecture

### Current Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (via Neon)
- **Storage**: Cloudflare R2
- **AI**: Google Gemini API
- **Payments**: Stripe
- **Auth**: NextAuth.js (multi-provider)

### Future Considerations

- WebSocket for real-time job updates
- CDN for enhanced image delivery
- Queue system for batch processing (Bull/Redis)
- Analytics integration (PostHog, Mixpanel)

---

## Security & Privacy

- All images encrypted at rest
- User data protected (GDPR compliant)
- Secure payment processing via Stripe
- Rate limiting on all API endpoints
- Image ownership verification

---

## Success Metrics

| Metric                         | Target       |
| ------------------------------ | ------------ |
| User Registration              | 1,000/month  |
| Monthly Active Users           | 5,000        |
| Conversion Rate (free to paid) | 15%          |
| Average Revenue Per User       | $8/month     |
| Referral Program Participation | 20% of users |
| Enhancement Success Rate       | >99%         |

---

## Related Documentation

- [Database Schema](./IMAGE_ENHANCEMENT_SCHEMA.md) - Prisma models and relationships
- [Implementation Roadmap](./IMAGE_ENHANCEMENT_ROADMAP.md) - Phased development plan
- [Privacy & Compliance](./IMAGE_ENHANCEMENT_PRIVACY.md) - Data handling and GDPR
- [Feature Suggestions](./IMAGE_ENHANCEMENT_SUGGESTIONS.md) - Future feature ideas

---

_Last Updated: December 2024_
