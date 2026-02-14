# Spike Land - Development Roadmap

> **Last Updated**: February 14, 2026
> **Current Phase**: Monetization & Growth
> **Business Structure**: UK Limited Company (SPIKE LAND LTD - Company #16906682)
> **Branch**: `feature/new-mcp-tools`

---

## Vision: The Agent-Native Social Media Platform

**Spike Land is the first social media management platform built for AI agents, not just humans.**

While Buffer, Hootsuite, and Sprout Social are dashboards that humans click through, Orbit is infrastructure that AI agents can operate. Every feature is exposed as an MCP tool. Every workflow can be automated. Every action can be triggered by Claude, GPT, or any agent framework through the Model Context Protocol.

**The moat is three things no competitor has together:**

1. **MCP-native architecture** - 35+ tools callable by any AI agent via standard protocol
2. **Dual credit economy** - Workspace subscriptions + usage-based AI credits
3. **UK Ltd with Stripe-first billing** - Global payments, VAT handling, SEIS/EIS eligible

**Positioning**: AI-Powered Social Media Command Center
**Core Product**: Orbit (social media management)
**Supporting Tools**: Pixel (image enhancement), Vibe Coding (landing pages)
**Target Market**: Solo creators, freelance social media managers, small business marketing teams

---

## Current State (February 2026)

### What's Built

| Area | Status | Details |
|------|--------|---------|
| **Orbit Core** | Production | Pulse Dashboard, Unified Inbox, Smart Allocator, Competitive Scout, Brand Brain, Relay |
| **MCP Server** | Production | 35+ tools, SDK 1.26.0, 98% business logic coverage |
| **Pixel** | Production | AI image enhancement, tiered pricing (FREE/1K/2K/4K) |
| **Workspace System** | Production | Multi-tenant, FREE/PRO/BUSINESS tiers |
| **Auth** | Production | NextAuth v5 (GitHub, Google, Facebook, Apple) |
| **Stripe** | 75% | Subscriptions + one-time payments |
| **Dev Workflow Tools** | Production | 5 MCP tools for local development (dev_logs, dev_status, github_status, file_guard, notify_agent) |
| **Security** | Hardened | Command injection prevention, input validation, 6 critical bugs fixed Feb 14 |

### Tech Stack

- **Framework**: Next.js 16.1.6 (App Router) | **Language**: TypeScript 5.9.3 (strict)
- **Database**: PostgreSQL + Prisma 7.4.0 | **Cache**: Upstash Redis
- **AI**: Google Gemini (gemini-3-flash), Anthropic Claude (Agent SDK 0.2.42)
- **Testing**: Vitest 4.0.18 (80% line/function coverage enforced in CI)
- **Payments**: Stripe 20.3.1 | **Email**: Resend 6.9.2
- **Infra**: Vercel (web) + Cloudflare Workers (code editor, transpiler, backend)

### Scale

- 150+ Next.js page routes
- 47 component directories
- 35 MCP tool modules (23,777 lines)
- 100+ Prisma models

---

## Monetization Strategy

### Tier 1: Workspace Subscriptions (Live)

Current pricing, competitive against mid-market:

| Tier | Price | Social Accounts | AI Credits/mo | Team Members |
|------|-------|----------------|---------------|-------------|
| FREE | $0 | 3 | 100 | 1 |
| PRO | $29 | 10 | 1,000 | 3 |
| BUSINESS | $99 | Unlimited | 5,000 | 10 |

**Competitive positioning**: PRO undercuts Buffer ($60/mo) and Hootsuite ($99/mo). BUSINESS is 50% cheaper than Sprout Social ($249/mo).

### Tier 2: MCP Agent Access (Q1-Q2 2026) - THE DIFFERENTIATOR

No competitor offers this. Package the MCP server as a paid API product for AI agents.

| Access Level | Price | API Calls/mo | Capabilities |
|-------------|-------|-------------|-------------|
| Included in BUSINESS | $0 extra | 1,000 | Read-only (reports, analytics) |
| API PRO add-on | $49/mo | 10,000 | Full read/write (schedule, respond, test) |
| API SCALE add-on | $149/mo | 100,000 | Webhooks, batch operations |

**Call weighting**: Read = 1 call, Write = 5, AI operation = 10, Batch = 25

**Why it works**: A freelancer builds a Claude agent that monitors 8 Orbit workspaces, auto-responds to low-priority messages, generates weekly reports, flags anomalies -- all through MCP. No competitor enables this. API users have 3-5x lower churn because integrations are costly to switch.

**Implementation**: Low-medium effort. MCP tools already exist. Need rate limiting, metered billing, developer docs.

### Tier 3: Agency SCALE Tier (Q2 2026)

Volume pricing for freelancers/agencies managing multiple clients:

| Configuration | Monthly | Per-Workspace |
|--------------|---------|--------------|
| 5 workspaces (base) | $149 | $29.80 |
| 10 workspaces | $249 | $24.90 |
| 20 workspaces | $399 | $19.95 |

**Includes**: Cross-workspace dashboard, white-label reports, client billing pass-through, 10K API calls/mo.

**Why it works**: Freelancers currently pay 5x$29=$145 with no volume discount, no cross-workspace view. SCALE gives actual client separation with unified management. Agencies have 24+ month retention -- LTV of $3,576-$9,576 per customer.

### Tier 4: Outcome-Based Autopilot (Q3-Q4 2026)

Charge per measurable outcome, not per feature:

| Outcome | Price |
|---------|-------|
| AI-drafted post approved & published | $0.50 |
| AI auto-response sent to inbox message | $0.25 |
| Weekly performance report generated | $2.00 |
| Competitor alert with actionable insight | $1.00 |
| A/B test completed with winner declared | $3.00 |

**Phase 1**: Autopilot Lite (AI drafts, human approves with one click)
**Phase 2**: Full Autopilot (AI acts within Brand Brain guardrails, >90% approval rate threshold)

**Why it works**: Aligns revenue with customer success. A creator publishing 60 posts + handling 200 DMs pays $80/mo in Autopilot on top of $29 PRO = $109/mo total. Pure upside with no feature-gating friction.

### Tier 5: Unified Credit Economy (Ongoing)

Merge Pixel tokens and Orbit AI credits into "Spike Credits":

| Tier | Included Credits | Overage Rate |
|------|-----------------|-------------|
| FREE | 100 | N/A |
| PRO | 2,000 | $0.008/credit |
| BUSINESS | 10,000 | $0.006/credit |
| SCALE | 50,000 | $0.004/credit |

**Why**: Eliminates dual-system confusion (user-level Pixel tokens vs workspace-level Orbit credits). Overage revenue scales without adding features.

---

## UK Tax Advantages & Funding

### Available Now

| Scheme | Benefit | Estimated Value |
|--------|---------|----------------|
| R&D Tax Credits (RDEC) | 20% credit on qualifying AI/ML R&D spend | $6,000-8,100 on $30K spend |
| SEIS | 50% investor tax relief, $250K lifetime | First funding round |
| EIS | 30% investor tax relief, $5M annual | Follow-on rounds |
| Patent Box | Reduces Corporation Tax to 10% on qualifying IP | When profitable |

### Grants to Apply For

| Grant | Amount | Timeline |
|-------|--------|----------|
| Sovereign AI PoC Grant | $50-84K | Applications open Aug 2025 |
| British Business Bank Startup Loan | $25K at 6% fixed | Apply anytime |
| Innovate UK Smart Grant | $25-500K | Rolling applications |

**Year 1 estimated tax benefit**: $11,000-19,000

---

## Development Phases

### Completed Phases

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Business Foundation | Done | UK Ltd incorporated Dec 2025, Monzo Business, UTR received |
| 1 | Database Schema | Done | PostgreSQL + Prisma, 100+ models |
| 2 | Backend Infrastructure | Done | Auth, MCP server, AI integration |
| 3 | Frontend Development | Done | Orbit UI, 150+ routes, shadcn/ui |
| 4 | Testing & QA | Done | Vitest, 80% coverage enforced |
| 9 | Documentation | 95% | All docs updated except FEATURES.md |

### In Progress

#### Phase 5: Stripe Integration (75%)

- [x] Payment intent creation
- [x] Webhook handling
- [x] Subscription management
- [ ] Annual billing with 20% discount
- [ ] Metered billing for API/Autopilot usage
- [ ] Credit pack one-time purchases ($10 for 500 credits)

#### Phase 11: Tech Debt Reduction (20%)

- [x] Full repo audit (BAZDMEG method)
- [x] 8 stale smoke test issues closed
- [x] Root-level unused deps removed
- [x] 6 critical security bugs fixed (command injection prevention)
- [x] Dev workflow MCP tools added (5 tools, 25 tests)
- [ ] Remove 38 unused deps from packages/code
- [ ] Audit and remove 253 unused files
- [ ] Increase test coverage to 80% (from ~30%)
- [ ] Fix Sentry MCP API token permissions

### Upcoming

#### Phase 12: MCP Agent Access Product (Q1-Q2 2026)

**Goal**: Package MCP server as paid API product

| Task | Priority | Status |
|------|----------|--------|
| API rate limiting per workspace | Critical | Planned |
| API key management UI | Critical | Partially built |
| Usage metering (calls tracked in DB) | Critical | Planned |
| Developer documentation | High | Planned |
| MCP marketplace listings (Apify, Glama, LobeHub) | High | Planned |
| Webhook subscriptions for API SCALE | Medium | Planned |

**Exit criteria**: API PRO add-on purchasable, rate-limited, metered, documented.

#### Phase 13: Agency SCALE Tier (Q2 2026)

**Goal**: Multi-workspace volume pricing for agencies

| Task | Priority | Status |
|------|----------|--------|
| Cross-workspace aggregation queries | Critical | Planned |
| Volume pricing in WorkspaceSubscriptionService | Critical | Planned |
| White-label report templates | High | Planned |
| Consolidated Stripe billing | High | Planned |
| Cross-workspace dashboard UI | High | Planned |
| Client billing pass-through | Medium | Planned |

**Exit criteria**: SCALE tier purchasable, cross-workspace dashboard live, consolidated billing working.

#### Phase 14: Orbit Autopilot (Q3-Q4 2026)

**Goal**: Outcome-based AI automation add-on

| Task | Priority | Status |
|------|----------|--------|
| Autopilot Lite (AI drafts, human approves) | Critical | Planned |
| Outcome tracking and billing | Critical | Planned |
| Brand Brain guardrail enforcement | High | Planned |
| Confidence scoring for auto-actions | High | Planned |
| Budget cap management | High | Planned |
| Full Autopilot (>90% approval threshold) | Medium | Planned |

**Exit criteria**: Autopilot Lite purchasable, outcomes tracked, budget caps enforced.

---

## Revenue Projections

### Year 1 Targets (2026)

| Revenue Stream | Q1 | Q2 | Q3 | Q4 | Annual |
|---------------|-----|-----|-----|-----|--------|
| Workspace subscriptions | $2K | $5K | $10K | $18K | $35K |
| MCP API access | - | $2K | $5K | $8K | $15K |
| Agency SCALE tier | - | $3K | $8K | $12K | $23K |
| Autopilot add-on | - | - | $2K | $5K | $7K |
| Credit overages | $500 | $1K | $3K | $5K | $9.5K |
| UK tax benefits | - | - | - | $15K | $15K |
| **Total** | **$2.5K** | **$11K** | **$28K** | **$63K** | **$104.5K** |

### Key Metrics to Track

- **Credit utilization rate** by tier (hitting limits? too much headroom?)
- **Overage conversion rate** (% who hit limits and buy more vs. churn)
- **MCP API adoption rate** (% of BUSINESS users enabling API access)
- **Multi-workspace expansion rate** (agencies adding workspaces over time)
- **Autopilot approval rate** (% of AI-drafted actions approved by humans)
- **Net Revenue Retention** (target: >110%)

---

## Competitive Landscape

| Competitor | Price | Agents? | MCP? | Our Advantage |
|-----------|-------|---------|------|--------------|
| Buffer | $5-60/channel | No | No | Unified credits + AI automation |
| Hootsuite | $99+/mo | No | No | 50% cheaper BUSINESS tier |
| Later | $25-80/mo | No | No | Outcome-based pricing option |
| Sprout Social | $199-399/seat | No | No | 75% cheaper + agent API |
| SocialBee | $19-99/mo | No | No | Full MCP integration |

**No social media management tool offers programmatic AI agent access as a product.** This is the gap.

---

## Growth Playbook (First 90 Days)

### Month 1: Foundation

- [ ] List MCP server on Apify, Glama.ai, LobeHub
- [ ] Create "Build a social media agent in 10 minutes" tutorial
- [ ] Launch on Product Hunt (Orbit + MCP angle)
- [ ] Set up referral program (existing infrastructure from Pixel)

### Month 2: Content & Community

- [ ] Publish weekly "Agent Automation" blog series
- [ ] Create MCP tool development template for third-party devs
- [ ] Launch Discord community for Orbit users
- [ ] Partner with 3-5 AI tool creators for cross-promotion

### Month 3: Scale

- [ ] Launch Agency SCALE tier
- [ ] Run first paid ads (target: freelance social media managers)
- [ ] Apply for Sovereign AI PoC Grant
- [ ] Begin SEIS funding round (target: $150K)

---

## MCP Ecosystem Expansion

### Current MCP Tools (35)

| Category | Count | Examples |
|----------|-------|---------|
| Auth & Admin | 5 | OAuth, user management, API keys |
| Content & Media | 6 | Albums, images, chat, blog |
| AI & Generation | 4 | Image gen, text-to-speech, enhancement |
| Social & Workspace | 5 | Workspaces, settings, social accounts |
| Billing & Credits | 3 | Subscriptions, credit management |
| Arena & Skills | 3 | Challenges, skill store |
| Dev Tools | 5 | Logs, status, file guard, notifications |
| Other | 4 | Gateway, vault, codespace, pipelines |

### Planned MCP Tools

| Tool | Priority | Phase |
|------|----------|-------|
| `apply_brand_style` | High | Phase 12 |
| `post_to_platform` | High | Phase 12 |
| `schedule_post` | High | Phase 12 |
| `get_engagement` | Medium | Phase 12 |
| `cross_workspace_report` | High | Phase 13 |
| `autopilot_configure` | High | Phase 14 |
| `autopilot_status` | Medium | Phase 14 |

---

## Legacy Phases (Historical Reference)

The following phases represent the original "Vibe Coded Apps" roadmap, superseded by the January 2026 strategic pivot:

| Phase | Name | Status |
|-------|------|--------|
| Phase 2: My Apps Platform | Complete | Pixel app, token economy, admin tools |
| Phase 3: AI Agent Integration | Superseded | Partially evolved into MCP tools |
| Phase 4: Deployment & Hosting | Superseded | Vercel + Cloudflare covers this |
| Phase 5: Monetization (original) | Superseded | Replaced by multi-stream strategy above |
| Marketing Phase (Pixel Launch) | Archived | Persona work reused for Orbit targeting |

---

## How to Contribute

1. Pick a task from "In Progress" or "Upcoming" phases
2. Create a feature branch: `git checkout -b feature/task-name`
3. Implement with tests (must satisfy CI coverage thresholds: 80% lines/functions, 75% branches)
4. Submit PR with detailed description
5. Wait for CI checks and code review

See [CLAUDE.md](../CLAUDE.md) for detailed development guidelines.
