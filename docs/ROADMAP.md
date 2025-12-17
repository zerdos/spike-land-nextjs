# Spike Land - Development Roadmap

> **Last Updated**: December 2025 **Current Phase**: Phase 2 Complete -
> Preparing for Phase 3 **Business Structure**: UK Limited Company (SPIKE LAND
> LTD - Company #16906682) - Fully Established

---

## Quick Status Overview

| Phase                                | Status      | Progress |
| ------------------------------------ | ----------- | -------- |
| Phase 0: Business Foundation         | Complete    | 100%     |
| Phase 1: Authentication & Foundation | Complete    | 100%     |
| Phase 2: My Apps Platform            | Complete    | 100%     |
| **Marketing Phase (Pixel Launch)**   | In Progress | 40%      |
| Phase 3: AI Agent Integration        | Planned     | 0%       |
| Phase 4: Deployment & Hosting        | Planned     | 0%       |
| Phase 5: Monetization                | Planned     | 0%       |

---

## Phase 0: Business Foundation (Priority)

### Company Formation - Complete ✅

| Task                                 | Status       | Notes                           |
| ------------------------------------ | ------------ | ------------------------------- |
| Check company name availability      | ✅ Complete  | "Spike Land Ltd" available      |
| Register at Companies House          | ✅ Submitted | Reference: 112-184507           |
| Register for Corporation Tax         | ✅ Submitted | Reference: BRCT00003618256      |
| Receive Certificate of Incorporation | ✅ Complete  | 12 December 2025                |
| Receive UTR number                   | ⏳ Pending   | Expected within 15 working days |
| Open business bank account           | ✅ Complete  | Monzo Business                  |
| Update Stripe to company details     | 📋 Next      | After bank account              |
| Update Terms of Service              | 📋 Queued    | After certificate received      |
| Update Privacy Policy                | 📋 Queued    | After certificate received      |

### Why Phase 0?

With >£10k/year revenue and user data obligations:

- **Limited liability** protects personal assets
- **GDPR compliance** - fines against company, not personally
- **Tax efficiency** - Corporation Tax vs Income Tax + NI
- **Professional credibility** for user trust

See [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md) for full analysis.

---

## Phase 2: My Apps Platform ✅ COMPLETE

### Completed Tasks

- [x] Protected My Apps dashboard
- [x] App creation wizard (4-step flow)
- [x] Database schema (Prisma + PostgreSQL)
- [x] App listing with grid layout
- [x] Status badges (DRAFT, ACTIVE, ARCHIVED)
- [x] Empty state for new users
- [x] Requirements input during creation
- [x] Monetization model selection
- [x] Pixel app implementation (Phases 1-5 complete)
- [x] Token economy platform infrastructure
- [x] Admin dashboard and tools
- [x] Job management system
- [x] Featured gallery system
- [x] Feedback collection system

### Pixel App - Demonstration of Platform Capabilities

The Pixel AI image enhancement app (https://spike.land/apps/pixel) demonstrates
the complete platform functionality:

**Phase 1: MVP** ✅ Complete

- Image upload with drag-drop UI
- Single-tier AI enhancement (TIER_1K)
- Before/after comparison slider
- Download functionality
- Authentication integration

**Phase 2: Token Consumption** ✅ Complete

- Multi-tier enhancement (TIER_1K, TIER_2K, TIER_4K)
- Platform token consumption (2/5/10 tokens per tier)
- Low balance warnings and refunds on failure

**Phase 3: Albums & Export** ✅ Complete

- Album creation, editing, deletion
- Batch image upload and organization
- Album sharing with unlisted links
- Export formats (JPEG, PNG, WebP)
- Version history for enhanced images
- Batch enhancement with queue processing

**Phase 4: Referral Program** ✅ Complete

- Unique referral links per user
- Referrer and referee token rewards (50 each)
- Referral dashboard with statistics
- Anti-fraud measures (IP-based, email verification)
- Sign-up attribution tracking

**Phase 5: Admin Dashboard** ✅ Complete

- User analytics (registrations, MAU, retention)
- Token economy analytics (purchases, spend, burn rate)
- System health monitoring (job queue, failure rates)
- Admin tools (user search, voucher creation)
- Job management dashboard
- Legal pages (Terms, Privacy, Contact)
- Email infrastructure (Resend integration)

### Phase 2 Exit Criteria

- [x] Users can create, view, edit, and delete apps
- [x] Users can manage requirements on existing apps
- [x] Platform infrastructure supports app monetization
- [x] Token economy implemented and tested
- [x] All features have 100% test coverage
- [x] E2E tests cover main user flows
- [x] Admin tools for platform management
- [x] Production-ready showcase app (Pixel)

---

## Phase 3: AI Agent Integration

### Core Tasks

| Task                       | Priority | Complexity | Description                                  |
| -------------------------- | -------- | ---------- | -------------------------------------------- |
| Agent Orchestration System | Critical | High       | Central system to manage AI agents           |
| Requirement Parser         | Critical | High       | Convert natural language to structured specs |
| Code Generator             | Critical | High       | Generate app code from specifications        |
| App Sandbox                | High     | High       | Isolated environment for generated apps      |
| Iterative Refinement       | High     | Medium     | Feedback loop for improvements               |

### Detailed Breakdown

#### 3.1 Agent Orchestration System

```
Tasks:
- [ ] Design agent architecture
- [ ] Implement agent lifecycle management
- [ ] Create agent communication protocol
- [ ] Build agent task queue
- [ ] Implement rate limiting and quotas
- [ ] Add monitoring and logging
```

#### 3.2 Requirement-to-Code Pipeline

```
Tasks:
- [ ] Natural language processing for requirements
- [ ] Requirement classification (UI, API, Database, etc.)
- [ ] Dependency analysis
- [ ] Code template selection
- [ ] Component generation
- [ ] Integration testing automation
```

#### 3.3 Quality Assurance

```
Tasks:
- [ ] Automated code review
- [ ] Security scanning
- [ ] Performance benchmarking
- [ ] Accessibility testing
- [ ] Generated test coverage
```

### Phase 3 Exit Criteria

- [ ] AI agent can generate simple apps from requirements
- [ ] Generated apps pass automated quality checks
- [ ] Users can provide feedback for improvements
- [ ] System handles concurrent generation requests
- [ ] Comprehensive logging and monitoring in place

---

## Phase 4: Deployment & Hosting

### Core Tasks

| Task                  | Priority | Complexity | Description                             |
| --------------------- | -------- | ---------- | --------------------------------------- |
| App Deployment System | Critical | High       | Deploy generated apps to infrastructure |
| Preview Environments  | High     | Medium     | Temporary URLs for app preview          |
| Production Deployment | High     | High       | Stable production hosting               |
| Custom Domains        | Medium   | Medium     | User-owned domain support               |
| SSL/TLS Automation    | Medium   | Low        | Automatic certificate management        |

### Detailed Breakdown

#### 4.1 Deployment Infrastructure

```
Tasks:
- [ ] Container-based app isolation
- [ ] Auto-scaling configuration
- [ ] Health check implementation
- [ ] Rollback mechanisms
- [ ] Zero-downtime deployments
```

#### 4.2 Domain Management

```
Tasks:
- [ ] Domain verification system
- [ ] DNS record management
- [ ] SSL certificate automation
- [ ] Domain routing configuration
- [ ] CDN integration
```

#### 4.3 Monitoring & Analytics

```
Tasks:
- [ ] App performance monitoring
- [ ] Error tracking integration
- [ ] Usage analytics dashboard
- [ ] Uptime monitoring
- [ ] Alerting system
```

### Phase 4 Exit Criteria

- [ ] Apps deploy automatically after generation
- [ ] Preview URLs available within 2 minutes
- [ ] Custom domains configurable by users
- [ ] SSL automatically provisioned
- [ ] Comprehensive monitoring dashboard

---

## Phase 5: Monetization

### Core Tasks

| Task                    | Priority | Complexity | Description        |
| ----------------------- | -------- | ---------- | ------------------ |
| Stripe Integration      | Critical | Medium     | Payment processing |
| Subscription Management | Critical | Medium     | Recurring billing  |
| Usage-Based Billing     | High     | High       | Pay-per-use model  |
| Revenue Dashboard       | High     | Medium     | Earnings tracking  |
| Payout System           | High     | High       | Creator payouts    |

### Detailed Breakdown

#### 5.1 Payment Processing

```
Tasks:
- [ ] Stripe account setup
- [ ] Payment intent creation
- [ ] Webhook handling
- [ ] Receipt generation
- [ ] Refund processing
```

#### 5.2 Subscription Models

```
Tasks:
- [ ] Plan creation UI
- [ ] Trial period support
- [ ] Plan upgrade/downgrade
- [ ] Cancellation handling
- [ ] Grace period logic
```

#### 5.3 Revenue Sharing

```
Tasks:
- [ ] Platform fee calculation
- [ ] Creator earnings tracking
- [ ] Payout scheduling
- [ ] Tax document generation
- [ ] Multi-currency support
```

### Phase 5 Exit Criteria

- [ ] Users can set pricing for apps
- [ ] Stripe payments work end-to-end
- [ ] Subscriptions auto-renew
- [ ] Creators can view earnings
- [ ] Payouts processed monthly

---

## Marketing Phase (Pixel Launch)

> **Status**: In Progress | **Priority**: Critical for user acquisition

### M1: Analytics & Tracking

| Task                                   | Priority | Status  |
| -------------------------------------- | -------- | ------- |
| Facebook Pixel integration             | Critical | Pending |
| Google Analytics 4 events              | High     | Pending |
| Conversion tracking (signup, purchase) | Critical | Pending |
| UTM parameter capture                  | High     | Done    |

### M2: Landing Page Optimization

| Task                               | Priority | Status  |
| ---------------------------------- | -------- | ------- |
| Update hero copy (emotion-focused) | Critical | Done    |
| Update feature benefits (Pixel)    | Critical | Done    |
| Add persona-targeted landing pages | High     | Pending |
| A/B testing framework              | Medium   | Done    |
| Add social proof section           | High     | Pending |
| Add testimonial component          | Medium   | Pending |

### M3: Persona-Based Campaigns

| Task                                | Priority | Status  |
| ----------------------------------- | -------- | ------- |
| Create 10 persona profiles          | High     | Done    |
| Design 3 initial campaign creatives | High     | Pending |
| Set up Facebook Ads Manager         | Critical | Pending |
| Create Instagram content calendar   | Medium   | Pending |
| TikTok content strategy             | Medium   | Pending |

### Priority Personas (Initial Focus)

1. **Tech-Savvy Grandson** (25-35) - Instagram/TikTok
2. **Social Media Historian** (18-30) - TikTok/Instagram
3. **iPhone Upgrader** (25-45) - Instagram/TikTok

See [MARKETING_PERSONAS.md](./MARKETING_PERSONAS.md) for full persona documentation.

---

## Technical Debt & Improvements

### Code Quality

| Task                    | Priority | Impact                |
| ----------------------- | -------- | --------------------- |
| Upgrade to Next.js 16   | Medium   | Better performance    |
| Upgrade to Vitest 4     | Medium   | Improved testing      |
| Add error boundaries    | High     | Better error handling |
| Implement caching layer | Medium   | Faster responses      |
| Add request validation  | High     | Security improvement  |

### Performance

| Task                        | Priority | Impact              |
| --------------------------- | -------- | ------------------- |
| Database query optimization | Medium   | Faster loading      |
| Image optimization          | Low      | Better LCP          |
| Bundle size reduction       | Low      | Faster initial load |
| API response caching        | Medium   | Reduced server load |

### Security

| Task                        | Priority | Impact                  |
| --------------------------- | -------- | ----------------------- |
| Rate limiting               | High     | Abuse prevention        |
| Input sanitization audit    | High     | XSS prevention          |
| CSRF protection review      | Medium   | Security hardening      |
| Dependency audit automation | Medium   | Vulnerability detection |

---

## Milestone Targets

### Q1 2025

- Complete Phase 2 (My Apps Platform)
- Begin Phase 3 prototype

### Q2 2025

- Complete Phase 3 (AI Agent Integration) MVP
- Begin Phase 4

### Q3 2025

- Complete Phase 4 (Deployment & Hosting)
- Begin Phase 5

### Q4 2025

- Complete Phase 5 (Monetization)
- Public launch

---

## How to Contribute

1. Pick a task from the "In Progress" or "Upcoming" sections
2. Create a feature branch: `git checkout -b feature/task-name`
3. Implement with tests (100% coverage required)
4. Submit PR with detailed description
5. Wait for CI checks and code review

See [CLAUDE.md](../CLAUDE.md) for detailed development guidelines.
