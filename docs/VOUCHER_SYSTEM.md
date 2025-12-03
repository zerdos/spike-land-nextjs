# Voucher System Database Schema

## Overview

The voucher system allows users to redeem promotional codes for tokens and other benefits. This document describes the database schema and setup process.

## Database Schema

### Enums

#### VoucherType
- `FIXED_TOKENS` - Grants a fixed number of tokens
- `PERCENTAGE_BONUS` - Adds a percentage bonus to token purchases
- `SUBSCRIPTION_TRIAL` - Provides a subscription trial period

#### VoucherStatus
- `ACTIVE` - Voucher can be redeemed
- `INACTIVE` - Voucher is disabled
- `EXPIRED` - Voucher has passed its expiration date
- `DEPLETED` - Voucher has reached its maximum uses

### Models

#### Voucher
Main voucher model that stores promotional codes and their properties.

**Fields:**
- `id` (String) - Unique identifier (cuid)
- `code` (String) - Unique voucher code
- `type` (VoucherType) - Type of voucher
- `value` (Int) - Token amount or percentage value
- `maxUses` (Int?) - Maximum redemptions (null = unlimited)
- `currentUses` (Int) - Current redemption count (default: 0)
- `expiresAt` (DateTime?) - Expiration date (null = never expires)
- `status` (VoucherStatus) - Current status (default: ACTIVE)
- `metadata` (Json?) - Additional metadata
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `redemptions` (VoucherRedemption[]) - Related redemptions

**Indexes:**
- `code` - Fast lookup by code
- `status, expiresAt` - Efficient filtering of active/expired vouchers

#### VoucherRedemption
Tracks user redemptions of vouchers.

**Fields:**
- `id` (String) - Unique identifier (cuid)
- `voucherId` (String) - Reference to voucher
- `userId` (String) - Reference to user
- `tokensGranted` (Int) - Tokens granted in this redemption
- `redeemedAt` (DateTime) - Redemption timestamp

**Relations:**
- `voucher` (Voucher) - The redeemed voucher
- `user` (User) - The user who redeemed

**Constraints:**
- Unique constraint on `[voucherId, userId]` - Users can only redeem each voucher once

**Indexes:**
- `userId, redeemedAt` - User redemption history
- `voucherId` - Voucher usage tracking

### User Model Update

The `User` model has been updated to include:
- `voucherRedemptions` (VoucherRedemption[]) - User's voucher redemptions

## Initial Seed Data

Three launch vouchers have been created:

1. **LAUNCH100**
   - Type: FIXED_TOKENS
   - Value: 100 tokens
   - Max Uses: 1000
   - Status: ACTIVE

2. **WELCOME50**
   - Type: FIXED_TOKENS
   - Value: 50 tokens
   - Max Uses: Unlimited
   - Status: ACTIVE

3. **BETA25**
   - Type: FIXED_TOKENS
   - Value: 25 tokens
   - Max Uses: 500
   - Status: ACTIVE

## Database Setup

### Applied Changes

The schema has been updated using `prisma db push` (no migration created due to database drift).

### Scripts

#### Seed Vouchers
```bash
npm run db:seed-vouchers
```

This script creates/updates the initial launch vouchers using `prisma/seed-vouchers.ts`.

#### Verify Vouchers
```bash
npx tsx prisma/verify-vouchers.ts
```

This utility script displays all vouchers in the database with their current status.

## Usage Examples

### Create a New Voucher

```typescript
import { prisma } from '@/lib/prisma'

await prisma.voucher.create({
  data: {
    code: 'NEWUSER2024',
    type: 'FIXED_TOKENS',
    value: 50,
    maxUses: 100,
    expiresAt: new Date('2024-12-31'),
    status: 'ACTIVE',
  },
})
```

### Redeem a Voucher

```typescript
import { prisma } from '@/lib/prisma'

// Check voucher validity
const voucher = await prisma.voucher.findUnique({
  where: { code: 'LAUNCH100' },
  include: {
    redemptions: {
      where: { userId: 'user_123' }
    }
  }
})

if (!voucher) throw new Error('Voucher not found')
if (voucher.status !== 'ACTIVE') throw new Error('Voucher inactive')
if (voucher.expiresAt && voucher.expiresAt < new Date()) throw new Error('Voucher expired')
if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) throw new Error('Voucher depleted')
if (voucher.redemptions.length > 0) throw new Error('Already redeemed')

// Redeem voucher
await prisma.$transaction([
  // Create redemption record
  prisma.voucherRedemption.create({
    data: {
      voucherId: voucher.id,
      userId: 'user_123',
      tokensGranted: voucher.value,
    }
  }),
  // Update voucher usage count
  prisma.voucher.update({
    where: { id: voucher.id },
    data: { currentUses: { increment: 1 } }
  }),
  // Grant tokens to user
  prisma.userTokenBalance.upsert({
    where: { userId: 'user_123' },
    create: {
      userId: 'user_123',
      balance: voucher.value,
    },
    update: {
      balance: { increment: voucher.value }
    }
  }),
  // Record token transaction
  prisma.tokenTransaction.create({
    data: {
      userId: 'user_123',
      amount: voucher.value,
      type: 'EARN_BONUS',
      source: 'voucher',
      sourceId: voucher.id,
      balanceAfter: 0, // Should calculate actual balance
    }
  })
])
```

### Query User's Redemption History

```typescript
import { prisma } from '@/lib/prisma'

const redemptions = await prisma.voucherRedemption.findMany({
  where: { userId: 'user_123' },
  include: { voucher: true },
  orderBy: { redeemedAt: 'desc' }
})
```

### Get Voucher Usage Stats

```typescript
import { prisma } from '@/lib/prisma'

const voucher = await prisma.voucher.findUnique({
  where: { code: 'LAUNCH100' },
  include: {
    _count: { select: { redemptions: true } }
  }
})

console.log(`${voucher.code}: ${voucher._count.redemptions} / ${voucher.maxUses || '∞'} uses`)
```

## Next Steps

To implement the voucher redemption feature in the application:

1. **Create API Route** - `/api/vouchers/redeem`
   - Validate voucher code
   - Check user eligibility
   - Process redemption transaction
   - Handle errors and edge cases

2. **Create UI Component** - Voucher redemption form
   - Input field for voucher code
   - Validation feedback
   - Success/error messaging
   - Display granted tokens

3. **Add User Dashboard Section** - Redemption history
   - List of redeemed vouchers
   - Tokens granted per voucher
   - Redemption dates

4. **Admin Panel** - Voucher management (future)
   - Create/edit vouchers
   - View usage statistics
   - Deactivate/expire vouchers
   - Export redemption data

## Security Considerations

- Voucher codes should be case-insensitive or uppercase-only for user convenience
- Implement rate limiting on redemption attempts to prevent abuse
- Log all redemption attempts (successful and failed) for audit purposes
- Consider adding IP-based restrictions for high-value vouchers
- Implement concurrent redemption protection using database transactions

## Performance Optimization

- Indexes are in place for common queries (code lookup, status filtering)
- Use `prisma.$transaction()` for atomic redemption operations
- Consider caching active voucher codes to reduce database queries
- Monitor query performance as redemption volume grows
