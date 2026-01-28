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

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Full schema reference
- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Token System](./TOKEN_SYSTEM.md) - User-level token documentation
