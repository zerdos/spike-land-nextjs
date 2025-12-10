# Stripe Payment Testing Guide

## Quick Start

### Prerequisites

```bash
# 1. Install Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Start webhook forwarding (in separate terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Payment Flow (5 minutes)

1. **Start local dev server**:

```bash
yarn dev
```

2. **Open pricing page**:

```
http://localhost:3000/pricing
```

3. **Sign in** (if not already authenticated)

4. **Click "Buy Now"** on any package

5. **Use test card in Stripe Checkout**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Name: Any name
   - Email: Your email

6. **Complete payment**

7. **Verify success**:
   - Should redirect to `/enhance?purchase=success`
   - Check terminal for webhook logs
   - Check database for new tokens

## Test Cards

### Successful Payments

```
Card Number          Description
4242 4242 4242 4242  Successful payment (US)
4000 0082 6000 0000  Successful payment (UK)
5555 5555 5555 4444  Successful payment (Mastercard)
3782 822463 10005    Successful payment (Amex)
```

### Failed Payments

```
Card Number          Error Type
4000 0000 0000 0002  Generic decline
4000 0000 0000 9995  Insufficient funds
4000 0000 0000 9987  Lost card
4000 0000 0000 9979  Stolen card
4000 0000 0000 0069  Expired card
4000 0000 0000 0127  Incorrect CVC
4000 0000 0000 0119  Processing error
4242 4242 4242 4241  Incorrect number
```

### 3D Secure Testing

```
Card Number          Description
4000 0027 6000 3184  3DS required, auth succeeds
4000 0082 6000 3178  3DS required, auth fails
```

## Testing Scenarios

### ✅ Scenario 1: Successful Purchase (Happy Path)

**Steps**:

1. Go to `/pricing` as authenticated user
2. Click "Buy Now" on Starter Pack (10 tokens, £2.99)
3. Use card `4242 4242 4242 4242`
4. Complete payment

**Expected**:

- Redirect to `/enhance?purchase=success&session_id=cs_test_...`
- Webhook received: `checkout.session.completed`
- Database updated:
  - `user_token_balances.balance` increased by 10
  - New `token_transactions` record (type: EARN_PURCHASE)
  - New `stripe_payments` record (status: SUCCEEDED)

**Verify**:

```bash
# Check webhook in terminal
# Should see: [Stripe] Credited 10 tokens to user <userId>

# Check database
yarn prisma studio
# Navigate to: user_token_balances, token_transactions, stripe_payments
```

---

### ❌ Scenario 2: Declined Payment

**Steps**:

1. Go to `/pricing`
2. Click "Buy Now"
3. Use card `4000 0000 0000 0002` (generic decline)
4. Complete form

**Expected**:

- Stripe shows error: "Your card was declined"
- User stays on Stripe Checkout
- Can retry with different card
- No tokens credited
- No database changes

**Verify**:

```bash
# Check Stripe CLI logs - should NOT see checkout.session.completed
# Database should be unchanged
```

---

### 🔄 Scenario 3: Unauthenticated User

**Steps**:

1. Sign out
2. Go to `/pricing`
3. Click "Buy Now"

**Expected**:

- Redirect to `/?callbackUrl=/pricing`
- Login page shown
- After login, return to `/pricing`
- Can then complete purchase

**Verify**:

```tsx
// Code in page.tsx handles this:
if (!session) {
  window.location.href = "/?callbackUrl=/pricing";
  return;
}
```

---

### ⏱️ Scenario 4: Session Loading State

**Steps**:

1. Go to `/pricing`
2. Observe buttons on initial page load

**Expected**:

- Buttons briefly disabled while `status === "loading"`
- Buttons enable when session loads (1-2 seconds)
- Button text shows "Buy Now" when ready

**Verify**:

```tsx
// Buttons disabled only during auth check:
disabled={loading === id || status === "loading"}
```

---

### 💰 Scenario 5: Multiple Packages

**Steps**:

1. Purchase Starter Pack (10 tokens, £2.99)
2. Verify balance: 10 tokens
3. Purchase Basic Pack (50 tokens, £9.99)
4. Verify balance: 60 tokens

**Expected**:

- Tokens accumulate (no cap on purchased tokens)
- Each purchase creates separate transaction record
- Balance increases correctly

**Verify**:

```sql
SELECT * FROM token_transactions
WHERE "userId" = '<userId>'
ORDER BY "createdAt" DESC;

