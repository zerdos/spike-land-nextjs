# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.12.0-bookworm-slim
# Dummy URL needed for Prisma/Next build (not used at runtime)
ARG DUMMY_DATABASE_URL="postgresql://build:build@localhost:5432/build"

# ============================================================================
# STAGE 0: Base
# Sets up package manager and cache mounts for apt
# ============================================================================
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies (Curl, Certificates)
# CACHE: /var/cache/apt is preserved across builds
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && corepack enable

# ============================================================================
# STAGE 1: Dependency Context
# Files needed for yarn install. Isolated to prevent cache busting by src changes.
# ============================================================================
FROM base AS dep-context
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/opfs-node-adapter/package.json ./packages/opfs-node-adapter/
COPY prisma ./prisma

# ============================================================================
# STAGE 2: Install Dependencies
# ============================================================================
FROM base AS deps
# Install native build tools (Python, GCC) only for this stage
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev

COPY --from=dep-context /app ./

# Install deps with cache
ARG DUMMY_DATABASE_URL
RUN --mount=type=cache,id=yarn-cache,target=/app/.yarn/cache,sharing=locked \
    DATABASE_URL="${DUMMY_DATABASE_URL}" \
    yarn install --immutable

# Generate Prisma Client (if not done by postinstall)
RUN test -d node_modules/.prisma/client || \
    (DATABASE_URL="${DUMMY_DATABASE_URL}" yarn prisma generate --no-hints)

# ============================================================================
# STAGE 3: Source Code
# ============================================================================
FROM deps AS source
COPY tsconfig*.json next.config.ts postcss.config.mjs ./
COPY tailwind.config.ts eslint.config.mjs ./
COPY src ./src
COPY apps ./apps
COPY public ./public
COPY content ./content

# ============================================================================
# STAGE 4: Lint (Parallel execution)
# ============================================================================
FROM source AS lint
RUN yarn lint

# ============================================================================
# STAGE 5: Build (Parallel execution)
# ============================================================================
FROM source AS build
ENV NODE_ENV=production
ARG DUMMY_DATABASE_URL
ENV DATABASE_URL="${DUMMY_DATABASE_URL}"

# Cache Next.js build output
RUN --mount=type=cache,id=next-build-cache,target=/app/.next/cache,sharing=locked \
    yarn build

# ============================================================================
# STAGE 6: Verified Build Gate
# Ensures Lint AND Build succeed before proceeding to tests
# ============================================================================
FROM build AS verified-build
COPY --from=lint /app/package.json /tmp/lint-passed

# ============================================================================
# STAGE 7: Test Context
# Based on Verified Build, but we copy test files here.
# This means changing a test file does NOT trigger a rebuild of the app!
# ============================================================================
FROM verified-build AS test-source
COPY vitest.config.ts vitest.setup.ts ./
COPY vitest.mock-*.ts vitest.mock-*.tsx ./
COPY cucumber.js ./
COPY e2e ./e2e

# ============================================================================
# STAGE 8: Unit Tests (Sharded)
# ============================================================================
FROM test-source AS unit-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=4
RUN yarn test:run --shard ${SHARD_INDEX}/${SHARD_TOTAL} \
    > /tmp/test-shard-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/test-shard-${SHARD_INDEX}.log && exit 1)

# Explicit Targets (Standard Docker Build Compatibility)
FROM test-source AS unit-tests-1
RUN yarn test:run --shard 1/4 > /tmp/test-shard-1.log 2>&1 || (cat /tmp/test-shard-1.log && exit 1)
FROM test-source AS unit-tests-2
RUN yarn test:run --shard 2/4 > /tmp/test-shard-2.log 2>&1 || (cat /tmp/test-shard-2.log && exit 1)
FROM test-source AS unit-tests-3
RUN yarn test:run --shard 3/4 > /tmp/test-shard-3.log 2>&1 || (cat /tmp/test-shard-3.log && exit 1)
FROM test-source AS unit-tests-4
RUN yarn test:run --shard 4/4 > /tmp/test-shard-4.log 2>&1 || (cat /tmp/test-shard-4.log && exit 1)

