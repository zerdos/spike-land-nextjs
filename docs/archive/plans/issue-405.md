# Implementation Plan for Issue #405: Exposed Secrets - Credential Rotation

## Summary

The issue reports that production secrets were found "exposed" in `.env.local`.
However, upon thorough investigation:

**CRITICAL FINDING: The secrets are NOT exposed in git history.**

The `.env.local` file:

1. Is properly listed in `.gitignore` (line 43: `.env*` and line 58:
   `.env*.local`)
2. Has NEVER been committed to git history (verified by searching for actual
   secret values)
3. Only `.env.example` and `.env.local.example` are tracked (containing
   placeholder values, not real secrets)

## Current State Analysis

**Gitignore Configuration (CORRECTLY CONFIGURED):**

- Line 43: `.env*`
- Line 44-45 whitelist: `!.env.example` and `!.env.local.example`
- Line 58: `.env*.local`

**Files in Repository (ONLY SAFE FILES):**

- `.env.example` - Contains placeholder documentation values
- `.env.local.example` - Contains placeholder values for local setup

**Not in Repository (CORRECT):**

- `.env.local` - Contains 47 real secrets (verified NOT in git history)

## Secrets Inventory (47 variables)

| Category        | Variables                                      | Count |
| --------------- | ---------------------------------------------- | ----- |
| Authentication  | AUTH_SECRET, E2E_BYPASS_SECRET                 | 2     |
| Cloudflare R2   | CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, etc.  | 6     |
| Database (Neon) | DATABASE_URL, DATABASE_URL_UNPOOLED, etc.      | 15    |
| Google/Gemini   | GEMINI_API_KEY, GOOGLE_ID, GOOGLE_SECRET, etc. | 5     |
| GitHub          | GITHUB_ID, GITHUB_SECRET, GH_PAT_TOKEN         | 5     |
| Stripe          | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc. | 3     |
| Twilio          | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN          | 2     |

## Implementation Steps

### Phase 1: Verification (COMPLETE)

- [x] Verify `.env.local` is in `.gitignore`
- [x] Check git history for committed secrets - NONE FOUND
- [x] Audit all `.env*` patterns in gitignore - CORRECTLY CONFIGURED

### Phase 2: Credential Rotation (IF REQUIRED)

If the user confirms secrets were exposed through another channel:

1. **Stripe (CRITICAL - Live keys)**
   - Rotate at: https://dashboard.stripe.com/apikeys

2. **Database (CRITICAL)**
   - Rotate password in Neon Dashboard: https://console.neon.tech

3. **GitHub PAT (HIGH)**
   - Revoke and regenerate at: https://github.com/settings/tokens

4. **OAuth Credentials (HIGH)**
   - GitHub OAuth: https://github.com/settings/developers
   - Google OAuth: https://console.cloud.google.com/apis/credentials

5. **Cloudflare R2 (HIGH)**
   - Rotate at: https://dash.cloudflare.com/ > R2 > Manage R2 API Tokens

6. **API Keys (MEDIUM)**
   - Gemini: https://aistudio.google.com/app/apikey
   - Twilio: https://console.twilio.com/

### Phase 3: Prevention (COMPLETE)

- [x] Add pre-commit hook to scan for secrets using gitleaks
  - File: `.husky/pre-commit`
  - Scans staged changes before each commit
  - Provides actionable error messages with fix instructions

- [x] Add secret scanning to CI/CD pipeline
  - File: `.github/workflows/security.yml`
  - Uses `gitleaks/gitleaks-action@v2`
  - Runs on all pull requests
  - Provides GITHUB_STEP_SUMMARY with clear next steps if secrets detected

- [x] Create gitleaks configuration
  - File: `.gitleaks.toml`
  - Custom rules for Stripe live keys, Neon database URLs, Cloudflare R2 secrets
  - Allowlist for example/placeholder values in documentation

- [x] Create gitleaks ignore file
  - File: `.gitleaksignore`
  - Template for documenting false positives

- [x] Create credential rotation documentation
  - File: `docs/CREDENTIAL_ROTATION.md`
  - Step-by-step procedures for all 47 credentials
  - Prioritized by criticality (CRITICAL/HIGH/MEDIUM/LOW)
  - Emergency rotation procedures
  - Post-rotation checklist

## Questions for User

1. **How were the secrets "exposed"?** My investigation shows `.env.local` has
   never been committed to git.
2. **Has unauthorized access been confirmed?**
3. **Timeline priority**: Given Stripe LIVE keys are present, should Stripe
   rotation be prioritized?
4. **Session invalidation**: Rotating `AUTH_SECRET` will log out all users. Is
   this acceptable?

## Files Created/Modified

| File                             | Description                                   |
| -------------------------------- | --------------------------------------------- |
| `.husky/pre-commit`              | Pre-commit hook with gitleaks secret scanning |
| `.github/workflows/security.yml` | CI/CD secret scanning job added               |
| `.gitleaks.toml`                 | Gitleaks configuration with custom rules      |
| `.gitleaksignore`                | Template for false positive documentation     |
| `docs/CREDENTIAL_ROTATION.md`    | Complete credential rotation procedures       |

## Critical Files

- `/Users/z/Developer/spike-land-nextjs/.gitignore` - Verify env exclusion
  patterns
- `/Users/z/Developer/spike-land-nextjs/.env.example` - Template reference
- `/Users/z/Developer/spike-land-nextjs/src/auth.config.ts` - Uses AUTH_SECRET,
  OAuth credentials
- `/Users/z/Developer/spike-land-nextjs/src/lib/prisma.ts` - Uses DATABASE_URL

## Commits

The security prevention measures were implemented across the following commits:

- `8373ab9` - Added gitleaks to pre-commit hook and security.yml
- `88aae6a` - Added .gitleaks.toml, .gitleaksignore, and CREDENTIAL_ROTATION.md
