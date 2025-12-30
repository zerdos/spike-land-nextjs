# Implementation Plan for Issue #418: Centralize Secrets Documentation

## Summary

Create `docs/SECRETS_SETUP.md` as single source of truth for all secrets and
environment variables, consolidating information from:

- `.github/BRANCH_PROTECTION_SETUP.md`
- `.github/workflows/README.md`
- `.env.example`
- `docs/LAUNCH_CHECKLIST.md`

## Secrets Inventory (47 variables)

### Required vs Optional Matrix

| Secret            | Local | GH Actions |    Vercel    |   Required   |
| ----------------- | :---: | :--------: | :----------: | :----------: |
| DATABASE_URL      |  Yes  |    Yes     |     Yes      | **Required** |
| AUTH_SECRET       |  Yes  |    Yes     |     Yes      | **Required** |
| GITHUB_ID/SECRET  |  Yes  |     No     |     Yes      | **Required** |
| GOOGLE_ID/SECRET  |  Yes  |     No     |     Yes      | **Required** |
| GEMINI_API_KEY    |  Yes  |    Yes     |     Yes      | **Required** |
| CLOUDFLARE_R2_*   |  Yes  |    Yes     |     Yes      | **Required** |
| E2E_BYPASS_SECRET |  Yes  |    Yes     | Preview only | **Required** |
| GH_PAT_TOKEN      |  Yes  |    Yes     |      No      | CI Required  |
| VERCEL_TOKEN      |  No   |    Yes     |      No      | CI Required  |
| STRIPE_*          |  Yes  |     No     |     Yes      |   Optional   |
| RESEND_API_KEY    |  Yes  |     No     |     Yes      |   Optional   |

## Documentation Sections

### Local Development

- Database configuration (Neon, local PostgreSQL)
- Authentication secrets (AUTH_SECRET, USER_ID_SALT)
- OAuth providers (GitHub, Google, Facebook, Apple)
- AI services (Gemini)
- Cloud storage (Cloudflare R2)
- E2E testing

### GitHub Actions

- Required: DATABASE_URL, AUTH_SECRET, E2E_BYPASS_SECRET, VERCEL_TOKEN,
  GH_PAT_TOKEN
- CI workflows: ci-cd.yml, claude.yml, claude-code-review.yml
- Optional: CODECOV_TOKEN, CLAUDE_CODE_OAUTH_TOKEN

### Vercel Production

- Environment selection (Production, Preview, Development)
- Production security: Never enable E2E_BYPASS_SECRET for production
- Auto-linked variables (VERCEL_URL, VERCEL_ENV)

### Secret Generation Commands

```bash
openssl rand -base64 32  # AUTH_SECRET, E2E_BYPASS_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # TOKEN_ENCRYPTION_KEY
```

## Files to Update with References

1. `.github/workflows/README.md` - Replace secrets section with link
2. `.github/BRANCH_PROTECTION_SETUP.md` - Add reference
3. `docs/LAUNCH_CHECKLIST.md` - Link to SECRETS_SETUP.md
4. `docs/README.md` - Add to documentation index
5. `.env.example` - Add header comment pointing to docs
6. `docs/DATABASE_SETUP.md` - Reference for env vars
7. `README.md` - Add link in setup section

## Security Notes

- **CRITICAL**: `E2E_BYPASS_SECRET` must NEVER be in Production
- **WARNING**: Never rotate `USER_ID_SALT` after going live
- Use separate OAuth apps for dev vs production

## Questions

1. `.env.local` not in git - confirm this is correct?
2. OAuth app separation: recommend separate apps?
3. Vercel KV vs Upstash: both or one deprecated?
4. Prodigi integration: add to docs as optional?

## Critical Files

- `/docs/SECRETS_SETUP.md` - New file to create
- `/.env.example` - Primary source of env var documentation
- `/.github/workflows/README.md` - Replace secrets section
- `/.github/workflows/ci-cd.yml` - Secrets usage reference
- `/docs/README.md` - Update index