# Collector
FROM test-source AS unit-tests
COPY --from=unit-tests-1 /tmp/test-shard-1.log /tmp/test-shard-1.log
COPY --from=unit-tests-2 /tmp/test-shard-2.log /tmp/test-shard-2.log
COPY --from=unit-tests-3 /tmp/test-shard-3.log /tmp/test-shard-3.log
COPY --from=unit-tests-4 /tmp/test-shard-4.log /tmp/test-shard-4.log
RUN cat /tmp/test-shard-*.log

# ============================================================================
# STAGE 9: E2E Browser Environment
# ============================================================================
FROM base AS e2e-browser
# Install process tools for start-server-and-test
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends procps

# Install Playwright Browsers
# We use the version of playwright in package.json to ensure compatibility
COPY package.json ./
RUN npx playwright install chromium --with-deps

# ============================================================================
# STAGE 10: E2E Execution
# ============================================================================
FROM e2e-browser AS e2e-test-base
WORKDIR /app

# 1. Get dev dependencies (node_modules) from deps stage
COPY --from=deps /app/node_modules ./node_modules
# 2. Get built application from verified-build stage
COPY --from=verified-build /app/.next ./.next
COPY --from=verified-build /app/public ./public
# 3. Get source code (needed for tests and configs)
COPY --from=test-source /app ./

ARG DATABASE_URL
ARG AUTH_SECRET
ARG E2E_BYPASS_SECRET

ENV CI=true \
    BASE_URL=http://localhost:3000 \
    NEXTAUTH_URL=http://localhost:3000 \
    SKIP_ENV_VALIDATION=true \
    DATABASE_URL=${DATABASE_URL} \
    AUTH_SECRET=${AUTH_SECRET} \
    E2E_BYPASS_SECRET=${E2E_BYPASS_SECRET}

RUN mkdir -p e2e/reports

# Sharded Runners
FROM e2e-test-base AS e2e-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=4
# Note: No yarn install needed! We copied node_modules
RUN yarn start:server:and:test --shard ${SHARD_INDEX}/${SHARD_TOTAL} \
    > /tmp/e2e-shard-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/e2e-shard-${SHARD_INDEX}.log && exit 1)

# Explicit Targets
FROM e2e-test-base AS e2e-tests-1
RUN yarn start:server:and:test --shard 1/4 > /tmp/e2e-shard-1.log 2>&1 || (cat /tmp/e2e-shard-1.log && exit 1)
FROM e2e-test-base AS e2e-tests-2
RUN yarn start:server:and:test --shard 2/4 > /tmp/e2e-shard-2.log 2>&1 || (cat /tmp/e2e-shard-2.log && exit 1)
FROM e2e-test-base AS e2e-tests-3
RUN yarn start:server:and:test --shard 3/4 > /tmp/e2e-shard-3.log 2>&1 || (cat /tmp/e2e-shard-3.log && exit 1)
FROM e2e-test-base AS e2e-tests-4
RUN yarn start:server:and:test --shard 4/4 > /tmp/e2e-shard-4.log 2>&1 || (cat /tmp/e2e-shard-4.log && exit 1)

# Collector
FROM e2e-test-base AS e2e-tests
COPY --from=e2e-tests-1 /tmp/e2e-shard-1.log /tmp/e2e-shard-1.log
COPY --from=e2e-tests-2 /tmp/e2e-shard-2.log /tmp/e2e-shard-2.log
COPY --from=e2e-tests-3 /tmp/e2e-shard-3.log /tmp/e2e-shard-3.log
COPY --from=e2e-tests-4 /tmp/e2e-shard-4.log /tmp/e2e-shard-4.log
RUN cat /tmp/e2e-shard-*.log

# ============================================================================
# STAGE 11: CI Gateway
# ============================================================================
FROM e2e-tests AS ci
RUN echo "✅ CI Pipeline Complete: Lint, Build, Unit, E2E Passed."

# ============================================================================
# STAGE 12: Production Image
# ============================================================================
FROM base AS production
WORKDIR /app

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

# Copy standalone output
# Logic handles if standalone output is in root or inside package folder
COPY --from=build --chown=1001:1001 /app/.next/standalone ./
COPY --from=build --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=build --chown=1001:1001 /app/public ./public

USER nextjs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["node", "server.js"]