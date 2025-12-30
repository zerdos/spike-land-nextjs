# Implementation Plan for Issue #409: Complete Unimplemented TODO Features

## Summary

I identified **8 TODO items** across 6 files in production code:

| #   | File                                       | Line     | TODO                           |
| --- | ------------------------------------------ | -------- | ------------------------------ |
| 1   | `src/app/settings/subscription/page.tsx`   | 233      | Token pack purchase            |
| 2   | `src/app/api/boxes/route.ts`               | 99       | Docker container creation      |
| 3   | `src/app/api/boxes/[id]/messages/route.ts` | 76       | Agent messaging                |
| 4-5 | `src/lib/marketing/google-ads-client.ts`   | 492, 521 | Currency from account settings |
| 6-7 | `src/lib/marketing/facebook-client.ts`     | 380, 413 | Currency from account settings |
| 8   | `src/lib/marketing/campaign-sync.ts`       | 40       | Proper decryption              |

## Priority Matrix

| TODO                | Priority | Complexity | Risk   |
| ------------------- | -------- | ---------- | ------ |
| Token Pack Purchase | P1       | Medium     | Low    |
| Currency (Google)   | P2       | Low        | Low    |
| Currency (Facebook) | P2       | Low        | Low    |
| Token Decryption    | P2       | Medium     | Medium |
| Docker Container    | P3       | High       | High   |
| Agent Messaging     | P3       | High       | High   |

## Phase 1: Quick Wins (Currency Settings)

### Google Ads Currency Fix

1. Modify `GoogleAdsClient` to cache customer info including currency
2. Update `getCampaignMetrics` to accept/fetch currency
3. Use actual currency from customer data

### Facebook Ads Currency Fix

1. Store account currency when calling `getAccounts()`
2. Pass currency through to `getCampaignMetrics`
3. Use the `currency` field from `FacebookAdAccount`

## Phase 2: Token Pack Purchase

1. Create `useTokenPackPurchase` hook (follow `useTierUpgrade.ts` pattern)
2. Call existing `/api/stripe/checkout` with `mode: "payment"` and `packageId`
3. Handle redirect to Stripe checkout URL

## Phase 3: Token Encryption

See Issue #406 - already planned separately.

## Phase 4: Container & Agent System (Future)

Requires significant architectural decisions:

1. Choose container orchestration platform (Fly.io, Railway, Docker API)
2. Design agent communication protocol
3. Implement container provisioning queue

## Questions

1. **Token Encryption**: What encryption key management strategy?
2. **Docker Containers**: What target infrastructure?
3. **Agent Communication**: HTTP polling, WebSocket, SSE, or message queue?
4. **Priority Confirmation**: Do currency fixes first while container system is
   designed?

## Critical Files

- `/src/hooks/useTierUpgrade.ts` - Pattern for token pack purchase hook
- `/src/app/api/stripe/checkout/route.ts` - Existing checkout endpoint
- `/src/lib/marketing/google-ads-client.ts` - Google Ads currency
- `/src/lib/marketing/facebook-client.ts` - Facebook currency
- `/src/app/api/boxes/route.ts` - Docker container creation
