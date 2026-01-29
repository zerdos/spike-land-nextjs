# Workspace Subscription Tiers

This document describes the workspace-level subscription system for the Orbit app.

## Overview

Orbit uses **workspace-level subscriptions** to manage feature limits and pricing. This is distinct from the user-level token system used by Pixel for image enhancements.

| System              | Scope           | Purpose                        |
| ------------------- | --------------- | ------------------------------ |
| Pixel Tokens        | User-level      | AI image enhancement credits   |
| Orbit Subscriptions | Workspace-level | Social media management limits |

## Tier Comparison

| Feature             | FREE      | PRO         | BUSINESS    |
| ------------------- | --------- | ----------- | ----------- |
| **Price**           | $0/month  | $29/month   | $99/month   |
| **Social Accounts** | 3         | 10          | Unlimited   |
| **Scheduled Posts** | 30/month  | Unlimited   | Unlimited   |
| **A/B Tests**       | 1         | 10          | Unlimited   |
| **AI Credits**      | 100/month | 1,000/month | 5,000/month |
| **Team Members**    | 1         | 3           | 10          |

## Implementation Details

### Schema Fields

The `Workspace` model includes:

```prisma
enum WorkspaceSubscriptionTier {
  FREE
  PRO
  BUSINESS
}

model Workspace {
  // ... existing fields
  subscriptionTier     WorkspaceSubscriptionTier @default(FREE)
  maxSocialAccounts    Int     @default(3)
  maxScheduledPosts    Int     @default(30)
  maxAbTests           Int     @default(1)
  monthlyAiCredits     Int     @default(100)
  usedAiCredits        Int     @default(0)
  maxTeamMembers       Int     @default(1)
  billingCycleStart    DateTime?
  stripeSubscriptionId String? @unique
}
```

### Service API

The `WorkspaceSubscriptionService` provides:

```typescript
import { WorkspaceSubscriptionService } from "@/lib/subscription";

// Check limits before operations
const check = await WorkspaceSubscriptionService.canAddSocialAccount(workspaceId);
if (!check.allowed) {
  // Show upgrade prompt
}

// Consume AI credits
const result = await WorkspaceSubscriptionService.consumeAiCredits(workspaceId, amount);

// Upgrade tier
await WorkspaceSubscriptionService.upgradeTier(workspaceId, "PRO");
```

### Monthly Credit Reset

AI credits reset monthly on the billing cycle anniversary. The cron job runs daily at midnight UTC:

- **Path**: `/api/cron/reset-workspace-credits`
- **Schedule**: `0 0 * * *` (daily at midnight UTC)
- **Logic**: Finds workspaces where `billingCycleStart` day matches current day

## Limit Enforcement Points

| Feature                | Enforcement Location                |
| ---------------------- | ----------------------------------- |
| Social account connect | `POST /api/social-accounts`         |
| Post scheduling        | `POST /api/posts/schedule`          |
| A/B test creation      | `POST /api/ab-tests` (Phase 4)      |
| AI feature usage       | AI generation endpoints             |
| Team member invite     | `POST /api/workspaces/[id]/members` |

## Upgrade Flow

1. User clicks "Upgrade" from workspace settings or limit prompt
2. Redirect to Stripe Checkout with workspace metadata
3. Stripe webhook triggers tier upgrade
4. `billingCycleStart` set to upgrade date
5. Limits updated to new tier defaults

## Downgrade Behavior

On downgrade:

- Existing resources (accounts, posts) remain accessible
- Cannot create new resources above new tier limits
- Current month AI credits preserved until reset
- Overage resources marked for manual cleanup

## Testing

The subscription service has 100% test coverage:

```bash
yarn vitest run src/lib/subscription/
```

## Visual Comparison

### Feature Availability Matrix

