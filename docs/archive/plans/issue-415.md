# Implementation Plan for Issue #415: Create Interactive Setup Script

## Summary

This plan creates an interactive setup script (`scripts/setup.sh`) that automates the developer onboarding process, reducing setup time from 15-20 minutes to approximately 5 minutes.

## Current Manual Setup Process

1. Clone repository
2. Enable corepack
3. `yarn install --immutable`
4. Install Playwright browsers
5. Copy `.env.example` to `.env.local`
6. Generate AUTH_SECRET
7. Configure OAuth providers (complex)
8. Edit `.env.local` with credentials
9. Start dev server

## Script Design

### Core Features

- Interactive prompts with sensible defaults
- Platform detection (macOS and Linux)
- Idempotent operations (safe to run multiple times)
- Colored output with status indicators
- Optional component setup (OAuth, DB)

### Script Flow

```
Start
  → Check Prerequisites (Node.js v20+, Corepack)
  → Enable Corepack
  → Install Dependencies (yarn install --immutable)
  → Environment Setup (.env.local, AUTH_SECRET, NEXTAUTH_URL)
  → Optional: Database Setup (Docker PostgreSQL)
  → Optional: OAuth Setup (GitHub, Google)
  → Playwright Setup (Install Chromium)
  → Health Check (build, dev server)
  → Summary & Next Steps
```

### Command Line Options

- `--quick`: Skip optional OAuth/database prompts
- `--ci`: Non-interactive mode for CI environments

## Key Functions

### Prerequisites Check

- Verify Node.js version (v20+ required)
- Check for corepack availability
- Detect OS (macOS/Linux)

### Secret Generation

```bash
openssl rand -base64 32
# Fallback: head -c 32 /dev/urandom | base64
```

### Database Setup (Optional)

- Uses Docker to run PostgreSQL container
- Container name: `spike-land-postgres`
- Port: 5432
- Auto-sets DATABASE_URL in .env.local
- Runs Prisma migrations

### OAuth Setup (Optional)

- Prompts for GitHub Client ID/Secret
- Prompts for Google Client ID/Secret
- Provides callback URL guidance

## README Update

Add "Automated Setup (Recommended)" section:

```markdown
./scripts/setup.sh
```

## Implementation Steps

1. Create `/scripts/setup.sh` with full implementation
2. Add executable permission: `chmod +x scripts/setup.sh`
3. Update README.md with setup instructions
4. Test on macOS and Linux

## Questions

None - requirements are clear.

## Critical Files

- `/scripts/setup.sh` - New file to create
- `/README.md` - Update with automated setup instructions
- `/.env.example` - Template reference
- `/scripts/smoke-test.sh` - Pattern reference
