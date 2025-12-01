# Stripe Integration Plan

## Overview

Implement a token-based payment system for AI image enhancements using Stripe.

## Pricing Model

### One-Time Token Packages

| Package | Tokens | Price (GBP) | Per Token | Best For |
|---------|--------|-------------|-----------|----------|
| Starter | 10 | £2.99 | £0.30 | Try it out |
| Basic | 50 | £9.99 | £0.20 | Casual users |
| Pro | 150 | £24.99 | £0.17 | Regular users |
| Power | 500 | £69.99 | £0.14 | Heavy users |

### Subscription Plans (Monthly)

| Plan | Monthly Tokens | Price/Month | Per Token | Extras |
|------|----------------|-------------|-----------|--------|
| Hobby | 30 | £4.99/mo | £0.17 | Rollover up to 30 |
| Creator | 100 | £12.99/mo | £0.13 | Rollover up to 100, Priority |
| Studio | 300 | £29.99/mo | £0.10 | Unlimited rollover, Priority, API |

### Token Cost per Enhancement

| Enhancement Tier | Tokens Required |
|-----------------|-----------------|
| 1K Enhancement | 1 token |
| 2K Enhancement | 2 tokens |
| 4K Enhancement | 5 tokens |

---

## Implementation Plan

### Phase 1: Database Schema

Add to `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  tokenBalance     Int      @default(0)
  stripeCustomerId String?  @unique
  subscription     Subscription?
  tokenTransactions TokenTransaction[]
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  stripeSubscriptionId String @unique
  stripePriceId     String
  status            SubscriptionStatus
  currentPeriodEnd  DateTime
  tokensPerMonth    Int
  rolloverTokens    Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model TokenTransaction {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Int      // positive = credit, negative = debit
  type        TransactionType
  description String?
  stripePaymentId String?
  createdAt   DateTime @default(now())
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  UNPAID
}

enum TransactionType {
  PURCHASE
  SUBSCRIPTION_CREDIT
  ENHANCEMENT_DEBIT
  REFUND
  BONUS
}
```

### Phase 2: Stripe Setup

1. **Environment Variables**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Stripe Products** (to create in Dashboard)
   - Token Packages (one-time):
     - prod_starter_10 (10 tokens)
     - prod_basic_50 (50 tokens)
     - prod_pro_150 (150 tokens)
     - prod_power_500 (500 tokens)
   - Subscription Plans:
     - prod_hobby_monthly (30 tokens/mo)
     - prod_creator_monthly (100 tokens/mo)
     - prod_studio_monthly (300 tokens/mo)

### Phase 3: Backend Routes

#### `/api/stripe/checkout/route.ts`
- POST: Create Checkout Session
- Input: `{ priceId, mode: 'payment' | 'subscription' }`
- Output: `{ sessionId, url }`

#### `/api/stripe/webhook/route.ts`
- POST: Handle Stripe webhooks
- Events to handle:
  - `checkout.session.completed` - Credit tokens
  - `invoice.paid` - Monthly subscription credit
  - `customer.subscription.updated` - Status changes
  - `customer.subscription.deleted` - Cancellation

#### `/api/tokens/balance/route.ts` (exists, update if needed)
- GET: Return user's current token balance

#### `/api/tokens/deduct/route.ts`
- POST: Deduct tokens for enhancement
- Input: `{ tier: '1K' | '2K' | '4K' }`
- Validates sufficient balance before deduction

### Phase 4: Frontend Pages

#### `/pricing/page.tsx`
- Display all token packages and subscriptions
- Checkout buttons for each option
- FAQ section

#### `/settings/tokens/page.tsx`
- Token balance display
- Transaction history
- Buy more tokens button
- Subscription management (cancel, upgrade)

#### Components
- `TokenBalance.tsx` - Shows balance in header/dashboard
- `BuyTokensModal.tsx` - Quick purchase modal
- `InsufficientTokensAlert.tsx` - Shown when trying to enhance with no tokens

### Phase 5: Token Consumption

Update `/api/images/enhance/route.ts`:
1. Check user's token balance
2. If insufficient, return 402 Payment Required
3. If sufficient, proceed with enhancement
4. Deduct tokens on successful enhancement start
5. Refund tokens if enhancement fails

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   └── webhook/route.ts
│   │   └── tokens/
│   │       ├── balance/route.ts
│   │       └── deduct/route.ts
│   ├── pricing/
│   │   └── page.tsx
│   └── settings/
│       └── tokens/
│           └── page.tsx
├── components/
│   ├── stripe/
│   │   ├── PricingCard.tsx
│   │   ├── CheckoutButton.tsx
│   │   └── SubscriptionManager.tsx
│   └── tokens/
│       ├── TokenBalance.tsx
│       ├── BuyTokensModal.tsx
│       └── InsufficientTokensAlert.tsx
└── lib/
    └── stripe/
        ├── client.ts
        ├── products.ts
        └── webhook-handlers.ts
```

---

## Implementation Order

1. **Database Schema** - Add token and subscription models
2. **Stripe Library** - Install and configure `stripe` package
3. **Checkout Route** - Enable purchases
4. **Webhook Route** - Handle payment success
5. **Pricing Page** - Display options
6. **Token Balance** - Show in UI
7. **Token Deduction** - Integrate with enhancement flow
8. **Subscription Logic** - Monthly credits and rollover

---

## Security Considerations

- Webhook signature verification
- Server-side token balance checks (never trust client)
- Rate limiting on checkout creation
- Idempotency keys for payment processing
- Audit logging for all token transactions

---

## Testing Plan

1. Use Stripe test mode throughout development
2. Test cards: 4242424242424242 (success), 4000000000000002 (decline)
3. Use Stripe CLI for local webhook testing
4. E2E tests for full checkout flow

---

## Next Steps

1. Run database migration to add new models
2. Get Stripe API keys from dashboard
3. Create products in Stripe dashboard
4. Implement checkout and webhook routes
5. Build pricing page UI
