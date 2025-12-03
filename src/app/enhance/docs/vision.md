# Image Enhancement App - Vision Document

> **Note**: This document is only editable by the project owner or upon explicit request.

---

## Overview

The Image Enhancement App is an AI-powered platform that allows users to upload photos and albums, enhance their quality using advanced AI models, and compare/export the improved versions.

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
  |------|----------------|------------|
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
|---------|--------|-------------|
| Starter | 50     | $4.99       |
| Pro     | 150    | $12.99      |
| Power   | 500    | $39.99      |

*Prices and packages are configurable*

### Voucher / Promo Codes

- **Fixed Tokens**: Grant a set number of free tokens
- **Percentage Bonus**: Extra tokens on purchase (e.g., +20%)
- **Trial Codes**: Limited-time access to premium features
- **Unique Redemption**: One use per user per code

---

## Referral / Affiliate Program

### How It Works

1. Each user gets a **unique referral link**
2. Users share link on social media, blogs, etc.
3. When a new user registers via the link:
   - New user is tagged as referred
   - Referrer earns **30% commission** on all future purchases by that user

### Commission Structure

| Event | Referrer Earns |
|-------|----------------|
| Referred user purchases tokens | 30% of purchase value |
| Recurring purchases | 30% (lifetime) |

### Payout System

- Minimum payout threshold: $25
- Payout methods: PayPal, Bank Transfer, Stripe Connect
- Monthly payout cycle

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
   └── Earn 30% commission
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

| Metric | Target |
|--------|--------|
| User Registration | 1,000/month |
| Monthly Active Users | 5,000 |
| Conversion Rate (free to paid) | 15% |
| Average Revenue Per User | $8/month |
| Referral Program Participation | 20% of users |
| Enhancement Success Rate | >99% |

---

*Last Updated: December 2024*