-- Should see two EARN_PURCHASE records
```

---

### 🔁 Scenario 6: Subscription Flow

**Steps**:

1. Go to `/pricing`
2. Click "Subscribe" on a subscription plan
3. Complete payment with test card
4. Check subscription status

**Expected**:

- Initial tokens credited immediately
- Subscription record created with status: ACTIVE
- Recurring payments handled by `invoice.paid` webhook

**Verify**:

```sql
SELECT * FROM subscriptions WHERE "userId" = '<userId>';
-- Should show: status = 'ACTIVE', tokensPerMonth, currentPeriodEnd
```

---

### 🚫 Scenario 7: Duplicate Webhook (Idempotency)

**Steps**:

1. Complete a purchase
2. Find the event ID in Stripe CLI logs
3. Resend the same webhook:
   ```bash
   stripe events resend evt_test_...
   ```

**Expected**:

- Webhook processes successfully (200 OK)
- Tokens NOT credited again (idempotency)
- Transaction `sourceId` prevents duplicates

**Verify**:

```sql
SELECT "sourceId", COUNT(*)
FROM token_transactions
GROUP BY "sourceId"
HAVING COUNT(*) > 1;

-- Should return no rows (no duplicates)
```

---

### ⚠️ Scenario 8: Checkout API Errors

**Test invalid package ID**:

```bash
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"packageId":"invalid","mode":"payment"}'

# Expected: {"error":"Invalid package ID"} (400)
```

**Test unauthenticated request**:

```bash
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"packageId":"starter","mode":"payment"}'

# Expected: {"error":"Unauthorized"} (401)
```

**Test missing packageId**:

```bash
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"mode":"payment"}'

# Expected: {"error":"Package ID required for payment"} (400)
```

---

### 🎯 Scenario 9: End-to-End Token Usage

**Steps**:

1. Start with 0 tokens
2. Purchase Starter Pack (10 tokens)
3. Go to `/enhance`
4. Upload image
5. Enhance with TIER_1K (costs 2 tokens)
6. Verify balance: 8 tokens remaining

**Expected**:

- Purchase creates `EARN_PURCHASE` transaction (+10)
- Enhancement creates `SPEND_ENHANCEMENT` transaction (-2)
- Net balance: 8 tokens

**Verify**:

```sql
SELECT
  "type",
  amount,
  "balanceAfter"
FROM token_transactions
WHERE "userId" = '<userId>'
ORDER BY "createdAt";

-- EARN_PURCHASE:     +10, balance=10
-- SPEND_ENHANCEMENT: -2,  balance=8
```

---

## Webhook Testing

### Test Webhook Locally

```bash
# Terminal 1: Start dev server
yarn dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

### Verify Webhook Signature

```bash
# Get webhook signing secret from Terminal 2 output
# Should look like: whsec_...

# Add to .env.local
echo "STRIPE_WEBHOOK_SECRET=whsec_..." >> .env.local

# Restart dev server
# Webhooks should now verify successfully
```

### Check Webhook Logs

```bash
# Stripe CLI shows all events
# Look for:
✓ Received event checkout.session.completed
✓ -> POST http://localhost:3000/api/stripe/webhook [200]

# Server logs show processing
[Stripe] Credited 10 tokens to user clu123...
```

## Database Verification Queries

### Check Token Balance

```sql
SELECT
  u.email,
  utb.balance,
  utb."lastRegeneration"
FROM user_token_balances utb
JOIN users u ON u.id = utb."userId"
WHERE u.email = 'test@example.com';
```

### Check Recent Transactions

```sql
SELECT
  tt."createdAt",
  tt.type,
  tt.amount,
  tt."balanceAfter",
  tt.source,
  tt."sourceId"
FROM token_transactions tt
JOIN users u ON u.id = tt."userId"
WHERE u.email = 'test@example.com'
ORDER BY tt."createdAt" DESC
LIMIT 10;
```

### Check Payments

```sql
SELECT
  sp."createdAt",
  sp."tokensGranted",
  sp."amountUSD",
  sp.status,
  sp."stripePaymentIntentId"
FROM stripe_payments sp
JOIN users u ON u.id = sp."userId"
WHERE u.email = 'test@example.com'
ORDER BY sp."createdAt" DESC;
```

