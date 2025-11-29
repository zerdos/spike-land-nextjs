# Spike Land - Feature Documentation

> **Last Updated**: November 2025
> **Status**: Phase 2 - My Apps Platform (In Progress)

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Implemented Features](#implemented-features)
3. [In Progress Features](#in-progress-features)
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

## Implemented Features

### 1. Authentication System

| Feature | Status | Description |
|---------|--------|-------------|
| NextAuth.js Integration | ✅ Complete | Multi-provider authentication framework |
| GitHub OAuth | ✅ Complete | Sign in with GitHub account |
| Google OAuth | ✅ Complete | Sign in with Google account |
| Phone Authentication | ✅ Complete | Twilio-based phone verification |
| Session Management | ✅ Complete | Secure Prisma-based session storage |
| Protected Routes | ✅ Complete | Route guards for authenticated pages |

**Key Files:**
- `src/auth.ts` - NextAuth configuration
- `src/app/auth/signin/page.tsx` - Sign in page
- `src/components/auth/` - Auth UI components

### 2. My Apps Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| Protected Dashboard | ✅ Complete | Authentication-required app management |
| App Listing | ✅ Complete | Grid view of user's apps |
| Empty State | ✅ Complete | Onboarding UI for new users |
| Status Badges | ✅ Complete | Visual status indicators (DRAFT, ACTIVE) |
| App Cards | ✅ Complete | Rich app preview cards |
| Create App Button | ✅ Complete | Navigation to app wizard |

**Key Files:**
- `src/app/my-apps/page.tsx` - Dashboard page
- `src/components/apps/app-card.tsx` - App card component

### 3. App Creation Wizard

| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Step Form | ✅ Complete | Guided app creation flow |
| App Details Step | ✅ Complete | Name, description input |
| Requirements Step | ✅ Complete | Natural language requirements input |
| Monetization Step | ✅ Complete | Pricing model selection |
| Review Step | ✅ Complete | Summary before creation |
| Database Persistence | ✅ Complete | Save apps to PostgreSQL |

**Key Files:**
- `src/app/my-apps/new/page.tsx` - Wizard page
- `src/components/apps/requirements-manager.tsx` - Requirements UI

### 4. Database Layer

| Feature | Status | Description |
|---------|--------|-------------|
| Prisma ORM | ✅ Complete | Type-safe database access |
| PostgreSQL | ✅ Complete | Production database |
| User Model | ✅ Complete | OAuth-linked user accounts |
| App Model | ✅ Complete | App metadata and status |
| Requirement Model | ✅ Complete | Version-controlled requirements |
| MonetizationModel | ✅ Complete | Pricing configuration |
| Forking Support | ✅ Complete | App forking relationships |

**Key Files:**
- `prisma/schema.prisma` - Database schema
- `src/lib/prisma.ts` - Prisma client

### 5. UI/UX Foundation

| Feature | Status | Description |
|---------|--------|-------------|
| shadcn/ui Components | ✅ Complete | Production-ready UI library |
| Dark/Light Mode | ✅ Complete | Theme toggle support |
| Responsive Design | ✅ Complete | Mobile-first layouts |
| Loading Skeletons | ✅ Complete | Graceful loading states |
| Cookie Consent | ✅ Complete | GDPR-compliant consent |

**Key Files:**
- `src/components/ui/` - shadcn/ui components
- `src/components/theme/` - Theme components
- `src/components/skeletons/` - Loading states

### 6. Developer Experience

| Feature | Status | Description |
|---------|--------|-------------|
| TypeScript Strict Mode | ✅ Complete | Full type safety |
| 100% Test Coverage | ✅ Complete | Vitest + RTL tests |
| E2E Testing | ✅ Complete | Playwright + Cucumber BDD |
| CI/CD Pipeline | ✅ Complete | GitHub Actions automation |
| Vercel Deployment | ✅ Complete | Production hosting |
| Claude Code Integration | ✅ Complete | AI-assisted development |

---

## In Progress Features

### Currently Being Developed

| Feature | Priority | Assigned | Notes |
|---------|----------|----------|-------|
| App Search & Filter | High | - | Search bar UI exists but disabled |
| App Edit Page | High | - | Edit buttons exist, need implementation |
| App View Page | High | - | View buttons exist, need implementation |
| Fork Functionality | Medium | - | Database schema ready |
| Public App Gallery | Medium | - | `/apps` page exists |

### Placeholder Features (UI Ready, Logic Pending)

1. **Search Bar** - Styled input field exists in My Apps dashboard
2. **Filter Badges** - All/Active/Draft badges visible but non-functional
3. **App Actions** - View/Edit buttons on cards need routing

---

## Roadmap & Future Plans

### Phase 1: Authentication & Foundation ✅ COMPLETE

- [x] NextAuth setup (GitHub, Google, Phone)
- [x] Protected routes
- [x] User profiles (basic)
- [x] Settings page (skeleton)

### Phase 2: My Apps Platform - IN PROGRESS

- [x] "My Apps" protected section
- [x] App creation wizard
- [x] Database schema for apps & requirements
- [ ] App edit functionality
- [ ] App view/details page
- [ ] Fork functionality
- [ ] Search and filtering
- [ ] Requirements management improvements

### Phase 3: AI Agent Integration - PLANNED

| Task | Priority | Complexity | Status |
|------|----------|------------|--------|
| AI agent orchestration system | High | High | Planned |
| Requirement-to-code pipeline | High | High | Planned |
| Automated app generation | High | High | Planned |
| Quality assurance & testing | Medium | Medium | Planned |
| Iterative refinement based on feedback | Medium | Medium | Planned |

### Phase 4: Deployment & Hosting - PLANNED

| Task | Priority | Complexity | Status |
|------|----------|------------|--------|
| App deployment system | High | High | Planned |
| Custom domain support | Medium | Medium | Planned |
| External hosting | Medium | High | Planned |
| Monitoring & analytics | Low | Medium | Planned |

### Phase 5: Monetization - PLANNED

| Task | Priority | Complexity | Status |
|------|----------|------------|--------|
| Stripe payment integration | High | Medium | Planned |
| Subscription management | High | Medium | Planned |
| Revenue tracking | Medium | Low | Planned |
| Payout system | Medium | Medium | Planned |

---

## Technical Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with App Router |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | Latest | UI component library |
| next-themes | 0.4.x | Dark mode support |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NextAuth.js | 5.x beta | Authentication |
| Prisma | 6.x | Database ORM |
| PostgreSQL | 17.x | Production database |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 3.x | Unit testing |
| React Testing Library | Latest | Component testing |
| Playwright | Latest | E2E testing |
| Cucumber | Latest | BDD test scenarios |

### DevOps
| Technology | Purpose |
|------------|---------|
| GitHub Actions | CI/CD automation |
| Vercel | Production hosting |
| Cloudflare | DNS management |
| Claude Code | AI-assisted development |

---

## Database Schema

### Core Models

```
User
├── id: String (cuid)
├── name: String?
├── email: String? (unique)
├── emailVerified: DateTime?
├── image: String?
├── createdAt: DateTime
├── updatedAt: DateTime
├── accounts: Account[]
├── sessions: Session[]
└── apps: App[]

App
├── id: String (cuid)
├── name: String
├── description: String?
├── userId: String (owner)
├── forkedFrom: String? (parent app)
├── status: DRAFT | ACTIVE | ARCHIVED | DELETED
├── domain: String? (unique)
├── createdAt: DateTime
├── updatedAt: DateTime
├── requirements: Requirement[]
├── monetizationModels: MonetizationModel[]
└── forks: App[]

Requirement
├── id: String (cuid)
├── appId: String
├── description: String
├── priority: LOW | MEDIUM | HIGH | CRITICAL
├── status: PENDING | IN_PROGRESS | COMPLETED | REJECTED
├── version: Int
├── createdAt: DateTime
└── updatedAt: DateTime

MonetizationModel
├── id: String (cuid)
├── appId: String
├── type: FREE | ONE_TIME | SUBSCRIPTION | FREEMIUM | USAGE_BASED
├── price: Decimal?
├── subscriptionInterval: MONTHLY | QUARTERLY | YEARLY
├── features: String[]
├── createdAt: DateTime
└── updatedAt: DateTime
```

### Indexes
- `apps.userId` - Fast user app lookup
- `apps.forkedFrom` - Fork relationship queries
- `apps.status` - Status filtering
- `requirements.appId` - App requirements lookup
- `requirements.status` - Status filtering
- `requirements.priority` - Priority filtering
- `monetization_models.appId` - App monetization lookup
- `monetization_models.type` - Type filtering

---

## Getting Started

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Running Tests

```bash
# Unit tests (watch mode)
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires dev server)
npm run dev
npm run test:e2e:local
```

---

## Contributing

1. Create a feature branch from `main`
2. Implement changes with tests (100% coverage required)
3. Create PR and wait for CI checks
4. Merge when all checks pass

For detailed development guidelines, see [CLAUDE.md](../CLAUDE.md).
