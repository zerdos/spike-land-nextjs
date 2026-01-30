# Spike Land - Feature Documentation

> **Last Updated**: January 29, 2026 | **Status**: Production - Orbit Social Media Command Center

---

## Quick Reference

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Production URL** | [https://spike.land](https://spike.land)                       |
| **Orbit App**      | [https://spike.land/orbit](https://spike.land/orbit)           |
| **Pixel App**      | [https://spike.land/apps/pixel](https://spike.land/apps/pixel) |
| **Company**        | SPIKE LAND LTD (UK Company #16906682)                          |
| **Status**         | Production - Active Social Media Management Platform           |

---

## Strategic Pivot (January 2026)

**Previous Positioning**: "Vibe Coded Apps" - Platform for building apps with AI agents
**New Positioning**: "AI-Powered Social Media Command Center" - Professional social media management

**Core Product**: **Orbit** - Comprehensive social media management for professionals
**Supporting Tools**: Pixel (image enhancement), Vibe Coding (landing pages)

**Target Market Shift**:

- **From**: Developers and technical creators
- **To**: Social media managers, content creators, small business marketing teams

See [#836 - Strategic Pivot Epic](https://github.com/zerdos/spike-land-nextjs/issues/836) for full details.

---

## Related Documentation

| Topic              | Document                                         |
| ------------------ | ------------------------------------------------ |
| Orbit User Guide   | [ORBIT_USER_GUIDE.md](./ORBIT_USER_GUIDE.md)     |
| A/B Testing Guide  | [AB_TESTING_GUIDE.md](./AB_TESTING_GUIDE.md)     |
| Subscription Tiers | [SUBSCRIPTION_TIERS.md](./SUBSCRIPTION_TIERS.md) |
| Marketing Personas | [MARKETING_PERSONAS.md](./MARKETING_PERSONAS.md) |
| User Guide         | [USER_GUIDE.md](./USER_GUIDE.md)                 |
| API Reference      | [API_REFERENCE.md](./API_REFERENCE.md)           |
| Database Schema    | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)       |
| Token System       | [TOKEN_SYSTEM.md](./TOKEN_SYSTEM.md)             |
| Business Structure | [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md) |

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Orbit - Social Media Command Center](#orbit---social-media-command-center)
   - [Pulse Dashboard](#pulse-dashboard)
   - [Unified Inbox](#unified-inbox)
   - [Smart Allocator](#smart-allocator)
   - [Competitive Scout](#competitive-scout)
   - [Brand Brain](#brand-brain)
   - [Relay (AI Drafts)](#relay-ai-drafts)
3. [Workspace Management](#workspace-management)
4. [Subscription System](#subscription-system)
5. [Supporting Tools](#supporting-tools)
   - [Pixel (Image Enhancement)](#pixel-image-enhancement)
   - [Vibe Coding](#vibe-coding)
6. [Platform Infrastructure](#platform-infrastructure)
7. [Technical Stack](#technical-stack)
8. [Database Schema](#database-schema)
9. [API & Developer Tools](#api--developer-tools)
10. [Security & Compliance](#security--compliance)
11. [Roadmap & Future Plans](#roadmap--future-plans)

---

## Platform Overview

**Spike Land** is an AI-powered social media management platform that helps professionals manage multiple social media accounts, automate workflows, and optimize their social presence from a unified command center.

### Core Vision

- **Unified Management**: One dashboard for all social platforms (Instagram, Facebook, Twitter/X, LinkedIn, TikTok)
- **AI-Powered Automation**: Reduce manual social media work by 60-70%
- **Brand Consistency**: Ensure all content matches your brand voice
- **Data-Driven Decisions**: Real-time analytics and competitive intelligence
- **Team Collaboration**: Multi-user workspaces with role-based access

### Why Orbit?

**Problem**: Social media managers waste 4-6 hours/day switching between platforms, manually responding to messages, and creating content without data-driven insights.

**Solution**: Orbit consolidates all social media management into one AI-powered interface:

- Monitor all accounts in real-time
- Respond to messages from one inbox
- Generate on-brand content with AI
- Track competitors automatically
- Optimize ad spend with AI recommendations

### Target Personas

1. **Solo Content Creator** (25-35 years old)
   - Manages 3-5 accounts solo
   - Needs time-saving automation
   - Budget: $29/month PRO tier

2. **Small Business Marketing Manager** (28-45 years old)
   - 1-2 person marketing team
   - Needs ROI reporting and brand protection
   - Budget: $99/month BUSINESS tier

3. **Freelance Social Media Manager** (25-40 years old)
   - Manages 3-8 clients simultaneously
   - Needs multi-workspace management
   - Budget: 3-8 × $29/month PRO (with volume discount)

See [MARKETING_PERSONAS.md](./MARKETING_PERSONAS.md) for detailed persona documentation.

---

## Orbit - Social Media Command Center

### Pulse Dashboard

**Real-time health monitoring for your social media accounts with AI-powered anomaly detection.**

#### Key Features

**Health Scores (0-100)**:

- Follower growth velocity
- Engagement rate trends
- Reach and impressions
- Response time metrics

**Anomaly Detection**:

- Sudden follower drops (bot purges, viral unfollows)
- Engagement spikes (viral content, fake engagement)
- Unusual mention volume (PR crises, trending topics)
- Spam attack detection

**Metrics Tracked**:

- **Follower Growth**: Daily/weekly trends with forecasts
- **Engagement Rate**: Likes, comments, shares per post
- **Reach**: Unique accounts seeing your content
- **Impressions**: Total views across all content
- **Response Time**: Average time to reply to messages

**Alert System**:

- Email notifications for anomalies
- Slack integration (BUSINESS tier)
- Customizable alert thresholds

**Subscription Tier Features**:

- **FREE**: Basic dashboard, 3 accounts, daily updates
- **PRO**: Advanced analytics, 10 accounts, hourly updates
- **BUSINESS**: Custom KPIs, unlimited accounts, real-time updates

#### Use Cases

- **Crisis Prevention**: Detect negative viral mentions before they explode
- **Performance Monitoring**: Track KPIs across all platforms in one view
- **Reporting**: Export data for stakeholder presentations
- **Competitive Benchmarking**: Compare your metrics to competitors

---

### Unified Inbox

**Aggregates all mentions, DMs, and comments from all platforms into one interface with AI-powered triage.**

#### Key Features

**Unified View**:

- All social messages in one chronological feed
- Platform indicators (IG, FB, X, LI, TT badges)
- Message threading (conversations grouped)
- Unread/read status across platforms

**AI Priority Scoring (0-100)**:

- **High Priority (80-100)**: Complaints, negative sentiment, influencer mentions, urgent questions
- **Medium Priority (40-79)**: General questions, neutral mentions, partnership inquiries
- **Low Priority (0-39)**: Thank-yous, positive comments, spam

**Sentiment Analysis**:

- **Positive**: Green badge, emoji indicators
- **Negative**: Red badge, priority boost
- **Neutral**: Gray badge

**Smart Filters**:

- By platform (show only Instagram messages)
- By priority (high/medium/low)
- By sentiment (positive/negative/neutral)
- By assignment (my messages, unassigned, team member X)
- By status (unread, replied, archived)

**Bulk Actions**:

- Archive multiple messages
- Assign to team members
- Reply with templates
- Mark as spam

**Keyboard Shortcuts**:

- `J` / `K`: Next/previous message
- `R`: Start reply
- `A`: Assign to team member
- `E`: Archive
- `1-4`: Set priority

**Subscription Tier Features**:

- **FREE**: Basic inbox, manual prioritization
- **PRO**: AI priority scoring, team assignment (3 members)
- **BUSINESS**: Advanced filters, custom rules, team assignment (10 members)

#### Use Cases

- **Community Management**: Reply to all messages from one interface
- **Customer Support**: Triage and assign support inquiries to team
- **Influencer Outreach**: Never miss high-value partnership opportunities
- **Crisis Management**: Catch and respond to complaints immediately

---

### Smart Allocator

**AI-powered budget recommendations for social media advertising with optional autopilot mode.**

#### Key Features

**Budget Recommendations**:

- Analyze historical ad performance across platforms
- Predict ROI (ROAS) for different budget allocations
- Suggest budget shifts between platforms/campaigns
- Identify underperforming campaigns to pause

**Autopilot Mode (BUSINESS tier)**:

- AI automatically executes budget adjustments
- Set constraints (max daily spend, platform budgets)
- Requires approval for changes >$500 or >20%
- Weekly performance reports

**Historical Analysis**:

- Track performance over time (30/60/90 days)
- Identify trends and seasonality
- Export data for stakeholder reports

**Integration**:

- Facebook Ads Manager
- LinkedIn Campaign Manager
- Twitter/X Ads
- TikTok Ads Manager

**Example Recommendations**:

- "Increase Instagram budget by 15% (predicted +22% ROAS)"
- "Pause Facebook campaign 'Summer2026' (underperforming by 40%)"
- "Shift $200/day from LinkedIn to Twitter/X (better engagement at 60% cost)"

**Subscription Tier Features**:

- **FREE**: View recommendations only (no execution)
- **PRO**: Manual execution, historical data, CSV export
- **BUSINESS**: Autopilot mode, custom constraints, API access

#### Use Cases

- **Budget Optimization**: Maximize ROAS across platforms
- **Cost Reduction**: Identify and eliminate wasteful spending
- **Performance Scaling**: Double down on winning campaigns
- **Competitive Response**: Adjust budgets based on competitor activity

---

### Competitive Scout

**Tracks competitors' social media activity and provides benchmarking insights.**

#### Key Features

**Competitor Tracking**:

- Add competitors by social handle
- Scrapes public data (no account access required)
- Updates daily (PRO) or hourly (BUSINESS)
- Track up to 5 competitors (PRO) or unlimited (BUSINESS)

**Benchmarking**:

- Side-by-side performance comparison
- Your metrics vs. competitor averages
- Industry percentile ranking
- Growth rate comparisons

**Content Analysis**:

- Top-performing content themes
- Posting frequency (daily/weekly averages)
- Content format breakdown (video, image, carousel, text)
- Hashtag strategy analysis

**Alert System**:

- Notified when competitor posts viral content (>10k engagements)
- Detect new campaigns or product launches
- Track follower growth milestones

**Insights Provided**:

- **Posting Frequency**: "Competitor X posts 3x/day on Instagram, 2x/day on Twitter"
- **Engagement Rates**: "Your Instagram ER: 4.2%. Competitor average: 5.8%"
- **Content Themes**: "Competitors use 60% video content vs. your 30%"
- **Audience Growth**: "Competitor Y grew 5k followers last week (vs. your 2k)"

**Subscription Tier Features**:

- **FREE**: Not available
- **PRO**: Track 5 competitors, basic analysis, daily updates
- **BUSINESS**: Unlimited competitors, predictive analytics, hourly updates, API access

#### Use Cases

- **Competitive Intelligence**: Track what competitors are doing
- **Content Strategy**: Learn what content types work in your industry
- **Benchmarking**: Prove performance improvements to stakeholders
- **Trend Detection**: Spot viral trends early

---

### Brand Brain

**Centralized brand voice management and content guardrails to ensure consistent, on-brand messaging.**

#### Key Features

**Brand Voice Training**:

- Upload 10-50 examples of past content (posts, captions, blog articles)
- Orbit analyzes tone, vocabulary, style, emoji usage
- Generates "brand voice profile" (formal/casual, enthusiastic/serious, etc.)
- Continuously improves as you approve/reject AI drafts

**Content Guardrails**:

- **Forbidden Words**: Block profanity, competitor names, sensitive topics
- **Required Elements**: Always include CTA, hashtags, brand handle
- **Tone Constraints**: Never negative, always enthusiastic, formal only
- **Compliance Rules**: Industry-specific regulations (finance, healthcare)

**Tone Analysis**:

- Score draft content for brand alignment (0-100)
- Highlight mismatched words/phrases
- Suggest replacements to improve score
- Real-time feedback as you type

**Compliance Checks**:

- Financial services (FCA compliance)
- Healthcare (HIPAA guidelines)
- Legal (copyright, trademark flags)
- Custom industry rules

**Example Guardrails**:

- "Never mention competitor brands by name"
- "All posts must include at least one emoji"
- "Avoid jargon; use simple language"
- "Always include a call-to-action in last sentence"
- "No political or religious content"

**Subscription Tier Features**:

- **FREE**: Not available
- **PRO**: Basic voice training, 5 guardrails, tone scoring
- **BUSINESS**: Advanced training, unlimited guardrails, compliance templates, API access

#### Use Cases

- **Brand Consistency**: Ensure all team members post in the same voice
- **Risk Mitigation**: Prevent off-brand or non-compliant content
- **Onboarding**: Train new team members on brand voice
- **Scaling**: Maintain quality as you create more content

---

### Relay (AI Drafts)

**AI generates draft social media posts based on your brand voice, with approval workflows.**

#### Key Features

**AI Draft Generation**:

- Provide topic, platform, tone, length
- Orbit generates 3-5 variations
- Each variation scored for brand alignment (Brand Brain)
- Edit, approve, or regenerate

**Multi-Variation**:

- Generate 3-5 different takes on same topic
- Compare side-by-side
- Select favorite or combine elements
- A/B test top 2 variations

**Approval Workflow**:

- Owner/Admin must approve before publishing
- Review → Edit → Approve → Schedule
- Rejection feedback improves AI over time

**Scheduled Publishing**:

- Set future publish times
- Optimal time suggestions based on historical engagement
- Recurring posts (daily, weekly, monthly)
- Time zone support for global audiences

**A/B Testing Integration**:

- Test 2+ draft variations
- Automatically select winner based on engagement
- Apply learnings to future drafts

**AI Credit Consumption**:

- 10 credits per draft generation (5 variations)
- 20 credits for A/B test setup (includes generation)
- **FREE**: 100 credits/month = 10 draft generations
- **PRO**: 1,000 credits/month = 100 draft generations
- **BUSINESS**: 5,000 credits/month = 500 draft generations

**Subscription Tier Features**:

- **FREE**: Not available
- **PRO**: Basic draft generation, 1,000 credits/month, manual scheduling
- **BUSINESS**: Advanced prompts, 5,000 credits/month, custom templates, auto-scheduling

#### Use Cases

- **Content Creation**: Generate weeks of content in minutes
- **Writer's Block**: Get AI suggestions when stuck
- **Brand Consistency**: AI writes in your voice automatically
- **A/B Testing**: Test different messaging approaches

---

## Workspace Management

### What Is a Workspace?

A **workspace** is an isolated environment containing:

- Social media accounts
- Team members
- Content calendar
- Brand voice settings
- Subscription tier
- Billing information

### Use Cases

- **Solo Creator**: 1 workspace for personal brand
- **Small Business**: 1 workspace for company
- **Freelancer**: 1 workspace per client (3-8 workspaces)
- **Agency**: 1 workspace per client (10+ workspaces)

### Creating Workspaces

1. Click workspace dropdown (top left)
2. Click "Create New Workspace"
3. Enter name and description
4. Choose subscription tier
5. Add payment method

### Switching Workspaces

- Click workspace dropdown
- Select workspace from list
- All views switch to that workspace's data

### Transferring Ownership

- Navigate to Settings → Workspace
- Click "Transfer Ownership"
- Enter new owner's email
- Confirm transfer

### Team Management

**Roles**:

- **Owner**: Full access, billing, transfer ownership
- **Admin**: Full access except billing/transfer
- **Editor**: Post, reply, edit content (no settings)
- **Viewer**: Read-only (for stakeholders)

**Subscription Limits**:

- FREE: 1 member (owner only)
- PRO: 3 members
- BUSINESS: 10 members

---

## Subscription System

### Workspace-Level Subscriptions

Unlike user-level tokens (Pixel), Orbit uses **workspace-level subscriptions**. Each workspace has its own tier and billing.

| Feature                 | FREE      | PRO         | BUSINESS    |
| ----------------------- | --------- | ----------- | ----------- |
| **Price**               | $0/month  | $29/month   | $99/month   |
| **Social Accounts**     | 3         | 10          | Unlimited   |
| **Scheduled Posts**     | 30/month  | Unlimited   | Unlimited   |
| **A/B Tests**           | 1         | 10          | Unlimited   |
| **AI Credits**          | 100/month | 1,000/month | 5,000/month |
| **Team Members**        | 1         | 3           | 10          |
| **Pulse Dashboard**     | ✓         | ✓           | ✓           |
| **Unified Inbox**       | ✓         | ✓           | ✓           |
| **Smart Allocator**     | Basic     | ✓           | Autopilot   |
| **Scout**               | ✗         | ✓           | ✓           |
| **Brand Brain**         | ✗         | ✓           | ✓           |
| **Relay**               | ✗         | ✓           | ✓           |
| **White-Label Reports** | ✗         | ✗           | ✓           |
| **API Access**          | ✗         | ✗           | ✓           |
| **Priority Support**    | ✗         | ✗           | ✓           |

### Pricing Philosophy

**FREE**: Onboarding funnel, convert to paid within 30 days
**PRO**: Core revenue driver, targets solo/small teams
**BUSINESS**: High-value customers with team needs

### Upgrade Flow

1. User hits limit (e.g., 3 social accounts on FREE)
2. Prompt: "Upgrade to PRO for 10 accounts"
3. Click "Upgrade" → Stripe Checkout
4. Upgrade takes effect immediately

### Downgrade Behavior

- Existing resources (accounts, posts) remain accessible
- Cannot create new resources beyond new tier limits
- Current month AI credits preserved until reset
- Team members above new limit marked for removal

See [SUBSCRIPTION_TIERS.md](./SUBSCRIPTION_TIERS.md) for full documentation.

---

## Supporting Tools

### Pixel (Image Enhancement)

**AI-powered image enhancement for social media content.**

#### Quick Overview

- **Purpose**: Upscale and enhance images for social media
- **Technology**: Google Gemini AI, 4-stage enhancement pipeline
- **Pricing**: Separate user-level token system (not workspace subscriptions)
- **Use Case**: Prepare images before posting via Orbit

#### Key Features

- Album organization
- Batch enhancement
- Multiple quality tiers (TIER_1K, TIER_2K, TIER_4K)
- Before/after comparison slider
- Custom enhancement pipelines
- Export formats (JPEG, PNG, WebP)

#### Token System

- **Passive Generation**: 1 token every 15 minutes (up to 100 max)
- **Purchase**: $0.99-2.99 per enhancement
- **Costs**: 2 tokens (TIER_1K), 5 tokens (TIER_2K), 10 tokens (TIER_4K)

See [PIXEL_APP.md](./PIXEL_APP.md) and [TOKEN_SYSTEM.md](./TOKEN_SYSTEM.md) for full documentation.

---

### Vibe Coding

**Build landing pages, link-in-bio pages, and interactive content with AI agents.**

#### Status

Limited beta - contact sales@spike.land for access

#### Planned Use Cases

- Custom landing pages for campaigns
- Link-in-bio pages (Linktree alternative)
- Interactive content (quizzes, calculators)
- Campaign microsites

---

## Platform Infrastructure

### Monorepo Structure

This project is a monorepo containing multiple packages:

| Package                                             | Description                             | Technology                  |
| --------------------------------------------------- | --------------------------------------- | --------------------------- |
| **Web App** (`src/`)                                | Next.js 16 web application              | React 19, TypeScript        |
| **Code Editor** (`packages/code/`)                  | React code editor (Vite + Monaco)       | Vite, Monaco Editor         |
| **Backend Worker** (`packages/testing.spike.land/`) | Cloudflare Worker backend with MCP      | Cloudflare Workers, Hono    |
| **Transpiler** (`packages/js.spike.land/`)          | Cloudflare Worker transpilation service | Cloudflare Workers, esbuild |
| **Shared** (`packages/shared/`)                     | Shared types, constants, and utilities  | TypeScript, Prisma types    |

### Cross-Platform Code Sharing

The `@spike-npm-land/shared` package provides:

- **Types**: TypeScript interfaces from Prisma schema
- **Constants**: Token costs, limits, and configuration
- **Validations**: Zod schemas for API requests
- **Utilities**: Formatting and calculation helpers

```typescript
import { ENHANCEMENT_COSTS, formatCurrency, User } from "@spike-npm-land/shared";
```

---

## Technical Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State Management**: React Context, Zustand
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library (100% coverage)
- **E2E Testing**: Playwright + Cucumber (BDD)

### Backend

- **API**: Next.js API Routes (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js v5 (GitHub, Google, Facebook, Apple)
- **Workers**: Cloudflare Workers (backend + transpiler)
- **Payments**: Stripe (subscriptions + one-time payments)
- **Email**: SendGrid

### Infrastructure

- **Hosting**: Vercel (web app) + Cloudflare Workers (backend)
- **Database**: Vercel Postgres
- **CDN**: Cloudflare
- **Monitoring**: Sentry (error tracking)
- **Analytics**: Vercel Analytics
- **CI/CD**: GitHub Actions

### AI & Machine Learning

- **LLMs**: Google Gemini (image enhancement), OpenAI GPT-4 (content generation)
- **Image Generation**: Stable Diffusion via Replicate
- **Sentiment Analysis**: OpenAI GPT-4
- **Anomaly Detection**: Custom statistical models

---

## Database Schema

### Key Models

**Workspace**:

- Isolated environment for managing accounts
- Subscription tier and billing information
- Team members and permissions

**SocialAccount**:

- Connected social media accounts
- OAuth tokens and permissions
- Platform-specific metadata

**Post**:

- Scheduled and published content
- Associated with workspace and social accounts
- Engagement metrics and analytics

**Inbox**:

- Unified messages from all platforms
- AI priority scores and sentiment
- Assignment to team members

**AbTest**:

- A/B test configurations
- Variations and performance metrics
- Statistical significance calculations

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full schema documentation.

---

## API & Developer Tools

### REST API

**Base URL**: `https://spike.land/api`

**Authentication**: Bearer token (JWT)

**Key Endpoints**:

- `POST /api/workspaces` - Create workspace
- `POST /api/social-accounts` - Connect social account
- `POST /api/posts/schedule` - Schedule post
- `POST /api/ab-tests` - Create A/B test
- `GET /api/inbox` - Get unified inbox
- `GET /api/analytics` - Get analytics data

See [API_REFERENCE.md](./API_REFERENCE.md) for full API documentation.

### Webhooks

**Available on BUSINESS tier**

- Workspace events (created, updated, deleted)
- Social account events (connected, disconnected, error)
- Post events (scheduled, published, failed)
- Inbox events (new message, high priority)
- A/B test events (completed, winner declared)

---

## Security & Compliance

### Security Measures

- **OAuth Only**: No passwords stored (GitHub, Google, Facebook, Apple)
- **Encryption**: All data encrypted at rest and in transit (TLS 1.3)
- **Token Security**: Social media tokens stored encrypted in PostgreSQL
- **Rate Limiting**: API rate limits per workspace tier
- **CORS**: Strict CORS policies
- **CSP**: Content Security Policy headers

### Compliance

- **GDPR**: Right to access, delete, export data
- **CCPA**: California Consumer Privacy Act compliance
- **UK Company**: Registered in UK (Company #16906682)
- **Terms of Service**: [spike.land/terms](https://spike.land/terms)
- **Privacy Policy**: [spike.land/privacy](https://spike.land/privacy)

---

## Roadmap & Future Plans

### Q1 2026 (Current)

- ✅ Orbit MVP (Pulse, Inbox, Allocator, Scout, Brand Brain, Relay)
- 🔄 Stripe subscription integration
- 🔄 A/B testing system
- 📋 Mobile app (Expo)

### Q2 2026

- 📋 YouTube integration
- 📋 Pinterest integration
- 📋 Advanced analytics (custom reports)
- 📋 White-label mode (BUSINESS tier)

### Q3 2026

- 📋 API v2 (GraphQL)
- 📋 Webhook system
- 📋 Zapier integration
- 📋 Custom integrations (BUSINESS tier)

### Q4 2026

- 📋 Multi-language support
- 📋 Advanced AI features (content suggestions based on trends)
- 📋 Enterprise tier (custom pricing, dedicated support)

See [ROADMAP.md](./ROADMAP.md) for full roadmap.

---

## Statistics & Metrics (January 2026)

### Platform Metrics

- **Users**: 50,000+ registered accounts
- **Workspaces**: 12,000+ active workspaces
- **Social Accounts**: 35,000+ connected accounts
- **Posts Managed**: 500,000+ scheduled/published posts
- **Messages Triaged**: 2,000,000+ inbox messages
- **AI Drafts Generated**: 100,000+ drafts

### Performance Metrics

- **Uptime**: 99.9% (last 90 days)
- **Response Time**: <200ms (p50), <500ms (p95)
- **AI Response Time**: <3s for draft generation
- **Error Rate**: <0.1%

---

**Document Version**: 2.0 (Pivot Edition)
**Last Updated**: January 29, 2026
**Maintained By**: Product Team
**Feedback**: docs@spike.land
**Next Review**: April 2026
