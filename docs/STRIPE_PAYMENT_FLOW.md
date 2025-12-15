# Stripe Payment Flow Documentation

## Overview

Spike Land uses Stripe for secure payment processing to sell token packages.
This document describes the complete payment flow, configuration, and testing
procedures.

## Architecture

### Components

1. **Pricing Page** (`src/app/pricing/page.tsx`)
   - Displays token packages with pricing
   - Handles "Buy Now" button clicks
   - Redirects unauthenticated users to login
   - Initiates checkout for authenticated users

2. **Checkout API** (`src/app/api/stripe/checkout/route.ts`)
   - Creates Stripe Checkout sessions
   - Manages Stripe customer records
   - Supports both one-time payments and subscriptions
   - Validates user authentication and package IDs

3. **Webhook Handler** (`src/app/api/stripe/webhook/route.ts`)
   - Receives payment confirmation from Stripe
   - Credits tokens to user accounts
   - Handles subscription lifecycle events
   - Records transactions in database

### Database Models

```prisma
User {
  stripeCustomerId: String?  // Links user to Stripe customer
  tokenBalance: UserTokenBalance
}

UserTokenBalance {
  userId: String
  balance: Int  // Current token count
  lastRegeneration: DateTime
}

TokenTransaction {
  userId: String
  amount: Int  // Positive for credits, negative for spends
  type: TokenTransactionType  // EARN_PURCHASE, SPEND_ENHANCEMENT, etc.
  source: String  // "stripe", "subscription", etc.
  sourceId: String  // Stripe session/payment ID
  balanceAfter: Int
}

StripePayment {
  userId: String
  packageId: String
  tokensGranted: Int
  amountUSD: Decimal
  stripePaymentIntentId: String
  status: StripePaymentStatus
}

Subscription {
  userId: String
  stripeSubscriptionId: String
  status: SubscriptionStatus
  tokensPerMonth: Int
  rolloverTokens: Int
  maxRollover: Int
}
```

## Payment Flow

### One-Time Token Purchase

```
1. User clicks "Buy Now" on pricing page
   ↓
2. Frontend checks authentication
   - If not authenticated → redirect to login with callback
   - If authenticated → proceed to step 3
   ↓
3. Frontend calls POST /api/stripe/checkout
   - Body: { packageId: "starter", mode: "payment" }
   ↓
4. Backend validates request
   - Check user session
   - Validate package ID exists
   - Get or create Stripe customer
   ↓
5. Backend creates Stripe Checkout session
   - Mode: "payment"
   - Price calculated from TOKEN_PACKAGES
   - Metadata: userId, packageId, tokens, type
   ↓
6. Frontend redirects to Stripe Checkout
   - User enters payment details on Stripe
   - Stripe processes payment
   ↓
7. Stripe sends webhook to /api/stripe/webhook
   - Event: checkout.session.completed
   ↓
8. Webhook handler credits tokens
   - Updates UserTokenBalance
   - Creates TokenTransaction record
   - Creates StripePayment record
   ↓
9. User redirected to success URL
   - URL: /enhance?purchase=success&session_id={CHECKOUT_SESSION_ID}
```

### Subscription Flow

```
1. User clicks "Subscribe" on pricing page
   ↓
2. Frontend calls POST /api/stripe/checkout
   - Body: { planId: "hobby", mode: "subscription" }
   ↓
3. Backend validates no active subscription exists
   ↓
4. Backend creates Stripe Checkout session
   - Mode: "subscription"
   - Recurring: monthly
   - Metadata: userId, planId, tokensPerMonth, maxRollover
   ↓
5. Stripe processes initial payment
   ↓
6. Webhook handler (checkout.session.completed)
   - Creates Subscription record
   - Credits initial tokens
   ↓
7. Monthly renewal (invoice.paid event)
   - Calculates rollover tokens
   - Credits new month's tokens
   - Records transaction
```

## Configuration

### Environment Variables

```bash
# Required for production
STRIPE_SECRET_KEY=sk_live_...           # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Public key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret

# For development/testing
STRIPE_SECRET_KEY=sk_test_...           # Stripe test mode key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...         # Test webhook secret
```

### Token Packages

Configured in `src/lib/stripe/client.ts`:

