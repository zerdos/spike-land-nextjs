# Implementation Plan for Issue #406: Implement Token Encryption in campaign-sync.ts

## Summary

Issue #406 requires implementing proper token encryption in `campaign-sync.ts`. The good news is that a comprehensive encryption library already exists at `src/lib/crypto/token-encryption.ts`. The implementation primarily requires:

1. Updating `campaign-sync.ts` to use the existing encryption utilities
2. Ensuring token refresh flow encrypts new tokens
3. Adding a key rotation capability (optional enhancement)
4. Creating a migration script for any existing unencrypted tokens

## Current State Analysis

**TODO Location**: `/Users/z/Developer/spike-land-nextjs/src/lib/marketing/campaign-sync.ts:39-42`

```typescript
function decryptToken(encryptedToken: string): string {
  // TODO: Implement proper decryption
  // For now, assuming tokens are stored as-is
  return encryptedToken;
}
```

**Encryption Library Available**: `/Users/z/Developer/spike-land-nextjs/src/lib/crypto/token-encryption.ts`

Provides:

- `encryptToken(plaintext: string): string` - AES-256-GCM encryption
- `decryptToken(encryptedData: string): string` - Decryption
- `safeEncryptToken(plaintext: string)` - Graceful encryption with fallback
- `safeDecryptToken(data: string)` - Handles both encrypted and unencrypted tokens

**OAuth Callbacks Already Use Encryption**:

- Facebook: `/src/app/api/marketing/facebook/callback/route.ts:141`
- Google: `/src/app/api/marketing/google/callback/route.ts:129-195`

## Files to Modify

1. **`/src/lib/marketing/campaign-sync.ts`**
   - Lines 34-43: Replace local `decryptToken` with import from `@/lib/crypto/token-encryption`
   - Line 241-247: Update `refreshAccountToken()` to encrypt new tokens before storage

2. **`/src/lib/marketing/campaign-sync.test.ts`**
   - Update tests to mock the encryption module
   - Add tests for encrypted token handling

3. **`/src/lib/crypto/token-encryption.ts`** (Optional - for key rotation)
   - Add key rotation support

4. **`scripts/migrate-marketing-tokens.ts`** (New file)
   - Migration script for existing unencrypted tokens

## Step-by-Step Implementation

### Step 1: Update campaign-sync.ts

1. Add import: `import { safeDecryptToken, safeEncryptToken } from "@/lib/crypto/token-encryption";`

2. Remove the local decryptToken function (lines 34-43)

3. Update token usage (lines 124, 152):
   - Replace `decryptToken(account.refreshToken)` with `safeDecryptToken(account.refreshToken)`
   - Replace `decryptToken(account.accessToken)` with `safeDecryptToken(account.accessToken)`

4. Update refreshAccountToken function (lines 239-248) to encrypt new tokens

### Step 2: Update Tests

Add mock for crypto module and tests verifying encryption is used.

### Step 3: Key Rotation (Optional)

Add `TOKEN_ENCRYPTION_KEY_OLD` environment variable support for rotation.

### Step 4: Migration Script

Create script to encrypt existing unencrypted tokens in database.

## Migration Plan

1. **Pre-migration**: Ensure `TOKEN_ENCRYPTION_KEY` is set in production
2. **During deployment**: Deploy updated code (uses `safeDecryptToken` which handles both formats)
3. **Post-deployment**: Run migration script to encrypt existing tokens
4. **Verification**: Verify marketing sync still works

## Questions

None - the existing encryption library provides everything needed.

## Critical Files

- `/src/lib/marketing/campaign-sync.ts` - Core file with the TODO
- `/src/lib/crypto/token-encryption.ts` - Existing encryption utilities to import
- `/src/lib/marketing/campaign-sync.test.ts` - Tests to update
- `/.env.example` - Document TOKEN_ENCRYPTION_KEY
