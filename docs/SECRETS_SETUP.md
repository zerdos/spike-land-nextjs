# Secrets and Environment Variables Setup

This is the **single source of truth** for all secrets and environment variables
used in the Spike Land platform. All other documentation should reference this
file rather than duplicating secrets information.

**Last Updated**: December 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Secrets Inventory](#secrets-inventory)
3. [Local Development](#local-development)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [Vercel Production](#vercel-production)
6. [Secret Generation Commands](#secret-generation-commands)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Generate required secrets
openssl rand -base64 32  # For AUTH_SECRET, USER_ID_SALT, E2E_BYPASS_SECRET

# 3. Configure OAuth providers (see sections below)

# 4. Start development
yarn dev
```

---

## Secrets Inventory

### Required vs Optional Matrix

| Secret                   | Local | GH Actions | Vercel  | Required Level |
| ------------------------ | :---: | :--------: | :-----: | :------------: |
| DATABASE_URL             |  Yes  |    Yes     |   Yes   |  **Required**  |
| AUTH_SECRET              |  Yes  |    Yes     |   Yes   |  **Required**  |
| USER_ID_SALT             |  Yes  |     No     |   Yes   |  **Required**  |
| GITHUB_ID/SECRET         |  Yes  |     No     |   Yes   |  **Required**  |
| GOOGLE_ID/SECRET         |  Yes  |     No     |   Yes   |  **Required**  |
| GEMINI_API_KEY           |  Yes  |    Yes     |   Yes   |  **Required**  |
| CLOUDFLARE_R2_*          |  Yes  |    Yes     |   Yes   |  **Required**  |
| E2E_BYPASS_SECRET        |  Yes  |    Yes     | Preview |  **Required**  |
| GH_PAT_TOKEN             |  Yes  |    Yes     |   No    |  CI Required   |
| VERCEL_TOKEN             |  No   |  Optional  |   No    |    Optional    |
| CODECOV_TOKEN            |  No   |  Optional  |   No    |    Optional    |
| CLAUDE_CODE_OAUTH_TOKEN  |  No   |  Optional  |   No    |    Optional    |
| STRIPE_*                 |  Yes  |     No     |   Yes   |    Optional    |
| RESEND_API_KEY           |  Yes  |     No     |   Yes   |    Optional    |
| AUTH_FACEBOOK_ID/SECRET  |  Yes  |     No     |   Yes   |    Optional    |
| TOKEN_ENCRYPTION_KEY     |  Yes  |     No     |   Yes   |    Optional    |
| FACEBOOK_MARKETING_APP_* |  Yes  |     No     |   Yes   |    Optional    |
| GOOGLE_ADS_*             |  Yes  |     No     |   Yes   |    Optional    |
| KV_REST_API_*            |  Yes  |     No     |   Yes   |    Optional    |

---

## Local Development

### Core Authentication

#### AUTH_SECRET (Required)

Used by NextAuth.js to sign and encrypt session tokens.

```bash
# Generate:
openssl rand -base64 32
# Or visit: https://generate-secret.vercel.app/32

# .env.local:
AUTH_SECRET=your-generated-secret
```

#### USER_ID_SALT (Required for Production)

Generates stable user IDs from email addresses across OAuth providers.

```bash
# Generate:
openssl rand -base64 32

# .env.local:
USER_ID_SALT=your-user-id-salt
```

**CRITICAL SECURITY WARNING:**

- **NEVER rotate this value after going live** - changing it will cause all user
  IDs to change, breaking user data associations
- If not set, AUTH_SECRET is used as fallback (not recommended for production)
- User IDs are tied to email addresses (`user_<hash-of-email>`)
- If a user changes their email at the OAuth provider, they get a NEW user ID

### Database Configuration

#### DATABASE_URL (Required)

PostgreSQL connection string.

```bash
# Local development:
DATABASE_URL=postgresql://postgres:password@localhost:5432/spike_land?schema=public

# Neon (production):
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require

# Supabase:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**For serverless/edge environments**, use connection pooling:

```bash
# Pooled connection (for queries)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Direct connection (for migrations only)
DIRECT_URL=postgresql://user:pass@host:5432/db
```

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed database
configuration.

### OAuth Providers

#### GitHub OAuth (Required)

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Authorization callback URL to:
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://spike.land/api/auth/callback/github`
4. Copy Client ID and generate Client Secret

```bash
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

#### Google OAuth (Required)

1. Go to: https://console.cloud.google.com/
2. Create/select project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://spike.land/api/auth/callback/google`

```bash
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret
```

#### Facebook OAuth (Optional)

1. Go to: https://developers.facebook.com/apps/
2. Create app with "Consumer" type (NOT "Business")
3. Select use case: "Authenticate and request data from users with Facebook
   Login"
4. Add Valid OAuth Redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/facebook`
   - Production: `https://spike.land/api/auth/callback/facebook`

```bash
AUTH_FACEBOOK_ID=your-facebook-app-id
AUTH_FACEBOOK_SECRET=your-facebook-app-secret
```

**NOTE:** Uses `AUTH_` prefix to distinguish from `FACEBOOK_MARKETING_APP_*`
(Marketing API).

### AI Services

#### Google Gemini API (Required)

Used for image analysis and enhancement.

1. Go to: https://aistudio.google.com/app/apikey
2. Create API key

```bash
GEMINI_API_KEY=your-gemini-api-key
# IMAGEN_API_KEY may be the same as GEMINI_API_KEY
```

### Cloud Storage

#### Cloudflare R2 (Required)

1. Go to: https://dash.cloudflare.com/
2. Navigate to R2 > Overview
3. Create bucket (e.g., `spike-land-images`)
4. Go to "Manage R2 API Tokens" > Create API Token

```bash
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=spike-land-images
```

#### Cloudflare Images API (Optional)

For image transformation and CDN delivery.

```bash
CLOUDFLARE_IMAGES_API_KEY=your-images-api-key
CLOUDFLARE_IMAGES_ACCOUNT_HASH=your-account-hash
```

### E2E Testing

#### E2E_BYPASS_SECRET (Required for Testing)

Allows E2E tests to bypass authentication.

```bash
# Generate:
openssl rand -base64 32

# .env.local:
E2E_BYPASS_SECRET=your-e2e-bypass-secret
```

**Security Features:**

- **Production Protection**: Bypass is BLOCKED in production even if secret is
  configured (requires both `NODE_ENV=production` AND `VERCEL_ENV=production` to
  block)
- **Constant-time Comparison**: Uses `timingSafeEqual` to prevent timing attacks
- **Audit Logging**: All bypass attempts are logged with timestamp and
  environment info

### Optional Services

#### Stripe Payment Integration

```bash
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

Get credentials from: https://dashboard.stripe.com/apikeys

#### Resend Email Service

```bash
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@spike.land
```

Get API key from: https://resend.com/api-keys

#### Vercel KV (Rate Limiting)

```bash
KV_REST_API_URL=https://your-kv-url.vercel-storage.com
KV_REST_API_TOKEN=your-kv-token
```

Get credentials from: https://vercel.com/dashboard (Storage > KV)

#### Token Encryption (Marketing OAuth)

Encrypts OAuth tokens stored in the database using AES-256-GCM.

```bash
# Generate 32-byte key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

TOKEN_ENCRYPTION_KEY=your-64-character-hex-key
```

**IMPORTANT**: Do NOT rotate this key after tokens are stored - they will become
unreadable.

---

## GitHub Actions CI/CD

### Required Secrets

Add these to: **Settings > Secrets and variables > Actions > New repository
secret**

#### DATABASE_URL

- **Used by**: `ci-cd.yml` (E2E tests)
- **Purpose**: Database connection for E2E tests

#### AUTH_SECRET

- **Used by**: `ci-cd.yml` (E2E tests)
- **Purpose**: NextAuth session signing

#### E2E_BYPASS_SECRET

- **Used by**: `ci-cd.yml` (E2E tests)
- **Purpose**: Bypass authentication in E2E tests
- **Value**: Must match what's configured in Vercel Preview environment

#### GH_PAT_TOKEN

- **Used by**: `claude.yml`, `claude-code-review.yml`
- **Purpose**: GitHub CLI (`gh`) authentication for Claude workflows
- **How to obtain**:
  1. Go to https://github.com/settings/tokens?type=beta
  2. Create a fine-grained Personal Access Token
  3. Repository access: Select `zerdos/spike-land-nextjs`
  4. Permissions: `Contents` (read/write), `Issues` (read/write),
     `Pull
     requests` (read/write)

### Optional Secrets

#### VERCEL_TOKEN

- **Used by**: Manual deployments (if needed)
- **Purpose**: Vercel CLI authentication
- **How to obtain**: https://vercel.com/account/tokens
- **Note**: Usually not needed - Vercel Git integration handles deployments

#### CODECOV_TOKEN

- **Used by**: `ci-cd.yml` (coverage upload)
- **Purpose**: Upload test coverage reports
- **How to obtain**: https://codecov.io (link repository)

#### CLAUDE_CODE_OAUTH_TOKEN

- **Used by**: `claude.yml`
- **Purpose**: Authenticate Claude Code GitHub Action
- **How to obtain**: Anthropic Claude Code setup

### Workflow Files Reference

| Workflow                 | Secrets Used                                                |
| ------------------------ | ----------------------------------------------------------- |
| `ci-cd.yml`              | DATABASE_URL, AUTH_SECRET, E2E_BYPASS_SECRET, CODECOV_TOKEN |
| `claude.yml`             | GH_PAT_TOKEN, CLAUDE_CODE_OAUTH_TOKEN                       |
| `claude-code-review.yml` | GH_PAT_TOKEN, CLAUDE_CODE_OAUTH_TOKEN                       |

---

## Vercel Production

### Environment Variable Configuration

Add variables in: **Vercel Dashboard > Project > Settings > Environment
Variables**

### Environment Selection

| Variable          | Development | Preview | Production |
| ----------------- | :---------: | :-----: | :--------: |
| DATABASE_URL      |     Yes     |   Yes   |    Yes     |
| AUTH_SECRET       |     Yes     |   Yes   |    Yes     |
| USER_ID_SALT      |     Yes     |   Yes   |    Yes     |
| GITHUB_ID/SECRET  |     Yes     |   Yes   |    Yes     |
| GOOGLE_ID/SECRET  |     Yes     |   Yes   |    Yes     |
| GEMINI_API_KEY    |     Yes     |   Yes   |    Yes     |
| CLOUDFLARE_R2_*   |     Yes     |   Yes   |    Yes     |
| E2E_BYPASS_SECRET |     Yes     |   Yes   |   **NO**   |
| STRIPE_*          |     Yes     |   Yes   |    Yes     |
| RESEND_API_KEY    |     Yes     |   Yes   |    Yes     |

### Production Security Rules

**CRITICAL - E2E_BYPASS_SECRET:**

- Enable for: Development, Preview
- **NEVER enable for: Production**
- The bypass middleware blocks requests in production even if the secret is
  configured, but do not configure it at all for defense in depth

### Auto-Linked Variables

Vercel automatically provides these variables:

- `VERCEL_URL` - Deployment URL (e.g., `my-app-abc123.vercel.app`)
- `VERCEL_ENV` - Environment name (`production`, `preview`, `development`)
- `VERCEL_GIT_COMMIT_SHA` - Git commit hash
- `VERCEL_GIT_COMMIT_REF` - Git branch name

### OAuth Callback URLs

For production, update OAuth providers with production URLs:

- GitHub: `https://spike.land/api/auth/callback/github`
- Google: `https://spike.land/api/auth/callback/google`
- Facebook: `https://spike.land/api/auth/callback/facebook`

**Recommendation**: Use separate OAuth apps for development vs production for
better security isolation.

---

## Secret Generation Commands

### AUTH_SECRET / USER_ID_SALT / E2E_BYPASS_SECRET

```bash
# macOS/Linux:
openssl rand -base64 32

# Alternative (Node.js):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Online generator:
# https://generate-secret.vercel.app/32
```

### TOKEN_ENCRYPTION_KEY (64-character hex)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verify Secret Strength

```bash
# Check length and entropy
echo -n "your-secret" | wc -c  # Should be 32+ characters
```

---

## Security Best Practices

### Never Rotate

1. **USER_ID_SALT** - Rotating breaks all user ID associations
2. **TOKEN_ENCRYPTION_KEY** - Rotating makes stored tokens unreadable

### Rotate Periodically

1. **AUTH_SECRET** - Can be rotated; users will be logged out
2. **OAuth secrets** - Rotate via provider dashboard; update everywhere

### Environment File Security

```bash
# .env.local is gitignored (local development only)
# NEVER commit .env files with real secrets
# Use .env.example as template (contains placeholder values only)
```

### Secret Storage Hierarchy

| Environment | Storage Method                             |
| ----------- | ------------------------------------------ |
| Local Dev   | `.env.local` (gitignored)                  |
| GitHub CI   | GitHub Secrets (encrypted at rest)         |
| Vercel      | Environment Variables (encrypted, scoped)  |
| Production  | Consider: AWS Secrets Manager, Vault, etc. |

### Audit Checklist

- [ ] All secrets use strong random values (32+ bytes)
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in git history
- [ ] Production uses different secrets than development
- [ ] E2E_BYPASS_SECRET is NOT in production
- [ ] OAuth apps are separated (dev vs prod)
- [ ] Secrets are rotated on team member departure

---

## Troubleshooting

### "Invalid credentials" in OAuth

1. Verify client ID and secret are correct
2. Check callback URLs match exactly (including trailing slashes)
3. Ensure OAuth app is not in "development mode" (Facebook)

### "Database connection failed"

1. Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. For Neon/Supabase: Ensure `?sslmode=require` is appended
3. Verify IP allowlist on database provider

### "E2E tests failing with 401"

1. Verify E2E_BYPASS_SECRET is set in both:
   - GitHub Secrets (for CI)
   - Vercel Environment Variables (Preview environment)
2. Values must match exactly
3. Check it's NOT enabled for Production

### "CLAUDE_CODE_OAUTH_TOKEN" errors

1. Regenerate token from Anthropic
2. Update GitHub Secret
3. Verify workflow has correct permissions

### Secret Not Loading

```bash
# Debug: Print loaded env vars (development only!)
console.log(process.env.MY_SECRET ? "loaded" : "missing");

# Check Vercel deployment logs for "Environment Variables" section
```

---

## Related Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration
- [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) - Pre-launch verification
- [../.github/workflows/README.md](../.github/workflows/README.md) - CI/CD
  pipeline
- [../.env.example](../.env.example) - Environment variable template

---

**Maintained by**: Security Team | **Questions**: Create a GitHub issue with
label `security`