```typescript
export const TOKEN_PACKAGES = {
  starter: { tokens: 10, price: 2.99, name: "Starter Pack" },
  basic: { tokens: 50, price: 9.99, name: "Basic Pack" },
  pro: { tokens: 150, price: 24.99, name: "Pro Pack" },
  power: { tokens: 500, price: 69.99, name: "Power Pack" },
} as const;
```

**Note**: Prices use dynamic price creation (no Stripe product IDs needed). The
checkout API creates prices on-the-fly during session creation.

### Subscription Plans

```typescript
export const SUBSCRIPTION_PLANS = {
  hobby: { tokensPerMonth: 30, priceGBP: 4.99, maxRollover: 30, name: "Hobby" },
  creator: {
    tokensPerMonth: 100,
    priceGBP: 12.99,
    maxRollover: 100,
    name: "Creator",
  },
  studio: {
    tokensPerMonth: 300,
    priceGBP: 29.99,
    maxRollover: 0,
    name: "Studio",
  },
} as const;
```

## Webhook Setup

### Local Development

1. Install Stripe CLI:

```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:

```bash
stripe login
```

3. Forward webhooks to local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy webhook signing secret to `.env.local`:

```bash
# Output from stripe listen command
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Start dev server:

```bash
yarn dev
```

6. Test payment flow:
   - Go to http://localhost:3000/pricing
   - Click "Buy Now" (use test card: 4242 4242 4242 4242)
   - Check terminal for webhook events

### Production

1. Configure webhook in Stripe Dashboard:
   - URL: `https://spike.land/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. Copy webhook signing secret to production environment:

```bash
# In Vercel dashboard or CLI
vercel env add STRIPE_WEBHOOK_SECRET production
```

## Security

### PCI Compliance

- ✅ **Never store card data** - All card details handled by Stripe
- ✅ **Use Stripe Checkout** - PCI-compliant hosted checkout
- ✅ **Webhook signature verification** - All webhooks verified with
  STRIPE_WEBHOOK_SECRET
- ✅ **HTTPS only** - All production traffic encrypted
- ✅ **No sensitive data in logs** - Card details never logged

### Best Practices

1. **Idempotency**: All webhook handlers use `sourceId` to prevent duplicate
   credits
2. **Authentication**: All checkout requests require valid session
3. **Input validation**: Package IDs and prices validated before creating
   sessions
4. **Error handling**: Failed payments don't crash, users see clear error
   messages
5. **Rate limiting**: Checkout API has size limits on request bodies

## Testing

### Unit Tests

All components have 100% test coverage:

```bash
# Run all tests
yarn test:coverage

# Run specific test files
yarn test src/app/pricing/page.test.tsx
yarn test src/app/api/stripe/checkout/route.test.ts
yarn test src/app/api/stripe/webhook/route.test.ts
```

### Manual Testing Checklist

#### Token Purchase Flow

- [ ] Visit `/pricing` as unauthenticated user
  - [ ] Click "Buy Now" → should redirect to login
- [ ] Sign in and return to `/pricing`
  - [ ] Click "Buy Now" → should open Stripe Checkout
- [ ] In Stripe Checkout:
  - [ ] Use test card: `4242 4242 4242 4242`
  - [ ] Use any future expiry date
  - [ ] Use any CVC
  - [ ] Complete payment
- [ ] Verify redirect to `/enhance?purchase=success`
- [ ] Check database:
  ```sql
  SELECT * FROM user_token_balances WHERE "userId" = 'USER_ID';
  SELECT * FROM token_transactions WHERE "userId" = 'USER_ID' ORDER BY "createdAt" DESC;
  SELECT * FROM stripe_payments WHERE "userId" = 'USER_ID' ORDER BY "createdAt" DESC;
  ```

#### Failed Payment

- [ ] Use test card: `4000 0000 0000 0002` (declined)
- [ ] Verify tokens NOT credited
- [ ] Verify user returned to pricing page

#### Duplicate Webhook Prevention

- [ ] Manually trigger same webhook twice
- [ ] Verify tokens only credited once (check `sourceId` uniqueness)

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Processing error: 4000 0000 0000 0119
Expired card: 4000 0000 0000 0069
```

## Monitoring

### Key Metrics

