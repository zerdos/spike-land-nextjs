# Spike Land - Feature Documentation

> **Last Updated**: December 2025
> **Status**: Pixel App Complete (Phases 1-5) | Platform Phase 2 Complete

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Pixel - AI Image Enhancement App](#pixel---ai-image-enhancement-app)
3. [Platform Features](#platform-features)
4. [Roadmap & Future Plans](#roadmap--future-plans)
5. [Technical Stack](#technical-stack)
6. [Database Schema](#database-schema)

---

## Platform Overview

**Spike Land** is an AI-powered app platform that democratizes software development by enabling anyone to create, modify, and deploy applications using natural language requirements and AI agents.

### Core Vision

- Anyone can create apps without coding knowledge
- AI agents build apps based on user requirements
- Users can fork and modify existing apps
- Apps generate revenue through flexible monetization models
- External domains host successful apps independently

---

## Pixel - AI Image Enhancement App

**URL**: [pixel.spike.land](https://pixel.spike.land)

Pixel is the flagship AI-powered image enhancement application on the Spike Land platform. All 5 implementation phases are complete.

### Phase 1: MVP ✅ Complete

| Feature             | Status      | Description                       |
| ------------------- | ----------- | --------------------------------- |
| Image Upload        | ✅ Complete | Drag-drop UI with preview         |
| AI Enhancement      | ✅ Complete | Single-tier enhancement (TIER_1K) |
| Before/After Slider | ✅ Complete | Interactive comparison view       |
| Download            | ✅ Complete | Export enhanced images            |
| Auth Integration    | ✅ Complete | NextAuth authentication           |

### Phase 2: Token Economy ✅ Complete

| Feature                | Status      | Description                          |
| ---------------------- | ----------- | ------------------------------------ |
| Multi-tier Enhancement | ✅ Complete | TIER_1K, TIER_2K, TIER_4K options    |
| Token Balance System   | ✅ Complete | Auto-regeneration (1 per 15 min)     |
| Stripe Integration     | ✅ Complete | One-time purchases and subscriptions |
| Transaction History    | ✅ Complete | Full token transaction log           |
| Low Balance Warnings   | ✅ Complete | User notifications                   |
| Refunds on Failure     | ✅ Complete | Automatic token refund               |

### Phase 3: Albums & Export ✅ Complete

| Feature           | Status      | Description                      |
| ----------------- | ----------- | -------------------------------- |
| Album Management  | ✅ Complete | Create, edit, delete albums      |
| Batch Upload      | ✅ Complete | Multiple image upload            |
| Album Sharing     | ✅ Complete | Unlisted links with share tokens |
| Export Formats    | ✅ Complete | JPEG, PNG, WebP support          |
| Version History   | ✅ Complete | Track enhancement versions       |
| Batch Enhancement | ✅ Complete | Queue processing                 |

### Phase 4: Referral Program ✅ Complete

| Feature              | Status      | Description                        |
| -------------------- | ----------- | ---------------------------------- |
| Referral Links       | ✅ Complete | Unique per-user referral codes     |
| Token Rewards        | ✅ Complete | 50 tokens for referrer and referee |
| Referral Dashboard   | ✅ Complete | Statistics and tracking            |
| Anti-fraud Measures  | ✅ Complete | IP-based and email verification    |
| Attribution Tracking | ✅ Complete | Sign-up source tracking            |

### Phase 5: Admin Dashboard ✅ Complete

| Feature              | Status      | Description                   |
| -------------------- | ----------- | ----------------------------- |
| User Analytics       | ✅ Complete | Registrations, MAU, retention |
| Token Analytics      | ✅ Complete | Purchases, spend, burn rate   |
| System Health        | ✅ Complete | Job queue, failure rates      |
| Admin Tools          | ✅ Complete | User search, voucher creation |
| Legal Pages          | ✅ Complete | Terms, Privacy, Contact       |
| Email Infrastructure | ✅ Complete | Resend integration            |

**Key Files:**

- `src/app/enhance/` - Enhancement pages
- `src/app/albums/` - Album management
- `src/app/pricing/` - Token pricing
- `src/app/referrals/` - Referral program
- `src/app/admin/` - Admin dashboard
- `src/components/enhance/` - Enhancement UI components
- `src/components/tokens/` - Token system components

---

## Platform Features

### 1. Authentication System

| Feature                 | Status      | Description                             |
| ----------------------- | ----------- | --------------------------------------- |
| NextAuth.js Integration | ✅ Complete | Multi-provider authentication framework |
| GitHub OAuth            | ✅ Complete | Sign in with GitHub account             |
| Google OAuth            | ✅ Complete | Sign in with Google account             |
| Phone Authentication    | ✅ Complete | Twilio-based phone verification         |
| Session Management      | ✅ Complete | Secure Prisma-based session storage     |
| Protected Routes        | ✅ Complete | Route guards for authenticated pages    |

**Key Files:**

- `src/auth.ts` - NextAuth configuration
- `src/app/auth/signin/page.tsx` - Sign in page
- `src/components/auth/` - Auth UI components

### 2. My Apps Dashboard

| Feature             | Status      | Description                              |
| ------------------- | ----------- | ---------------------------------------- |
| Protected Dashboard | ✅ Complete | Authentication-required app management   |
| App Listing         | ✅ Complete | Grid view of user's apps                 |
| Empty State         | ✅ Complete | Onboarding UI for new users              |
| Status Badges       | ✅ Complete | Visual status indicators (DRAFT, ACTIVE) |
| App Cards           | ✅ Complete | Rich app preview cards                   |
| Create App Button   | ✅ Complete | Navigation to app wizard                 |

**Key Files:**

- `src/app/my-apps/page.tsx` - Dashboard page
- `src/components/apps/app-card.tsx` - App card component

### 3. App Creation Wizard

| Feature              | Status      | Description                         |
| -------------------- | ----------- | ----------------------------------- |
| Multi-Step Form      | ✅ Complete | Guided app creation flow            |
| App Details Step     | ✅ Complete | Name, description input             |
| Requirements Step    | ✅ Complete | Natural language requirements input |
| Monetization Step    | ✅ Complete | Pricing model selection             |
| Review Step          | ✅ Complete | Summary before creation             |
| Database Persistence | ✅ Complete | Save apps to PostgreSQL             |

**Key Files:**

- `src/app/my-apps/new/page.tsx` - Wizard page
- `src/components/apps/requirements-manager.tsx` - Requirements UI

### 4. Database Layer

| Feature           | Status      | Description                     |
| ----------------- | ----------- | ------------------------------- |
| Prisma ORM        | ✅ Complete | Type-safe database access       |
| PostgreSQL        | ✅ Complete | Production database             |
| User Model        | ✅ Complete | OAuth-linked user accounts      |
| App Model         | ✅ Complete | App metadata and status         |
| Requirement Model | ✅ Complete | Version-controlled requirements |
| MonetizationModel | ✅ Complete | Pricing configuration           |
| Forking Support   | ✅ Complete | App forking relationships       |

**Key Files:**

- `prisma/schema.prisma` - Database schema
- `src/lib/prisma.ts` - Prisma client

### 5. UI/UX Foundation

| Feature              | Status      | Description                 |
| -------------------- | ----------- | --------------------------- |
| shadcn/ui Components | ✅ Complete | Production-ready UI library |
| Dark/Light Mode      | ✅ Complete | Theme toggle support        |
| Responsive Design    | ✅ Complete | Mobile-first layouts        |
| Loading Skeletons    | ✅ Complete | Graceful loading states     |
| Cookie Consent       | ✅ Complete | GDPR-compliant consent      |

**Key Files:**

- `src/components/ui/` - shadcn/ui components
- `src/components/theme/` - Theme components
- `src/components/skeletons/` - Loading states

### 6. Developer Experience

| Feature                 | Status      | Description               |
| ----------------------- | ----------- | ------------------------- |
| TypeScript Strict Mode  | ✅ Complete | Full type safety          |
| 100% Test Coverage      | ✅ Complete | Vitest + RTL tests        |
| E2E Testing             | ✅ Complete | Playwright + Cucumber BDD |
| CI/CD Pipeline          | ✅ Complete | GitHub Actions automation |
| Vercel Deployment       | ✅ Complete | Production hosting        |
| Claude Code Integration | ✅ Complete | AI-assisted development   |

---

## Roadmap & Future Plans

### Platform Development Phases

#### Phase 1: Authentication & Foundation ✅ COMPLETE

- [x] NextAuth setup (GitHub, Google, Phone)
- [x] Protected routes
- [x] User profiles
- [x] Settings page

#### Phase 2: My Apps Platform ✅ COMPLETE (Demonstrated with Pixel)

- [x] "My Apps" protected section
- [x] App creation wizard
- [x] Fork functionality
- [x] Requirements management UI
- [x] Database schema for apps & requirements

#### Phase 3: AI Agent Integration - FUTURE

| Task                          | Priority | Status  |
| ----------------------------- | -------- | ------- |
| AI agent orchestration system | High     | Planned |
| Requirement-to-code pipeline  | High     | Planned |
| Automated app generation      | High     | Planned |
| Quality assurance & testing   | Medium   | Planned |

#### Phase 4: Deployment & Hosting - FUTURE

| Task                  | Priority | Status  |
| --------------------- | -------- | ------- |
| App deployment system | High     | Planned |
| Custom domain support | Medium   | Planned |
| External hosting      | Medium   | Planned |

#### Phase 5: Platform Monetization - FUTURE

| Task                      | Priority | Status  |
| ------------------------- | -------- | ------- |
| Platform fee on paid apps | High     | Planned |
| Premium features          | Medium   | Planned |
| White-label solutions     | Low      | Planned |

### Pixel App - December 2025 Launch

| Task                                 | Status              |
| ------------------------------------ | ------------------- |
| Feedback system (bug/idea reporting) | In Progress         |
| Individual image sharing             | In Progress         |
| Landing page improvements            | Planned             |
| UTM tracking                         | Planned             |
| Product Hunt launch                  | Planned (Dec 16-18) |

---

## Technical Stack

### Frontend

| Technology   | Version | Purpose                         |
| ------------ | ------- | ------------------------------- |
| Next.js      | 15.x    | React framework with App Router |
| TypeScript   | 5.x     | Type-safe JavaScript            |
| Tailwind CSS | 4.x     | Utility-first CSS               |
| shadcn/ui    | Latest  | UI component library            |
| next-themes  | 0.4.x   | Dark mode support               |

### Backend

| Technology  | Version  | Purpose             |
| ----------- | -------- | ------------------- |
| NextAuth.js | 5.x beta | Authentication      |
| Prisma      | 6.x      | Database ORM        |
| PostgreSQL  | 17.x     | Production database |

### Testing

| Technology            | Version | Purpose            |
| --------------------- | ------- | ------------------ |
| Vitest                | 3.x     | Unit testing       |
| React Testing Library | Latest  | Component testing  |
| Playwright            | Latest  | E2E testing        |
| Cucumber              | Latest  | BDD test scenarios |

### DevOps

| Technology     | Purpose                 |
| -------------- | ----------------------- |
| GitHub Actions | CI/CD automation        |
| Vercel         | Production hosting      |
| Cloudflare     | DNS management          |
| Claude Code    | AI-assisted development |

---

## Database Schema

### Core Models

See `prisma/schema.prisma` for the complete schema. Key models:

#### User & Authentication

- `User` - User accounts with role (USER/ADMIN/SUPER_ADMIN), referral info
- `Account` - OAuth provider accounts
- `Session` - User sessions
- `VerificationToken` - Email verification

#### Platform Apps

- `App` - User-created applications with status
- `Requirement` - App requirements with priority and status
- `MonetizationModel` - Pricing configuration

#### Image Enhancement (Pixel)

- `EnhancedImage` - Uploaded images with metadata and shareToken
- `ImageEnhancementJob` - Enhancement jobs with tier, status, results

#### Token Economy

- `UserTokenBalance` - User token balance with regeneration
- `TokenTransaction` - Token movements (earn/spend/refund)
- `TokensPackage` - Purchasable token packages
- `StripePayment` - Payment records
- `Subscription` - Recurring subscriptions
- `SubscriptionPlan` - Subscription tiers

#### Albums & Organization

- `Album` - Image albums with privacy settings
- `AlbumImage` - Album-image associations with sort order

#### Growth & Admin

- `Voucher` - Promotional codes
- `VoucherRedemption` - Voucher usage tracking
- `Referral` - Referral relationships and rewards
- `AuditLog` - Admin action logging
- `Feedback` - User feedback (bug reports, ideas)

---

## Getting Started

### Development Setup

```bash
# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development server
yarn dev
```

### Running Tests

```bash
# Unit tests (watch mode)
yarn test

# Unit tests with coverage (100% required)
yarn test:coverage

# E2E tests (requires dev server)
yarn dev
yarn test:e2e:local
```

---

## Contributing

1. Create a feature branch from `main`
2. Implement changes with tests (100% coverage required)
3. Create PR and wait for CI checks
4. Merge when all checks pass

For detailed development guidelines, see [CLAUDE.md](../CLAUDE.md).
