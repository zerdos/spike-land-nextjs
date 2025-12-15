# Token System Documentation

> **Last Updated**: December 2025 **Status**: MVP Release

---

## Table of Contents

1. [Token Overview](#token-overview)
2. [Token Acquisition](#token-acquisition)
3. [Token Packages](#token-packages)
4. [Subscription Plans](#subscription-plans)
5. [Automatic Regeneration](#automatic-regeneration)
6. [Token Balance & Consumption](#token-balance--consumption)
7. [API Reference](#api-reference)
8. [Transaction History](#transaction-history)
9. [Token Pricing](#token-pricing)

---

## Token Overview

**Tokens** are the primary currency on the Spike Land platform. Every Spike Land
user has a single token balance that can be spent across any app on the
platform. Apps built on Spike Land consume these platform tokens to provide
premium features.

Currently, the **Pixel** image enhancement app uses tokens to pay for AI-powered
image enhancements. As more apps are added to the platform, they will all share
this same token economy.

### Key Characteristics

- **Platform Currency**: Tokens belong to your Spike Land account, not to
  individual apps
- **Cross-App Usage**: One token balance works across all apps on the platform
- **Non-transferable**: Cannot be gifted between users
- **Non-refundable**: Consumed tokens cannot be recovered (except on service
  failure)
- **Expiration**: Free regenerated tokens expire after 30 days if unused
- **Account-Specific**: Each user maintains a single platform-wide token balance

### Token Balance Limits

- **Maximum Balance**: 100 tokens (applies to regenerated tokens only)
- **Storage Duration**: Purchased tokens never expire; regenerated tokens expire
  after 30 days
- **Subscription Tokens**: Reset monthly, with optional rollover (up to max)

---

## Token Acquisition

Users can acquire tokens through four primary mechanisms:

### 1. Automatic Regeneration

**Free tokens generated automatically**

- **Rate**: 1 token per 15 minutes
- **Maximum**: 100 tokens max
- **Expiration**: 30 days of inactivity
- **Cost**: Free
- **Automatic**: No user action required

**Example Timeline**:

- Hour 0: Balance = 0
- Hour 0:15: Balance = 1
- Hour 0:30: Balance = 2
- ...
- Hour 25:00: Balance = 100 (capped)

**Use Case**: Casual users who want to try features without spending

### 2. Voucher Redemption

**Promotional codes providing bonus tokens**

Available Vouchers:

- **LAUNCH100**: 100 tokens (limited to 1000 uses)
- **WELCOME50**: 50 tokens (unlimited)
- **BETA25**: 25 tokens (limited to 500 uses)

**Redemption Rules**:

- One voucher per user (cannot redeem same code twice)
- Vouchers can be combined (user can redeem LAUNCH100 and WELCOME50)
- No expiration on active vouchers
- Tokens added immediately upon redemption

**Use Case**: New users, promotional campaigns, beta testing

### 3. Stripe Purchases (One-Time)

**Direct token purchases with credit/debit card**

**Available Packages**:

| Package      | Tokens | Price (GBP) | Price/Token | Best For          |
| ------------ | ------ | ----------- | ----------- | ----------------- |
| Starter      | 50     | 2.99        | 0.06        | Single use        |
| Essential    | 150    | 7.99        | 0.05        | Monthly usage     |
| Professional | 500    | 19.99       | 0.04        | Heavy usage       |
| Enterprise   | 2000   | 59.99       | 0.03        | Team/organization |

**Payment Details**:

- Currency: British Pounds (GBP)
- Payment Method: Credit/Debit card via Stripe
- Processing: Instant (tokens credited immediately)
- Refund: 30-day refund window via Stripe
- Tokens purchased never expire

**Use Case**: Users who want more tokens immediately

### 4. Subscription Plans

**Monthly recurring subscriptions with automatic token allocation**

**Available Plans**:

| Plan         | Tokens/Month | Price/Month (GBP) | Rollover | Best For      |
| ------------ | ------------ | ----------------- | -------- | ------------- |
| Starter      | 20           | 2.99              | 20       | Casual users  |
| Professional | 100          | 9.99              | 100      | Regular users |
| Enterprise   | 500          | 29.99             | 250      | Power users   |

**Subscription Features**:

- **Auto-Renewal**: Monthly billing until cancelled
- **Rollover**: Unused tokens carry over to next month (up to max)
- **Pause**: Can pause subscription for up to 3 months
- **Cancel**: Cancel anytime with access until billing period ends
- **Upgrade**: Change plans mid-month (prorated)
- **Downgrade**: Effective next billing cycle

**Rollover Example** (Professional Plan):

- Month 1: Allocated 100, Used 30, Rollover = 70
- Month 2: Allocated 100 + Rollover 70 = 170 (capped at 100)
- Month 3: Allocated 100, Current = 170 total possible

---

## Token Packages

### One-Time Purchase Packages

Tokens purchased through Stripe do not expire and accumulate in the user's
balance.

**Package Details**:

```json
{
  "packages": [
    {
      "id": "starter_50",
      "name": "Starter Pack",
      "tokens": 50,
      "priceGBP": 2.99,
      "pricePerToken": 0.06,
      "description": "Perfect for trying out features"
    },
    {
      "id": "essential_150",
      "name": "Essential Pack",
      "tokens": 150,
      "priceGBP": 7.99,
      "pricePerToken": 0.05,
      "description": "Great for regular usage"
    },
    {
      "id": "professional_500",
      "name": "Professional Pack",
      "tokens": 500,
      "priceGBP": 19.99,
      "pricePerToken": 0.04,
      "description": "Excellent value for heavy usage"
    },
    {
      "id": "enterprise_2000",
      "name": "Enterprise Pack",
      "tokens": 2000,
      "priceGBP": 59.99,
      "pricePerToken": 0.03,
      "description": "Best value for teams and organizations"
    }
  ]
}
```

### Token Cost Examples

**TIER_1K Enhancement (2 tokens)**:

- Starter Pack: Can enhance 25 times
- Essential Pack: Can enhance 75 times
- Professional Pack: Can enhance 250 times
- Enterprise Pack: Can enhance 1000 times

**TIER_4K Enhancement (10 tokens)**:

- Starter Pack: Can enhance 5 times
- Essential Pack: Can enhance 15 times
- Professional Pack: Can enhance 50 times
- Enterprise Pack: Can enhance 200 times

---

## Subscription Plans

### Plan Comparison

```
┌─────────────────┬──────────────┬──────────────┬────────────────┐
│ Feature         │ Starter      │ Professional │ Enterprise     │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Tokens/Month    │ 20           │ 100          │ 500            │
│ Price/Month     │ £2.99        │ £9.99        │ £29.99         │
│ Max Rollover    │ 20           │ 100          │ 250            │
│ Auto-Renewal    │ Yes          │ Yes          │ Yes            │
│ Pause Period    │ 3 months     │ 3 months     │ 3 months       │
│ Support         │ Email        │ Priority     │ VIP            │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Annual Cost     │ £35.88       │ £119.88      │ £359.88        │
│ Monthly Value   │ 1-2x usage   │ 5x usage     │ 25x usage      │
└─────────────────┴──────────────┴──────────────┴────────────────┘
```

### Subscription Lifecycle

**1. Purchase Flow**:

- User selects plan on pricing page
- Redirected to Stripe checkout
- Payment processed immediately
- Plan activated, first month's tokens credited

**2. Active Subscription**:

- Tokens credited automatically on renewal date
- Unused tokens carry over (respecting max rollover)
- Email receipt sent each month
- Plan visible in account settings

**3. Pause Subscription**:

- User can pause for 1-3 months
- No charges during pause period
- Tokens not credited during pause
- Can unpause anytime

**4. Cancel Subscription**:

- Effective immediately
- Access until end of billing cycle
- Remaining tokens retained indefinitely
- Can resubscribe anytime

**5. Upgrade/Downgrade**:

- Change plan in account settings
- Prorated adjustment applied to next billing cycle
- Current tokens not affected
- New allocation rate applies immediately

---

## Automatic Regeneration

### Regeneration Mechanics

**Rate**: 1 token per 15 minutes

- Exact interval: 15 minutes (900 seconds)
- Checked on each API call that requires tokens

**Calculation**:

```
tokensSinceLastRegen = floor((now - lastRegenTime) / 15min)
newTokens = min(tokensSinceLastRegen, 100 - currentBalance)
```

**Example**:

- Current balance: 95
- Last regeneration: 1 hour ago (4 × 15 min intervals)
- Available tokens: 4
- New balance: 95 + 4 = 99 (not 100, respects cap)

### Storage Duration

**Free Regenerated Tokens**:

- Expire after 30 days of inactivity
- Inactivity = no API calls from user
- Expiration is automatic (checked on each request)
- Expiration applies to balance >= 100

**Purchased Tokens**:

- Never expire
- Always used first (FIFO)
- Persist across subscription cycles

### Token Priority

Tokens are consumed in this order:

1. **Purchased Tokens**: One-time purchases (never expire)
2. **Subscription Tokens**: Current month's allocation
3. **Regenerated Tokens**: Free tokens (expire after 30 days)

Example balance composition:

```json
{
  "totalBalance": 150,
  "breakdown": {
    "purchased": 50, // From stripe purchases
    "subscription": 50, // Current month allocation
    "regenerated": 50 // Free tokens (expire in 25 days)
  }
}
```

---

## Token Balance & Consumption

### Balance Query

**Endpoint**: `GET /api/tokens/balance`

**Authentication**: Required

**Response**:

```json
{
  "balance": 95,
  "lastRegeneration": "2025-12-02T10:30:00Z",
  "timeUntilNextRegenMs": 854000,
  "tokensAddedThisRequest": 0,
  "stats": {
    "totalSpent": 50,
    "totalEarned": 145,
    "totalRefunded": 5,
    "transactionCount": 12
  }
}
```

**Field Explanations**:

- `balance`: Current token balance
- `lastRegeneration`: ISO timestamp of last automatic regeneration
- `timeUntilNextRegenMs`: Milliseconds until next 1-token regeneration
- `tokensAddedThisRequest`: Tokens regenerated during this request
- `stats`: Lifetime transaction statistics

### Consumption Tracking

Each token consumption is logged with:

```json
{
  "id": "txn_001",
  "userId": "user_123",
  "amount": 5,
  "type": "CONSUME",
  "source": "image_enhancement",
  "sourceId": "job_123",
  "metadata": {
    "tier": "TIER_2K"
  },
  "balanceAfter": 90,
  "createdAt": "2025-12-02T10:35:00Z"
}
```

### Transaction Types

| Type              | Description                | Reversible             |
| ----------------- | -------------------------- | ---------------------- |
| CONSUME           | Token deducted for service | No                     |
| EARN_BONUS        | Tokens from voucher        | No                     |
| EARN_SUBSCRIPTION | Tokens from subscription   | No                     |
| REFUND            | Tokens returned on failure | No (increases balance) |
| PURCHASE          | Tokens from Stripe         | No                     |

---

## API Reference

### Get Token Balance

**Endpoint**: `GET /api/tokens/balance`

**Authentication**: Required (Bearer token)

**Request**:

```http
GET /api/tokens/balance HTTP/1.1
Authorization: Bearer {session_token}
```

**Response (Success - 200)**:

```json
{
  "balance": 95,
  "lastRegeneration": "2025-12-02T10:30:00Z",
  "timeUntilNextRegenMs": 854000,
  "tokensAddedThisRequest": 1,
  "stats": {
    "totalSpent": 50,
    "totalEarned": 145,
    "totalRefunded": 5,
    "transactionCount": 12
  }
}
```

**Error Responses**:

| Status | Error           | Description                     |
| ------ | --------------- | ------------------------------- |
| 401    | Unauthorized    | User session invalid or missing |
| 500    | Failed to fetch | Database error                  |

### Create Checkout Session (Purchase)

**Endpoint**: `POST /api/stripe/checkout`

**Authentication**: Required

**Request**:

```http
POST /api/stripe/checkout HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "packageId": "professional_500",
  "mode": "payment"
}
```

**Valid Package IDs**:

- `starter_50`
- `essential_150`
- `professional_500`
- `enterprise_2000`

**Response (Success - 200)**:

```json
{
  "success": true,
  "sessionId": "cs_live_123abc...",
  "url": "https://checkout.stripe.com/pay/cs_live_123abc..."
}
```

**Error Responses**:

| Status | Error               | Description              |
| ------ | ------------------- | ------------------------ |
| 400    | Package ID required | packageId missing        |
| 400    | Invalid package ID  | packageId not recognized |
| 401    | Unauthorized        | User session invalid     |
| 500    | Failed to create    | Stripe API error         |

### Create Subscription Session

**Endpoint**: `POST /api/stripe/checkout`

**Authentication**: Required

**Request**:

```http
POST /api/stripe/checkout HTTP/1.1
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "planId": "professional_100",
  "mode": "subscription"
}
```

**Valid Plan IDs**:

- `starter_20`
- `professional_100`
- `enterprise_500`

**Response (Success - 200)**:

```json
{
  "success": true,
  "sessionId": "cs_live_sub_123abc...",
  "url": "https://checkout.stripe.com/pay/cs_live_sub_123abc..."
}
```

**Error Responses**:

| Status | Error                      | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| 400    | Plan ID required           | planId missing                       |
| 400    | Invalid plan ID            | planId not recognized                |
| 400    | Active subscription exists | User already has active subscription |
| 401    | Unauthorized               | User session invalid                 |
| 500    | Failed to create           | Stripe API error                     |

---

## Transaction History

### Viewing Transaction History

Users can view complete transaction history through the account dashboard:

**Sample Transaction History**:

```json
{
  "transactions": [
    {
      "id": "txn_001",
      "type": "CONSUME",
      "amount": 5,
      "source": "image_enhancement",
      "sourceId": "job_123",
      "description": "Enhanced image at TIER_2K",
      "balanceAfter": 90,
      "createdAt": "2025-12-02T10:35:00Z"
    },
    {
      "id": "txn_002",
      "type": "EARN_BONUS",
      "amount": 100,
      "source": "voucher",
      "sourceId": "voucher_launch100",
      "description": "Redeemed voucher LAUNCH100",
      "balanceAfter": 195,
      "createdAt": "2025-12-02T09:00:00Z"
    },
    {
      "id": "txn_003",
      "type": "PURCHASE",
      "amount": 150,
      "source": "stripe",
      "sourceId": "pi_1A2B3C4D5E6F",
      "description": "Purchased Essential Pack (150 tokens)",
      "balanceAfter": 95,
      "createdAt": "2025-12-01T14:20:00Z"
    },
    {
      "id": "txn_004",
      "type": "REFUND",
      "amount": 5,
      "source": "enhancement_failure",
      "sourceId": "job_456",
      "description": "Refund for failed enhancement job",
      "balanceAfter": 90,
      "createdAt": "2025-12-01T12:15:00Z"
    },
    {
      "id": "txn_005",
      "type": "EARN_SUBSCRIPTION",
      "amount": 100,
      "source": "subscription",
      "sourceId": "sub_A1B2C3D4",
      "description": "Monthly subscription allocation",
      "balanceAfter": 85,
      "createdAt": "2025-12-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Export Transaction History

Users can export transaction history as:

- CSV for spreadsheet analysis
- JSON for archival
- PDF for records

---

## Token Pricing

### Pricing Model

**Tokens are the platform's universal currency** for premium features across all
apps.

### Current Token Costs (Pixel App)

**Image Enhancement Costs**:

| Enhancement Tier | Output Resolution | Token Cost |
| ---------------- | ----------------- | ---------- |
| TIER_1K          | 1024px max        | 2 tokens   |
| TIER_2K          | 2048px max        | 5 tokens   |
| TIER_4K          | 4096px max        | 10 tokens  |

**Value Analysis**:

For Professional Pack (500 tokens, £19.99):

| Tier    | Images | Cost Per Image |
| ------- | ------ | -------------- |
| TIER_1K | 250    | 0.08p          |
| TIER_2K | 100    | 0.20p          |
| TIER_4K | 50     | 0.40p          |

**Subscription Value** (Professional Plan, £9.99/month):

| Usage Pattern                  | Images/Month | Cost Per Image |
| ------------------------------ | ------------ | -------------- |
| Light (10 images at TIER_1K)   | 10           | 1.00p          |
| Regular (20 images at TIER_2K) | 20           | 0.50p          |
| Heavy (50 images mixed)        | 50           | 0.20p          |

### Discounts & Promotions

**Introductory Offer**: New users receive WELCOME50 voucher (50 free tokens)

**Bulk Discounts**:

- Enterprise Pack offers 50% better value than Starter Pack
- Annual subscription equivalent: £119.88 (Professional)

**Seasonal Promotions**: Announced via email and dashboard

---

## Implementation Files

### Platform Token Infrastructure

**Database Models** (Platform-Level):

- `prisma/schema.prisma` - UserTokenBalance, TokenTransaction, Subscription
- These models are platform infrastructure, not app-specific

**Token Management** (Platform-Level):

- `src/lib/tokens/balance-manager.ts` - Token operations (used by all apps)
- `src/lib/tokens/regeneration.ts` - Automatic regeneration logic
- `src/lib/tokens/costs.ts` - Cost configuration

**API Endpoints** (Platform-Level):

- `src/app/api/tokens/balance/route.ts` - Balance query (platform API)
- `src/app/api/stripe/checkout/route.ts` - Payment session creation
- `src/app/api/stripe/webhook/route.ts` - Stripe event handling

**Frontend Components** (Shared):

- `src/components/tokens/balance-display.tsx` - Balance widget
- `src/components/tokens/purchase-modal.tsx` - Token purchase UI
- `src/app/settings/tokens/page.tsx` - Token management page

### How Apps Consume Tokens

Apps on Spike Land consume tokens by calling `TokenBalanceManager`:

```typescript
// App requests token consumption
await TokenBalanceManager.consumeTokens({
  userId: user.id,
  amount: tokenCost,
  type: "SPEND_ENHANCEMENT",
  source: "pixel_app",
  sourceId: jobId,
});
```

This architecture allows any future app to use the same token system.

---

## Best Practices

### For Users

1. **Monitor Balance**: Check token balance regularly before enhancement
2. **Plan Purchases**: Estimate monthly token needs and choose appropriate
   package
3. **Maximize Value**: Use subscriptions for regular usage (better value than
   one-time purchases)
4. **Use Vouchers**: Always redeem promotional vouchers before purchasing
5. **Budget Wisely**: Regenerated tokens are free but limited to 100

### For Developers

1. **Balance Check**: Always verify sufficient balance before deducting tokens
2. **Failure Handling**: Implement automatic refunds on processing failures
3. **Rate Limiting**: Respect API rate limits to avoid suspension
4. **Error Messages**: Display token costs clearly before user action
5. **Webhook Handling**: Process Stripe webhooks for token credits

---

## Migration Guide (Free to Paid)

**For Existing Free Users**:

1. **Free Tokens Continue**: 1 token per 15 minutes (max 100)
2. **Try Before Buy**: Use free tokens to test features
3. **Upgrade When Ready**: Purchase tokens or subscribe when needed
4. **No Lock-in**: Cancel subscription anytime without penalty

---