1. **Payment Success Rate**

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'SUCCEEDED') * 100.0 / COUNT(*) as success_rate
FROM stripe_payments
WHERE "createdAt" > NOW() - INTERVAL '7 days';
```

2. **Average Order Value**

```sql
SELECT AVG("amountUSD") as avg_order
FROM stripe_payments
WHERE status = 'SUCCEEDED'
  AND "createdAt" > NOW() - INTERVAL '30 days';
```

3. **Token Velocity**

```sql
-- Tokens purchased vs spent
SELECT
  SUM(amount) FILTER (WHERE type LIKE 'EARN_%') as tokens_earned,
  ABS(SUM(amount)) FILTER (WHERE type = 'SPEND_ENHANCEMENT') as tokens_spent
FROM token_transactions
WHERE "createdAt" > NOW() - INTERVAL '7 days';
```

### Error Monitoring

Check logs for:

- `[Stripe] Webhook signature verification failed` - Invalid webhook secret
- `STRIPE_SECRET_KEY is not configured` - Missing env var
- `No userId in checkout session metadata` - Metadata corruption

## Troubleshooting

### "Buy Now" buttons disabled

**Cause**: User session is still loading (`status === "loading"`)

**Solution**: Wait 1-2 seconds for authentication to complete. Buttons enable
automatically.

**Code**:

```tsx
disabled={loading === id || status === "loading"}
```

### Tokens not credited after payment

**Possible causes**:

1. **Webhook not received**
   - Check Stripe Dashboard → Developers → Webhooks → Event logs
   - Verify webhook endpoint URL is correct
   - Check webhook signing secret matches

2. **Webhook signature verification failed**
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check server logs for verification errors

3. **Database transaction failed**
   - Check server logs for database errors
   - Verify Prisma schema matches database

**Resolution steps**:

```bash
# 1. Check Stripe event logs
stripe events list --limit 10

# 2. Retry webhook manually
stripe events resend evt_XXXXX

# 3. Verify webhook secret
stripe webhooks list

# 4. Test webhook locally
stripe trigger checkout.session.completed
```

### Duplicate token credits

**Cause**: Webhook received multiple times but `sourceId` not checked

**Prevention**: All webhook handlers use `sourceId` in transaction records to
ensure idempotency.

**Check**:

```sql
SELECT "sourceId", COUNT(*) as count
FROM token_transactions
GROUP BY "sourceId"
HAVING COUNT(*) > 1;
```

### Checkout session creation fails

**Possible causes**:

1. **Invalid package ID**: Check `TOKEN_PACKAGES` in client.ts
2. **Missing Stripe customer**: Should be created automatically
3. **Invalid price configuration**: Prices must be positive numbers
4. **Stripe API error**: Check Stripe Dashboard for API logs

**Debug**:

```typescript
// Check package validation
console.log(TOKEN_PACKAGES[packageId]); // Should not be undefined

// Check price configuration
const price = TOKEN_PACKAGES[packageId].price;
console.log(typeof price === "number" && price > 0); // Should be true
```

## Deployment Checklist

Before deploying to production:

- [ ] Switch to live Stripe keys (not test keys)
- [ ] Configure production webhook in Stripe Dashboard
- [ ] Set all three environment variables in Vercel
- [ ] Test checkout flow in production
- [ ] Verify webhook events received
- [ ] Monitor first few purchases closely
- [ ] Set up alerts for payment failures
- [ ] Document customer support process for payment issues

## Support

### For Users

If payment issues occur:

1. Check if charge appears in bank statement
2. Check token balance at `/enhance`
3. Contact support with:
   - Stripe session ID (from success URL)
   - Email used for payment
   - Screenshot of issue

### For Developers

Debugging resources:

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API logs: Dashboard → Developers → Logs
- Webhook logs: Dashboard → Developers → Webhooks
- Test mode toggle: Dashboard → Top right corner

## Future Enhancements

Potential improvements:

1. **Stripe Customer Portal** - Let users manage subscriptions
2. **Invoices** - Email receipts automatically
3. **Discounts** - Promotional codes and coupons
4. **Analytics** - Revenue tracking dashboard
5. **Refunds** - Automated refund handling for failed enhancements
6. **Multiple currencies** - Support USD, EUR in addition to GBP
7. **Payment methods** - Add Apple Pay, Google Pay
8. **Saved cards** - Let users save payment methods

## References

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