### Check Failed Payments

```sql
SELECT
  "createdAt",
  "amountUSD",
  status,
  metadata
FROM stripe_payments
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC;
```

## Automated Testing

### Run Unit Tests

```bash
# All tests
yarn test:coverage

# Specific test suites
yarn test src/app/pricing/page.test.tsx
yarn test src/app/api/stripe/checkout/route.test.ts
yarn test src/app/api/stripe/webhook/route.test.ts
```

### Expected Coverage

All files should have 100% coverage:

- ✅ Statements: 100%
- ✅ Branches: 100%
- ✅ Functions: 100%
- ✅ Lines: 100%

## Troubleshooting

### Webhook Not Received

**Symptoms**:

- Payment succeeds in Stripe
- Tokens not credited
- No webhook logs in terminal

**Fix**:

1. Check `stripe listen` is still running
2. Verify forwarding URL is correct: `localhost:3000/api/stripe/webhook`
3. Check webhook secret in `.env.local`
4. Restart dev server after changing env vars

### Signature Verification Failed

**Symptoms**:

- Webhook received but returns 400
- Error: "Webhook signature verification failed"

**Fix**:

1. Get correct secret from `stripe listen` output
2. Update `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```
3. Restart dev server

### Tokens Not Credited

**Symptoms**:

- Webhook received (200 OK)
- But balance doesn't increase

**Debug**:

1. Check server logs for errors
2. Verify metadata in webhook payload:
   ```json
   {
     "userId": "clu123...",
     "packageId": "starter",
     "tokens": "10",
     "type": "token_purchase"
   }
   ```
3. Check database for transaction record
4. Verify Prisma client is connected

### Session Loading Forever

**Symptoms**:

- Buttons stay disabled indefinitely
- `status === "loading"` never changes

**Fix**:

1. Check browser console for errors
2. Verify NextAuth is configured correctly
3. Check session cookie is set
4. Clear cookies and re-login

## Production Testing

### Before Deploying

1. **Switch to test mode in production**:
   ```bash
   # Use test keys in production first
   STRIPE_SECRET_KEY=sk_test_...
   ```

2. **Test on deployed preview**:
   - Deploy to Vercel preview
   - Configure webhook to preview URL
   - Run full test suite on preview

3. **Switch to live mode**:
   ```bash
   # Only after testing succeeds
   STRIPE_SECRET_KEY=sk_live_...
   ```

### Production Checklist

- [ ] Live webhook configured in Stripe Dashboard
- [ ] Webhook signing secret updated in Vercel
- [ ] Test purchase with real card (refund after)
- [ ] Verify tokens credited correctly
- [ ] Check all email notifications work
- [ ] Monitor first 10 real purchases closely

## Support Queries

### "Why are my tokens missing?"

**Investigation**:

1. Ask for email address
2. Check `stripe_payments` table for status
3. Check `token_transactions` for credit record
4. If webhook missed, manually credit tokens
5. Check Stripe Dashboard for payment status

### "Payment failed but I was charged"

**Investigation**:

1. Check Stripe Dashboard for charge status
2. If charge succeeded but webhook failed:
   - Manually trigger webhook or credit tokens
3. If charge actually failed:
   - Confirm no hold on their card (holds drop in 5-7 days)
4. If unclear, escalate to Stripe support

### "Can I get a refund?"

**Process**:

1. Check tokens were not spent
2. If tokens unused, issue refund via Stripe Dashboard
3. Subtract tokens from balance
4. Log refund in `stripe_payments` (status: REFUNDED)

## Monitoring Queries

### Daily Payment Volume

```sql
SELECT
  DATE("createdAt") as date,
  COUNT(*) as payments,
  SUM("amountUSD") as revenue,
  SUM("tokensGranted") as tokens_sold
FROM stripe_payments
WHERE status = 'SUCCEEDED'
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

### Payment Success Rate

```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM stripe_payments
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Popular Packages

```sql
SELECT
  metadata->>'packageId' as package,
  COUNT(*) as purchases,
  SUM("tokensGranted") as total_tokens,
  SUM("amountUSD") as total_revenue
FROM stripe_payments
WHERE status = 'SUCCEEDED'
  AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY metadata->>'packageId'
ORDER BY purchases DESC;
```

## References

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