```
                          FREE         PRO          BUSINESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Social Accounts           3            10           ∞
Scheduled Posts/mo        30           ∞            ∞
A/B Tests                 1            10           ∞
AI Credits/mo             100          1,000        5,000
Team Members              1            3            10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pulse Dashboard           ✓            ✓            ✓
Inbox (Unified)           ✓            ✓            ✓
Allocator (Basic)         ✓            ✓            ✓
Scout (Limited)           ✗            ✓            ✓
Brand Brain               ✗            ✓            ✓
Relay (AI Drafts)         ✗            ✓            ✓
Advanced Analytics        ✗            ✗            ✓
White-Label Reports       ✗            ✗            ✓
Priority Support          ✗            ✗            ✓
Custom Integrations       ✗            ✗            ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Pricing Rationale

### Why These Tiers?

**FREE Tier ($0/month)**:
- **Purpose**: Onboarding funnel, product-qualified leads
- **Target**: Solo creators testing the platform
- **Conversion Goal**: Upgrade within 30 days when hitting limits
- **Economics**: Loss leader (supported by PRO/BUSINESS margins)

**PRO Tier ($29/month)**:
- **Purpose**: Core revenue driver for solo/small teams
- **Target**: Solo content creators, freelancers (1-5 clients)
- **Value Prop**: 10x FREE limits at affordable price point
- **Competitive Positioning**: Undercuts Buffer ($60/mo), Hootsuite ($99/mo)

**BUSINESS Tier ($99/month)**:
- **Purpose**: High-value customers with team needs
- **Target**: Small business marketing teams, freelancers (5+ clients)
- **Value Prop**: Unlimited core features + enterprise extras
- **Competitive Positioning**: 50% cheaper than Sprout Social ($249/mo)

### Price Anchoring Strategy

| Metric | FREE | PRO | BUSINESS |
|--------|------|-----|----------|
| **$/Social Account** | $0 | $2.90 | <$0.50 |
| **$/Team Member** | $0 | $9.67 | $9.90 |
| **$/AI Credit** | $0 | $0.029 | $0.020 |

The BUSINESS tier becomes economically compelling at:
- **7+ social accounts** (vs. PRO's 10 limit)
- **4+ team members** (vs. PRO's 3 limit)
- **5,000+ AI credits/mo** (vs. PRO's 1,000 limit)

## Frequently Asked Questions

### Billing & Payments

**Q: Can I pay annually for a discount?**
A: Annual billing is coming soon with a 20% discount (PRO: $278/year, BUSINESS: $950/year).

**Q: Do you offer monthly invoicing?**
A: BUSINESS tier customers can request NET-30 invoicing. Contact sales@spike.land.

**Q: What payment methods do you accept?**
A: Credit/debit cards (Visa, Mastercard, Amex), PayPal, and wire transfer (BUSINESS tier only).

### Limits & Overages

**Q: What happens if I exceed my social account limit?**
A: You'll be prompted to upgrade or remove accounts. Existing connections remain active.

**Q: What if I run out of AI credits mid-month?**
A: You can purchase one-time credit packs ($10 for 500 credits) or upgrade to a higher tier.

**Q: Do unused AI credits roll over?**
A: No, credits reset monthly on your billing cycle anniversary.

### Upgrades & Downgrades

**Q: Can I upgrade/downgrade anytime?**
A: Yes. Upgrades are immediate. Downgrades take effect at the next billing cycle.

**Q: What happens to my data if I downgrade?**
A: All data is preserved. You simply can't create new resources beyond the new tier limits.

**Q: Do you offer refunds?**
A: We offer a 14-day money-back guarantee for first-time PRO/BUSINESS purchases.

### Features

**Q: What are "AI Credits" used for?**
A: AI credits power Relay (draft generation), Brand Brain analysis, Scout insights, and A/B test recommendations.

**Q: Can FREE users access Relay?**
A: No. Relay (AI draft generation) requires PRO or BUSINESS tier.

**Q: What's the difference between Scout on PRO vs. BUSINESS?**
A: PRO includes basic competitive tracking. BUSINESS adds predictive analytics and custom competitor lists.

### Team Management

**Q: Can I have different team member roles?**
A: Yes. Roles include Owner, Admin, Editor, and Viewer. PRO supports 3 members, BUSINESS supports 10.

**Q: Do team members need separate Orbit accounts?**
A: Yes. Each team member needs their own spike.land account, then you invite them to your workspace.

**Q: Can I remove and add team members freely?**
A: Yes, within your tier limits. Removed members lose workspace access immediately.

### Multi-Workspace (Freelancers/Agencies)

**Q: Can I create multiple workspaces?**
A: Yes. Each workspace requires its own subscription.

**Q: Do you offer multi-workspace discounts?**
A: Agencies managing 3+ workspaces get 15% off. Contact sales@spike.land.

**Q: Can I transfer ownership of a workspace?**
A: Yes. Navigate to Settings → Workspace → Transfer Ownership.

## Comparison to Pixel Token System

**CRITICAL**: Orbit subscriptions are **workspace-level** and distinct from Pixel's **user-level** token system.

| Aspect | Pixel Tokens | Orbit Subscriptions |
|--------|--------------|---------------------|
| **Scope** | User-level (follows your account) | Workspace-level (shared by team) |
| **Purpose** | AI image enhancement credits | Social media management limits |
| **Pricing** | Pay-per-use ($0.99-2.99/image) | Monthly subscription ($0-99/mo) |
| **Persistence** | Tokens never expire | Credits reset monthly |
| **Refills** | Buy more anytime | Automatic monthly reset |
| **Use Case** | Casual photo editing | Professional social media work |

**Why Two Systems?**
- **Different user personas**: Casual users (Pixel) vs. professionals (Orbit)
- **Different economics**: Transactional (Pixel) vs. subscription (Orbit)
- **Cross-sell opportunity**: Orbit users may also use Pixel for image prep

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Full schema reference
- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Token System](./TOKEN_SYSTEM.md) - User-level token documentation (Pixel)
- [Orbit User Guide](./ORBIT_USER_GUIDE.md) - Feature tutorials
- [Marketing Personas](./MARKETING_PERSONAS.md) - Target customer profiles
