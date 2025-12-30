# Spike Land - Feature Documentation

> **Last Updated**: December 30, 2025 | **Status**: Production Platform with Multiple Apps

---

## Quick Reference

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Production URL** | [https://spike.land](https://spike.land)                       |
| **Pixel App**      | [https://spike.land/apps/pixel](https://spike.land/apps/pixel) |
| **Company**        | SPIKE LAND LTD (UK Company #16906682)                          |
| **Status**         | Production Platform with Active Development                    |
| **Mobile App**     | iOS, Android, Web (Expo 52)                                    |
| **MCP Server**     | npm package @spike-npm-land/mcp-server                         |

---

## Related Documentation

| Topic              | Document                                                          |
| ------------------ | ----------------------------------------------------------------- |
| Token System       | [TOKEN_SYSTEM.md](./TOKEN_SYSTEM.md)                              |
| API Reference      | [API_REFERENCE.md](./API_REFERENCE.md)                            |
| Database Schema    | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)                        |
| Business Structure | [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md)                  |
| Pixel Pipelines    | [PIXEL_PIPELINES.md](./PIXEL_PIPELINES.md)                        |
| Mobile App         | [packages/mobile-app/README.md](../packages/mobile-app/README.md) |
| User Guide         | [USER_GUIDE.md](./USER_GUIDE.md)                                  |

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Pixel - AI Image Enhancement App](#pixel---ai-image-enhancement-app)
4. [Platform Features](#platform-features)
5. [E-Commerce](#e-commerce)
6. [Mobile App](#mobile-app-iosandroidweb)
7. [Other Apps & Features](#other-apps--features)
8. [MCP Server Integration](#mcp-server-integration)
9. [Browser Agent Boxes](#browser-agent-boxes)
10. [Analytics & Tracking](#analytics--tracking)
11. [Marketing & Campaigns](#marketing--campaigns)
12. [Image Enhancement Pipelines](#image-enhancement-pipelines)
13. [External Agent Integration](#external-agent-integration)
14. [API & Developer Tools](#api--developer-tools)
15. [Error Tracking & Monitoring](#error-tracking--monitoring)
16. [Cron Jobs & Automation](#cron-jobs--automation)
17. [Email System](#email-system)
18. [Roadmap & Future Plans](#roadmap--future-plans)
19. [Technical Stack](#technical-stack)
20. [Database Schema](#database-schema)

---

## Platform Overview

**Spike Land** is an AI-powered app platform that democratizes software development by enabling anyone to create, modify, and deploy applications using natural language requirements and AI agents.

### Core Vision

- Anyone can create apps without coding knowledge
- AI agents build apps based on user requirements
- Users can fork and modify existing apps
- Apps generate revenue through flexible monetization models
- External domains host successful apps independently

### Current Status

**Production Platform** - The platform is live and running multiple applications:

- **Pixel** - Flagship AI image enhancement app (all phases complete)
- **Audio Mixer** - Multi-track audio mixing and recording
- **Display** - Presentation and display apps
- **Music Creator** - Music creation tools
- **Blendr** - Image blending tool
- **E-commerce** - Full merch store with Prodigi integration
- **Mobile Apps** - iOS, Android, and Web (Expo)
- **MCP Server** - Claude Desktop/Code integration

---

## Monorepo Structure

This project is a Yarn 4 monorepo with multiple packages:

```
spike-land-nextjs/
├── src/                          # Next.js 15 Web App (main package)
│   ├── app/                      # App Router pages
│   │   ├── apps/                 # Application pages
│   │   │   ├── pixel/            # Pixel app
│   │   │   ├── audio-mixer/      # Audio mixer
│   │   │   ├── music-creator/    # Music creator
│   │   │   └── display/          # Display app
│   │   ├── admin/                # Admin dashboard
│   │   ├── api/                  # API routes
│   │   ├── auth/                 # Authentication pages
│   │   ├── boxes/                # Browser boxes
│   │   ├── merch/                # Merchandise store
│   │   └── ...                   # Other pages
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── enhance/              # Enhancement UI
│   │   ├── admin/                # Admin components
│   │   └── ...                   # Feature components
│   └── lib/                      # Utilities and services
│
├── packages/
│   ├── mobile-app/               # Expo Mobile App
│   │   ├── app/                  # Expo Router pages
│   │   ├── components/           # Mobile components
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/             # API clients
│   │   └── stores/               # Zustand stores
│   │
│   ├── mcp-server/               # MCP Server Package
│   │   ├── src/                  # Server implementation
│   │   └── package.json          # Published to npm
│   │
│   ├── shared/                   # Shared Code Package
│   │   └── src/
│   │       ├── types/            # TypeScript types from Prisma
│   │       ├── constants/        # Shared constants
│   │       ├── validations/      # Zod schemas
│   │       └── utils/            # Utility functions
│   │
│   └── opfs-node-adapter/        # OPFS Node Adapter (experimental)
│
├── prisma/
│   └── schema.prisma             # Database schema (54 models)
│
└── e2e/
    ├── features/                 # Cucumber feature files
    └── step-definitions/         # Playwright steps
```

### Packages Overview

| Package                               | Type       | Description                                    |
| ------------------------------------- | ---------- | ---------------------------------------------- |
| **spike-land-nextjs**                 | Next.js    | Main web application (production)              |
| **@spike-npm-land/mobile-app**        | Expo       | Mobile app for iOS/Android/Web                 |
| **@spike-npm-land/mcp-server**        | MCP Server | NPM package for Claude integration             |
| **@spike-npm-land/shared**            | Library    | Shared types, constants, and utilities         |
| **@spike-npm-land/opfs-node-adapter** | Library    | OPFS browser filesystem adapter (experimental) |

---

## Pixel - AI Image Enhancement App

**URL**: [spike.land/apps/pixel](https://spike.land/apps/pixel)

Pixel is the flagship AI-powered image enhancement application on the Spike Land
platform. All 5 implementation phases are complete.

### Phase 1: MVP ✅ Complete

| Feature             | Status      | Description                       |
| ------------------- | ----------- | --------------------------------- |
| Image Upload        | ✅ Complete | Drag-drop UI with preview         |
| AI Enhancement      | ✅ Complete | Single-tier enhancement (TIER_1K) |
| Before/After Slider | ✅ Complete | Interactive comparison view       |
| Download            | ✅ Complete | Export enhanced images            |
| Auth Integration    | ✅ Complete | NextAuth authentication           |

### Phase 2: Token Consumption ✅ Complete

Pixel consumes tokens from the Spike Land platform token economy.

| Feature                | Status      | Description                                |
| ---------------------- | ----------- | ------------------------------------------ |
| Multi-tier Enhancement | ✅ Complete | TIER_1K, TIER_2K, TIER_4K options          |
| Platform Token Usage   | ✅ Complete | Consumes Spike Land platform tokens        |
| Low Balance Warnings   | ✅ Complete | User notifications                         |
| Refunds on Failure     | ✅ Complete | Automatic token refund to platform balance |

### Phase 3: Albums & Export ✅ Complete

| Feature           | Status      | Description                         |
| ----------------- | ----------- | ----------------------------------- |
| Album Management  | ✅ Complete | Create, edit, delete albums         |
| Batch Upload      | ✅ Complete | Multiple image upload               |
| Album Sharing     | ✅ Complete | Unlisted links with share tokens    |
| Export Formats    | ✅ Complete | JPEG, PNG, WebP support             |
| Version History   | ✅ Complete | Track enhancement versions          |
| Batch Enhancement | ✅ Complete | Queue processing                    |
| PhotoMix          | ✅ Complete | Image mixing/blending capabilities  |
| Pipelines         | ✅ Complete | Custom enhancement workflows        |
| QR Code Sharing   | ✅ Complete | Generate QR codes for shared images |

### Phase 4: Referral Program ✅ Complete

| Feature              | Status      | Description                        |
| -------------------- | ----------- | ---------------------------------- |
| Referral Links       | ✅ Complete | Unique per-user referral codes     |
| Token Rewards        | ✅ Complete | 50 tokens for referrer and referee |
| Referral Dashboard   | ✅ Complete | Statistics and tracking            |
| Anti-fraud Measures  | ✅ Complete | IP-based and email verification    |
| Attribution Tracking | ✅ Complete | Sign-up source tracking            |

### Phase 5: Admin Dashboard ✅ Complete

| Feature             | Status      | Description                         | URL                        |
| ------------------- | ----------- | ----------------------------------- | -------------------------- |
| Main Dashboard      | ✅ Complete | Overview with key metrics           | /admin                     |
| User Analytics      | ✅ Complete | Registrations, MAU, retention       | /admin/users               |
| Token Analytics     | ✅ Complete | Purchases, spend, burn rate         | /admin/tokens              |
| System Health       | ✅ Complete | Job queue, failure rates            | /admin/system              |
| Jobs Dashboard      | ✅ Complete | Monitor and manage enhancement jobs | /admin/jobs                |
| Voucher Management  | ✅ Complete | Create and manage vouchers          | /admin/vouchers            |
| Featured Gallery    | ✅ Complete | Curate showcase images              | /admin/gallery             |
| Photo Gallery       | ✅ Complete | Browse all platform photos          | /admin/photos              |
| Feedback System     | ✅ Complete | Bug reports and idea collection     | /admin/feedback            |
| Error Tracking      | ✅ Complete | Application error monitoring        | /admin/errors              |
| Email Management    | ✅ Complete | Email logs and campaigns            | /admin/emails              |
| Marketing Dashboard | ✅ Complete | Campaign tracking & funnels         | /admin/marketing           |
| Marketing Accounts  | ✅ Complete | Google/Facebook ad accounts         | /admin/marketing/accounts  |
| Marketing Campaigns | ✅ Complete | Campaign management                 | /admin/marketing/campaigns |
| Marketing Funnels   | ✅ Complete | Conversion funnel analysis          | /admin/marketing/funnel    |
| AI Agent Sessions   | ✅ Complete | Jules agent session management      | /admin/agents              |
| Sitemap Preview     | ✅ Complete | Visual sitemap inspection           | /admin/sitemap             |
| Merch Orders        | ✅ Complete | Order management and fulfillment    | /admin/merch/orders        |
| Merch Products      | ✅ Complete | Product catalog management          | /admin/merch/products      |
| Storage Analytics   | ✅ Complete | R2 storage usage monitoring         | API endpoint               |

#### Admin Jobs Management Dashboard (NEW)

A comprehensive dashboard for monitoring and managing image enhancement jobs:

| Feature             | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| Job Queue Monitor   | Real-time view of pending, processing, and completed jobs          |
| Job Filtering       | Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)          |
| Job Search          | Search jobs by user email or job ID                                |
| Job Actions         | Retry failed jobs, view job details, inspect errors                |
| Performance Metrics | Track job completion rates, failure rates, average processing time |
| Timeout Handling    | 4K jobs have 120-second timeout to prevent stuck jobs              |

**Access**: `/admin/jobs` (SUPER_ADMIN only)

**Key Files:**

- `src/app/admin/jobs/page.tsx` - Jobs dashboard
- `src/app/admin/jobs/JobsAdminClient.tsx` - Jobs table component
- `src/app/api/admin/jobs/route.ts` - Jobs API endpoints

#### Featured Gallery System (NEW)

Curate and showcase outstanding image enhancements on the platform:

| Feature                | Description                             |
| ---------------------- | --------------------------------------- |
| Featured Images        | Admins can mark images as featured      |
| Public Gallery         | Featured images displayed to all users  |
| Metadata Management    | Store title, description, artist credit |
| Featured Status Toggle | Easily add/remove images from gallery   |

**Database Model**: `FeaturedGalleryItem`

- Links to `EnhancedImage`
- Stores featured metadata
- Tracks featured date

**Key Files:**

- Database schema in `prisma/schema.prisma`
- Admin curation UI (future)
- Public gallery page (future)

#### Feedback Collection System (NEW)

Structured feedback system for bug reports and feature ideas:

| Feature          | Description                               |
| ---------------- | ----------------------------------------- |
| Feedback Types   | BUG or IDEA categories                    |
| User Attribution | Link feedback to user accounts            |
| Status Tracking  | NEW, REVIEWED, RESOLVED, DISMISSED states |
| Admin Dashboard  | View and manage all feedback submissions  |

**Access**: `/admin/feedback` (ADMIN/SUPER_ADMIN)

**Database Model**: `Feedback`

- User association
- Type (BUG/IDEA)
- Status tracking
- Admin notes

**Key Files:**

- `src/app/api/feedback/route.ts` - Feedback submission API
- Admin feedback dashboard (future)

#### Technical Improvements

**Gemini API Timeout Handling**:

- 4K enhancement jobs now have 120-second timeout (120000ms)
- Prevents jobs from getting stuck indefinitely
- Automatic token refund on timeout
- Error logging for debugging

**Job Cleanup System**:

- Automatic cleanup of old jobs
- Cron-based scheduling
- Prevents database bloat
- Maintains system performance

**E2E Testing Bypass**:

- Special bypass mechanism for E2E tests
- Allows testing without consuming tokens
- Prevents test failures due to API limits
- Maintains test reliability

**Key Files:**

- `src/app/apps/pixel/` - Image enhancement pages (updated path)
- `src/app/albums/` - Album management
- `src/app/pricing/` - Token pricing
- `src/app/referrals/` - Referral program
- `src/app/admin/` - Admin dashboard
- `src/app/admin/jobs/` - Jobs management dashboard
- `src/components/enhance/` - Enhancement UI components
- `src/components/tokens/` - Token system components

---

## Platform Features

### Token Economy (Platform-Level)

The token system is core platform infrastructure that all apps on Spike Land can
use.

| Feature              | Status      | Description                            |
| -------------------- | ----------- | -------------------------------------- |
| Token Balance System | ✅ Complete | Single balance per user, platform-wide |
| Auto-Regeneration    | ✅ Complete | 1 token per 15 min, max 100            |
| Stripe Integration   | ✅ Complete | One-time purchases and subscriptions   |
| Transaction History  | ✅ Complete | Full token transaction log             |
| Voucher System       | ✅ Complete | Promotional codes for bonus tokens     |

**Key Files:**

- `src/lib/tokens/balance-manager.ts` - Token operations (platform API)
- `src/app/api/tokens/balance/route.ts` - Balance query endpoint
- `src/app/api/stripe/` - Payment processing

### 1. Authentication System

| Feature                 | Status      | Description                             |
| ----------------------- | ----------- | --------------------------------------- |
| NextAuth.js Integration | ✅ Complete | Multi-provider authentication framework |
| GitHub OAuth            | ✅ Complete | Sign in with GitHub account             |
| Google OAuth            | ✅ Complete | Sign in with Google account             |
| Apple OAuth             | ✅ Complete | Sign in with Apple account              |
| Facebook OAuth          | ✅ Complete | Sign in with Facebook account           |
| Email/Password          | ✅ Complete | Traditional email authentication        |
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

| Feature              | Status      | Description                   |
| -------------------- | ----------- | ----------------------------- |
| shadcn/ui Components | ✅ Complete | Production-ready UI library   |
| Dark/Light Mode      | ✅ Complete | Theme toggle support          |
| Responsive Design    | ✅ Complete | Mobile-first layouts          |
| Loading Skeletons    | ✅ Complete | Graceful loading states       |
| Cookie Consent       | ✅ Complete | GDPR-compliant consent        |
| User Profiles        | ✅ Complete | User settings and preferences |
| API Keys Management  | ✅ Complete | Generate and manage API keys  |

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

## E-Commerce

Spike Land includes a full e-commerce platform for merchandise.

| Feature             | Status      | Description                           |
| ------------------- | ----------- | ------------------------------------- |
| Merch Store         | ✅ Complete | Product catalog with categories       |
| Shopping Cart       | ✅ Complete | Add/remove items, quantity management |
| Checkout Flow       | ✅ Complete | Stripe-powered checkout               |
| Order Management    | ✅ Complete | Order history and status tracking     |
| Prodigi Integration | ✅ Complete | Print-on-demand fulfillment           |
| VAT Calculation     | ✅ Complete | EU VAT handling                       |
| Shipping Zones      | ✅ Complete | UK/EU shipping configuration          |
| Product Variants    | ✅ Complete | Size, color, and style options        |

**Key Files:**

- `src/app/merch/` - Merch store pages
- `src/app/cart/` - Shopping cart
- `src/app/checkout/` - Checkout flow

---

## Mobile App (iOS/Android/Web)

Native mobile experience built with Expo and React Native.

| Feature               | Status      | Description                        |
| --------------------- | ----------- | ---------------------------------- |
| Gallery & Enhancement | ✅ Complete | Full image enhancement workflow    |
| Albums                | ✅ Complete | Album management on mobile         |
| Blog                  | ✅ Complete | Blog posts and articles            |
| Merch Store           | ✅ Complete | Browse and purchase merchandise    |
| Token Management      | ✅ Complete | View balance, purchase tokens      |
| Referral Program      | ✅ Complete | Share referral codes               |
| Settings              | ✅ Complete | User preferences and notifications |
| API Keys              | ✅ Complete | Manage API keys                    |
| Cart & Checkout       | ✅ Complete | Mobile checkout experience         |
| Admin Panel           | ✅ Complete | Users, jobs, vouchers, analytics   |
| RevenueCat IAP        | ✅ Complete | In-app purchases for iOS/Android   |
| Canvas/Image Editing  | ✅ Complete | Touch-friendly image editing       |
| Voucher Redemption    | ✅ Complete | Redeem voucher codes               |
| Push Notifications    | ✅ Complete | Expo notifications integration     |
| Offline Support       | ✅ Complete | Queue actions when offline         |
| Design System         | ✅ Complete | 17-section component storybook     |

**Tech Stack:**

- **Framework**: Expo 52, React Native 0.76
- **Navigation**: Expo Router (file-based)
- **UI**: Tamagui
- **State**: Zustand, React Query

**Key Files:**

- `packages/mobile-app/` - Mobile app package
- See [packages/mobile-app/README.md](../packages/mobile-app/README.md) for details

---

## Other Apps & Features

Additional applications and features on the Spike Land platform.

### Apps

| App           | Status      | URL                 | Description                            |
| ------------- | ----------- | ------------------- | -------------------------------------- |
| Pixel         | ✅ Complete | /apps/pixel         | AI image enhancement (flagship app)    |
| Audio Mixer   | ✅ Complete | /apps/audio-mixer   | Multi-track audio mixing and recording |
| Music Creator | ✅ Complete | /apps/music-creator | Music creation tools                   |
| Display       | ✅ Complete | /apps/display       | Presentation and display apps          |
| Blendr        | ✅ Complete | /blendr             | Image blending tool (anonymous access) |
| Blog          | ✅ Complete | /blog               | Blog with posts and articles           |

### Standalone Features

| Feature              | Status      | URL                   | Description                                      |
| -------------------- | ----------- | --------------------- | ------------------------------------------------ |
| Boxes                | ✅ Complete | /boxes                | Remote browser agent boxes with WebRTC           |
| Personas             | ✅ Complete | /personas             | 11 customer personas for marketing               |
| Canvas               | ✅ Complete | /canvas/[albumId]     | Touch-friendly image editing canvas              |
| MCP Tools Playground | ✅ Complete | /apps/pixel/mcp-tools | Test MCP API for image generation/modification   |
| Storybook            | ✅ Complete | /storybook            | 17-section component design system documentation |
| Merch Store          | ✅ Complete | /merch                | E-commerce with Prodigi integration              |
| Settings & Profile   | ✅ Complete | /settings, /profile   | User preferences, API keys, subscriptions        |
| Referral Program     | ✅ Complete | /referrals            | Token rewards for referrals                      |
| Admin Dashboard      | ✅ Complete | /admin                | Comprehensive admin tools                        |

**Key Files:**

- `src/app/apps/` - Application pages
- `src/app/boxes/` - Browser agent boxes
- `src/app/personas/` - Marketing personas
- `src/app/canvas/` - Image editing canvas
- `src/app/blendr/` - Image blending tool

---

## MCP Server Integration

Spike Land provides an MCP (Model Context Protocol) server that integrates AI image generation and modification directly into Claude Desktop and Claude Code.

| Feature            | Status      | Description                                         |
| ------------------ | ----------- | --------------------------------------------------- |
| NPM Package        | ✅ Complete | Published as @spike-npm-land/mcp-server             |
| Image Generation   | ✅ Complete | Text-to-image with quality tiers                    |
| Image Modification | ✅ Complete | AI-powered image editing via prompts                |
| Token Integration  | ✅ Complete | Uses platform token system                          |
| Job Status Polling | ✅ Complete | Poll /api/mcp/jobs/[jobId] for completion           |
| API Key Auth       | ✅ Complete | Secure authentication with user API keys            |
| Multi-tier Support | ✅ Complete | FREE, TIER_1K (2), TIER_2K (5), TIER_4K (10) tokens |

### MCP Tools

**generate_image**

- Text-to-image generation with AI
- Supports aspect ratios: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- Optional negative prompts
- Quality tiers with token costs

**modify_image**

- AI-powered image editing via text prompts
- Accepts image URL or base64 data
- Auto-detects output aspect ratio from input
- Same pricing structure as generation

**check_job**

- Poll job status and retrieve results
- Returns job progress, status, and final image URL

**get_balance**

- Check current token balance
- View token regeneration status

### Installation

```bash
# Claude Desktop configuration
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-npm-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

**Key Files:**

- `packages/mcp-server/` - MCP server package
- `src/app/api/mcp/` - MCP API endpoints
- `src/lib/mcp/` - MCP authentication and services
- `src/app/apps/pixel/mcp-tools/` - MCP playground UI

---

## Browser Agent Boxes

Remote browser automation system with WebRTC streaming and AI agent integration.

| Feature          | Status      | Description                            |
| ---------------- | ----------- | -------------------------------------- |
| Box Management   | ✅ Complete | Create and manage remote browser boxes |
| WebRTC Streaming | ✅ Complete | Real-time browser screen streaming     |
| Tiered System    | ✅ Complete | FREE, STARTER, PRO, ENTERPRISE tiers   |
| AI Agent Tasks   | ✅ Complete | Assign tasks to AI agents in boxes     |
| TURN Server      | ✅ Complete | NAT traversal for WebRTC connections   |
| Box Actions Log  | ✅ Complete | Track all browser actions and events   |
| Message System   | ✅ Complete | Communication between agent and box    |

### Box Tiers

| Tier       | Max Duration | Max Boxes | Price        |
| ---------- | ------------ | --------- | ------------ |
| FREE       | 15 min       | 1         | Free         |
| STARTER    | 1 hour       | 3         | Tokens       |
| PRO        | 4 hours      | 10        | Subscription |
| ENTERPRISE | Unlimited    | Unlimited | Custom       |

**Database Models:**

- `BoxTier` - Tier configuration
- `Box` - Browser box instances
- `BoxAction` - Action history
- `BoxMessage` - Box-agent communication
- `AgentTask` - AI agent tasks

**Key Files:**

- `src/app/boxes/` - Box management UI
- `src/app/api/boxes/` - Box API
- `src/components/boxes/` - Box components

---

## Analytics & Tracking

Comprehensive analytics system for campaign tracking and user behavior.

| Feature                | Status      | Description                                 |
| ---------------------- | ----------- | ------------------------------------------- |
| Visitor Sessions       | ✅ Complete | Track unique visitor sessions               |
| Page View Tracking     | ✅ Complete | Record all page views with metadata         |
| Event Tracking         | ✅ Complete | Custom event tracking (clicks, conversions) |
| Campaign Attribution   | ✅ Complete | UTM parameter tracking                      |
| Campaign Metrics Cache | ✅ Complete | Optimized campaign performance data         |
| Marketing Funnels      | ✅ Complete | Multi-step funnel analysis                  |
| Tracked URLs           | ✅ Complete | URL shortener with click tracking           |
| Campaign Links         | ✅ Complete | Generate trackable campaign URLs            |

### Tracking Features

**Session Tracking:**

- Automatic visitor session creation
- Device, browser, and OS detection
- Geographic location tracking
- Referrer tracking

**Campaign Attribution:**

- UTM parameter parsing (source, medium, campaign, term, content)
- First-touch and last-touch attribution
- Campaign performance metrics
- Conversion tracking

**Database Models:**

- `VisitorSession` - User sessions
- `PageView` - Page view events
- `AnalyticsEvent` - Custom events
- `CampaignAttribution` - Campaign data
- `CampaignMetricsCache` - Aggregated metrics
- `TrackedUrl` - URL shortener with analytics
- `CampaignLink` - Campaign-specific tracking links

**Key Files:**

- `src/app/api/tracking/` - Tracking API endpoints
- `src/components/tracking/` - Tracking components
- `src/lib/analytics/` - Analytics utilities

---

## Marketing & Campaigns

Advanced marketing tools for campaign management and social media integration.

| Feature                | Status      | Description                           |
| ---------------------- | ----------- | ------------------------------------- |
| Google Ads Integration | ✅ Complete | Connect Google Ads accounts           |
| Facebook Ads           | ✅ Complete | Connect Facebook Ad accounts          |
| Campaign Management    | ✅ Complete | Create and manage marketing campaigns |
| Marketing Accounts     | ✅ Complete | Link external marketing platforms     |
| Campaign Analytics     | ✅ Complete | Export campaign data                  |
| Customer Personas      | ✅ Complete | 11 detailed customer personas         |
| Marketing Funnels      | ✅ Complete | Multi-step conversion funnels         |

### Customer Personas

**Priority Personas** (High social engagement):

1. Wedding Photographer
2. Instagram Influencer
3. Real Estate Agent
4. E-commerce Seller

**Secondary Personas**:
5. Family Memory Keeper
6. Travel Blogger
7. Vintage Photo Restorer
8. Graphic Designer
9. Event Photographer
10. Small Business Owner
11. Content Creator

**Database Models:**

- `MarketingAccount` - Connected ad accounts
- `CampaignAttribution` - Campaign tracking
- `CampaignMetricsCache` - Performance metrics

**Key Files:**

- `src/app/admin/marketing/` - Marketing admin UI
- `src/app/personas/` - Customer persona pages
- `src/lib/marketing/personas.ts` - Persona definitions
- `src/app/api/marketing/` - Marketing API endpoints

---

## Image Enhancement Pipelines

Advanced image processing workflows with customizable steps.

| Feature             | Status      | Description                                  |
| ------------------- | ----------- | -------------------------------------------- |
| Custom Pipelines    | ✅ Complete | User-defined enhancement workflows           |
| Multi-stage Process | ✅ Complete | ANALYZE, ENHANCE, POST_PROCESS stages        |
| Dynamic Prompts     | ✅ Complete | AI-generated prompts based on image analysis |
| Auto-crop           | ✅ Complete | Automatic subject detection and cropping     |
| Reference Images    | ✅ Complete | Use reference images for style transfer      |
| Pipeline Templates  | ✅ Complete | Save and reuse pipeline configurations       |

### Pipeline Stages

1. **ANALYZE** - Image analysis and feature detection
2. **ENHANCE** - AI enhancement with dynamic prompts
3. **POST_PROCESS** - Final adjustments and refinements

**Database Models:**

- `EnhancementPipeline` - Pipeline configurations
- `ImageEnhancementJob` - Jobs with pipeline data
  - `currentStage` - Current pipeline stage
  - `analysisResult` - AI analysis results
  - `wasCropped` - Auto-crop flag
  - `cropDimensions` - Crop coordinates

**Key Files:**

- `src/app/apps/pixel/pipelines/` - Pipeline management UI
- `src/app/api/pipelines/` - Pipeline API
- `src/lib/pixel-pipelines.md` - Pipeline documentation

---

## External Agent Integration

Jules AI coding agent integration for async development tasks.

| Feature         | Status      | Description                              |
| --------------- | ----------- | ---------------------------------------- |
| Agent Sessions  | ✅ Complete | Track Jules agent coding sessions        |
| Activity Log    | ✅ Complete | Monitor agent actions and progress       |
| Session Status  | ✅ Complete | QUEUED, PLANNING, IN_PROGRESS, COMPLETED |
| Admin Dashboard | ✅ Complete | View and manage agent sessions           |

**Database Models:**

- `ExternalAgentSession` - Agent session tracking
- `AgentSessionActivity` - Activity log

**Key Files:**

- `src/app/admin/agents/` - Agent admin UI
- `src/app/api/admin/agents/` - Agent API

---

## API & Developer Tools

Public API and developer tools for platform integration.

| Feature          | Status      | Description                           |
| ---------------- | ----------- | ------------------------------------- |
| API Keys         | ✅ Complete | Generate and manage API keys          |
| MCP Server       | ✅ Complete | Model Context Protocol integration    |
| API History      | ✅ Complete | Track MCP API usage                   |
| Webhooks         | ✅ Complete | Stripe and Prodigi webhook handlers   |
| REST API         | ✅ Complete | RESTful API for all platform features |
| Token-based Auth | ✅ Complete | Bearer token authentication           |

**API Endpoints:**

- `/api/mcp/generate` - Image generation
- `/api/mcp/modify` - Image modification
- `/api/mcp/balance` - Token balance
- `/api/mcp/history` - API usage history
- `/api/v1/agent/*` - Agent API endpoints

**Database Models:**

- `ApiKey` - User API keys
- `McpGenerationJob` - MCP job history

**Key Files:**

- `src/app/settings/` - API key management
- `src/app/api/mcp/` - MCP API endpoints
- `src/lib/mcp/auth.ts` - API authentication

---

## Error Tracking & Monitoring

Comprehensive error tracking and system health monitoring.

| Feature               | Status      | Description                         |
| --------------------- | ----------- | ----------------------------------- |
| Error Logging         | ✅ Complete | Automatic error capture and storage |
| Error Dashboard       | ✅ Complete | Browse and analyze errors           |
| Error Statistics      | ✅ Complete | Error counts, trends, and patterns  |
| Client-side Reporting | ✅ Complete | Frontend error reporting            |
| Image Error Logging   | ✅ Complete | Track image loading failures        |
| Auto Cleanup          | ✅ Complete | Cron job for old error cleanup      |
| Error Testing         | ✅ Complete | Test error reporting system         |

### Error Types Tracked

- **Application Errors**: Unhandled exceptions and crashes
- **API Errors**: Failed API requests and responses
- **Image Errors**: Image loading and processing failures
- **Validation Errors**: Input validation failures
- **Authentication Errors**: Auth failures and token issues

### Error Dashboard Features

**Statistics:**

- Total error count
- Error rate trends
- Most common errors
- Error by type distribution

**Filtering:**

- Filter by error type
- Filter by date range
- Search by error message
- Group by stack trace

**Database Model:**

- `ErrorLog` - Comprehensive error logging
  - `message` - Error message
  - `stack` - Stack trace
  - `context` - Additional context (JSON)
  - `userAgent` - Browser/client info
  - `url` - Page where error occurred
  - `createdAt` - Timestamp

**Key Files:**

- `src/app/admin/errors/` - Error dashboard
- `src/app/api/errors/report/` - Error reporting API
- `src/app/api/admin/errors/` - Admin error API
- `src/app/api/cron/cleanup-errors/` - Auto cleanup

---

## Cron Jobs & Automation

Automated maintenance and cleanup tasks.

| Job              | Schedule      | Description                      |
| ---------------- | ------------- | -------------------------------- |
| Job Cleanup      | Every 6 hours | Remove old completed/failed jobs |
| Error Cleanup    | Daily         | Archive old error logs           |
| Tracking Cleanup | Daily         | Clean up old tracking data       |
| Marketing Sync   | Hourly        | Sync marketing campaign data     |

**Key Files:**

- `src/app/api/cron/cleanup-jobs/` - Job cleanup
- `src/app/api/cron/cleanup-errors/` - Error cleanup
- `src/app/api/cron/cleanup-tracking/` - Tracking cleanup
- `src/app/api/cron/marketing-sync/` - Marketing sync

---

## Email System

Email infrastructure with Resend integration.

| Feature              | Status      | Description                       |
| -------------------- | ----------- | --------------------------------- |
| Resend Integration   | ✅ Complete | Email sending via Resend API      |
| Email Templates      | ✅ Complete | React Email component templates   |
| Email Logging        | ✅ Complete | Track all sent emails             |
| Email Campaigns      | ✅ Complete | Marketing email management        |
| Transactional Emails | ✅ Complete | Account, order, and system emails |

**Email Types:**

- Welcome emails
- Password reset
- Order confirmations
- Referral notifications
- Marketing campaigns
- Admin notifications

**Database Model:**

- `EmailLog` - Email sending history
  - `to` - Recipient email
  - `subject` - Email subject
  - `status` - Delivery status
  - `provider` - Email provider (Resend)
  - `metadata` - Additional data (JSON)

**Key Files:**

- `src/app/admin/emails/` - Email management
- `src/app/api/admin/emails/` - Email API
- `src/lib/email/` - Email utilities
- `src/components/emails/` - Email templates (React Email)

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

### Frontend (Web)

| Technology            | Version | Purpose                           |
| --------------------- | ------- | --------------------------------- |
| Next.js               | 16.1.1  | React framework with App Router   |
| React                 | 19.2.3  | UI library with Server Components |
| TypeScript            | 5.9.3   | Type-safe JavaScript              |
| Tailwind CSS          | 4.1.18  | Utility-first CSS                 |
| shadcn/ui             | Latest  | UI component library              |
| next-themes           | 0.4.x   | Dark mode support                 |
| next-view-transitions | 0.3.5   | View transitions API              |
| Radix UI              | Latest  | Accessible UI primitives          |
| Lucide React          | 0.562.0 | Icon library                      |
| Recharts              | 3.6.0   | Chart library for analytics       |
| React Hook Form       | 7.69.0  | Form management                   |
| Zod                   | 4.2.1   | Schema validation                 |

### Backend & API

| Technology    | Version    | Purpose                 |
| ------------- | ---------- | ----------------------- |
| Next.js API   | 16.1.1     | API routes              |
| NextAuth.js   | 5.0.0-beta | Authentication          |
| Prisma        | 7.2.0      | Database ORM            |
| PostgreSQL    | Latest     | Production database     |
| Vercel KV     | 3.0.0      | Redis for rate limiting |
| Stripe        | 20.1.0     | Payment processing      |
| Resend        | 6.6.0      | Email delivery          |
| @google/genai | 1.34.0     | Google Gemini AI        |
| bcryptjs      | 3.0.3      | Password hashing        |

### Storage & Media

| Technology      | Version | Purpose                      |
| --------------- | ------- | ---------------------------- |
| AWS S3 SDK      | 3.958.0 | S3/R2 storage                |
| Sharp           | 0.34.5  | Image processing             |
| QRCode          | 1.5.4   | QR code generation           |
| Gray Matter     | 4.0.3   | Markdown frontmatter parsing |
| next-mdx-remote | 5.0.0   | MDX rendering                |

### UI Components & Interactions

| Technology               | Version | Purpose                      |
| ------------------------ | ------- | ---------------------------- |
| @dnd-kit                 | Latest  | Drag and drop functionality  |
| react-masonry-css        | 1.0.16  | Masonry grid layouts         |
| Sonner                   | 2.0.7   | Toast notifications          |
| class-variance-authority | 0.7.1   | Component variant management |
| clsx / tailwind-merge    | Latest  | Class name utilities         |

### Real-time & Communication

| Technology | Version | Purpose                 |
| ---------- | ------- | ----------------------- |
| PeerJS     | 1.5.5   | WebRTC peer connections |
| Jose       | 6.0.11  | JWT operations          |

### Testing

| Technology                | Version | Purpose             |
| ------------------------- | ------- | ------------------- |
| Vitest                    | 4.0.16  | Unit testing        |
| @vitest/coverage-v8       | 4.0.16  | Code coverage       |
| React Testing Library     | 16.3.1  | Component testing   |
| @testing-library/jest-dom | 6.9.1   | DOM matchers        |
| Playwright                | 1.57.0  | E2E browser testing |
| Cucumber                  | 12.5.0  | BDD test scenarios  |
| happy-dom / jsdom         | Latest  | DOM implementation  |

### DevOps & Tools

| Technology     | Version | Purpose              |
| -------------- | ------- | -------------------- |
| GitHub Actions | -       | CI/CD automation     |
| Vercel         | 50.1.3  | Production hosting   |
| Cloudflare     | -       | DNS and CDN          |
| ESLint         | 9.39.2  | Code linting         |
| dprint         | 0.51.1  | Code formatting      |
| Knip           | 5.78.0  | Dead code detection  |
| Husky          | 9.1.7   | Git hooks            |
| tsx            | 4.21.0  | TypeScript execution |

### Mobile (Expo)

| Technology   | Version | Purpose                |
| ------------ | ------- | ---------------------- |
| Expo         | 52      | React Native framework |
| React Native | 0.76    | Mobile UI              |
| Expo Router  | Latest  | File-based navigation  |
| Tamagui      | Latest  | Mobile UI components   |
| Zustand      | Latest  | State management       |
| React Query  | Latest  | Data fetching          |
| RevenueCat   | Latest  | In-app purchases       |

### Analytics & Monitoring

| Technology             | Purpose                        |
| ---------------------- | ------------------------------ |
| @vercel/analytics      | 1.6.1 - Web analytics          |
| @vercel/speed-insights | 1.3.1 - Performance monitoring |
| Custom tracking        | Campaign and event tracking    |

### Shared Package

| Technology | Version | Purpose                     |
| ---------- | ------- | --------------------------- |
| Zod        | 4.2.1   | Schema validation           |
| Prisma     | 7.2.0   | Type generation from schema |

---

## Database Schema

### Core Models

See `prisma/schema.prisma` for the complete schema (54 models). Key models organized by feature:

#### Platform Infrastructure

**User & Authentication:**

- `User` - User accounts with role (USER/ADMIN/SUPER_ADMIN), referral info
- `Account` - OAuth provider accounts
- `Session` - User sessions
- `VerificationToken` - Email verification

**Token Economy (Platform-Level):**

- `UserTokenBalance` - User token balance with regeneration (one per user)
- `TokenTransaction` - Token movements (earn/spend/refund)
- `TokensPackage` - Purchasable token packages
- `StripePayment` - Payment records
- `Subscription` - Recurring subscriptions
- `SubscriptionPlan` - Subscription tiers
- `Voucher` - Promotional codes
- `VoucherRedemption` - Voucher usage tracking

**Platform Apps:**

- `App` - User-created applications with status
- `Requirement` - App requirements with priority and status
- `MonetizationModel` - Pricing configuration

#### Image Enhancement (Pixel)

**Core Features:**

- `EnhancedImage` - Uploaded images with metadata and shareToken
- `ImageEnhancementJob` - Enhancement jobs with tier, status, pipeline data
- `Album` - Image albums with privacy settings
- `AlbumImage` - Album-image associations with sort order
- `EnhancementPipeline` - Custom enhancement workflows

#### Browser Boxes

- `BoxTier` - Tier configuration (FREE, STARTER, PRO, ENTERPRISE)
- `Box` - Browser box instances
- `BoxAction` - Action history log
- `BoxMessage` - Box-agent communication
- `AgentTask` - AI agent tasks

#### Analytics & Marketing

**Analytics:**

- `VisitorSession` - Visitor session tracking
- `PageView` - Page view events
- `AnalyticsEvent` - Custom event tracking
- `CampaignAttribution` - Campaign attribution data
- `CampaignMetricsCache` - Aggregated campaign metrics

**Marketing:**

- `MarketingAccount` - Connected ad accounts (Google, Facebook)
- `TrackedUrl` - URL shortener with click tracking
- `CampaignLink` - Campaign-specific tracking links

#### E-Commerce (Merch)

- `MerchCategory` - Product categories
- `MerchProduct` - Products with Prodigi integration
- `MerchVariant` - Product variants (size, color)
- `MerchCart` - Shopping carts
- `MerchCartItem` - Cart items
- `MerchOrder` - Orders with fulfillment
- `MerchOrderItem` - Order line items
- `MerchShipment` - Shipment tracking
- `MerchOrderEvent` - Order status events
- `MerchWebhookEvent` - Prodigi webhook events

#### Audio & Media

- `AudioMixerProject` - Audio mixing projects
- `AudioTrack` - Individual audio tracks

#### Admin & Monitoring

- `Referral` - Referral relationships and rewards
- `AuditLog` - Admin action logging
- `ErrorLog` - Application error tracking
- `Feedback` - User feedback (bug reports, ideas)
- `FeaturedGalleryItem` - Curated showcase images
- `EmailLog` - Email sending history

#### Developer Tools

- `ApiKey` - User API keys for authentication
- `McpGenerationJob` - MCP API job history
- `ExternalAgentSession` - Jules agent sessions
- `AgentSessionActivity` - Agent activity log

---

## Getting Started

### Development Setup

```bash
# Install dependencies
yarn install --immutable

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
yarn prisma generate
yarn prisma db push

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

---

## Platform Statistics

### Codebase Overview

| Metric                | Count | Description                                  |
| --------------------- | ----- | -------------------------------------------- |
| **Database Models**   | 54    | Complete schema in prisma/schema.prisma      |
| **Monorepo Packages** | 5     | Web, mobile, MCP server, shared, OPFS        |
| **API Endpoints**     | 100+  | RESTful API routes                           |
| **Page Routes**       | 80+   | Next.js App Router pages                     |
| **UI Components**     | 50+   | shadcn/ui and custom components              |
| **Applications**      | 6     | Pixel, Audio, Music, Display, Blendr, Blog   |
| **Admin Dashboards**  | 15+   | Comprehensive admin tools                    |
| **Authentication**    | 5     | GitHub, Google, Apple, Facebook, Email/Phone |
| **Test Coverage**     | 100%  | Unit tests with Vitest                       |

### Feature Coverage

**✅ Complete Features:**

- AI Image Enhancement (all tiers)
- Token Economy with Regeneration
- E-commerce with Prodigi Integration
- Mobile Apps (iOS/Android/Web)
- MCP Server Integration
- Browser Agent Boxes
- Analytics & Campaign Tracking
- Marketing Tools & Personas
- Error Tracking & Monitoring
- Email System with Resend
- API Keys & Developer Tools
- Admin Dashboard Suite
- Referral Program
- Multi-app Platform

**🚧 In Development:**

- Enhanced pipeline customization
- Additional AI models
- Advanced analytics features
- White-label solutions

---

## Quick Links

### User-Facing

- **Production Site**: [https://spike.land](https://spike.land)
- **Pixel App**: [https://spike.land/apps/pixel](https://spike.land/apps/pixel)
- **Documentation**: [https://spike.land/docs](https://spike.land/docs)
- **Blog**: [https://spike.land/blog](https://spike.land/blog)

### Developer

- **GitHub**: [https://github.com/zerdos/spike-land-nextjs](https://github.com/zerdos/spike-land-nextjs)
- **API Reference**: [docs/API_REFERENCE.md](./API_REFERENCE.md)
- **Database Schema**: [docs/DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Mobile App**: [packages/mobile-app/README.md](../packages/mobile-app/README.md)
- **MCP Server**: [packages/mcp-server/README.md](../packages/mcp-server/README.md)

### Support

- **Issues**: [GitHub Issues](https://github.com/zerdos/spike-land-nextjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zerdos/spike-land-nextjs/discussions)
- **Email**: Support via contact form

---

## Key Achievements

### Technical Milestones

- ✅ **100% Test Coverage** - Comprehensive unit and E2E testing
- ✅ **Monorepo Architecture** - Scalable multi-package structure
- ✅ **Mobile Apps** - Native iOS/Android with Expo
- ✅ **MCP Integration** - Claude Desktop/Code integration
- ✅ **Production Ready** - Live platform serving users
- ✅ **54 Database Models** - Comprehensive data architecture
- ✅ **100+ API Endpoints** - Full RESTful API
- ✅ **Modern Stack** - Next.js 16, React 19, Tailwind 4

### Business Features

- ✅ **Multi-app Platform** - 6 applications running
- ✅ **Token Economy** - Complete monetization system
- ✅ **E-commerce** - Full merch store with fulfillment
- ✅ **Analytics** - Campaign tracking and attribution
- ✅ **Marketing Tools** - Personas, funnels, integrations
- ✅ **Admin Suite** - 15+ admin dashboards
- ✅ **Developer API** - Public API with MCP server

---

**Last Updated**: December 30, 2025
**Documentation Version**: 2.0
**Platform Status**: Production
