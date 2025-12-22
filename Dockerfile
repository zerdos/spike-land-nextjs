# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.12.0-bookworm-slim
ARG DUMMY_DATABASE_URL="postgresql://build:build@localhost:5432/build"

# ============================================================================
# STAGE 0: Base
# Minimal runtime dependencies. Keep ultra-stable for best caching.
# ============================================================================
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,id=apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && corepack enable

# ============================================================================
# STAGE 1: Dependency Context
# Isolated layer for package manager files. Source changes won't bust this cache.
# ============================================================================
FROM base AS dep-context
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/opfs-node-adapter/package.json ./packages/opfs-node-adapter/
COPY prisma ./prisma

# ============================================================================
# STAGE 2: Install Dependencies
# Native toolchain lives here only - not inherited by production.
# ============================================================================
FROM base AS deps
RUN --mount=type=cache,id=apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
      libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev

COPY --from=dep-context /app ./

ARG DUMMY_DATABASE_URL
RUN --mount=type=cache,id=yarn-cache-${TARGETARCH},target=/app/.yarn/cache,sharing=locked \
    DATABASE_URL="${DUMMY_DATABASE_URL}" \
    yarn install --immutable

# Generate Prisma Client (if postinstall didn't)
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
# STAGE: Development (for docker-compose)
# ============================================================================
FROM source AS dev
COPY .env.local .env.local
ENV NODE_ENV=development
EXPOSE 3000
CMD ["yarn", "dev"]

# ============================================================================
# STAGE 4: Lint (Parallel with Build)
# ============================================================================
FROM source AS lint
RUN yarn lint

# ============================================================================
# STAGE 5: Build (Parallel with Lint)
# ============================================================================
FROM source AS build
ENV NODE_ENV=production
ARG DUMMY_DATABASE_URL
ENV DATABASE_URL="${DUMMY_DATABASE_URL}"

RUN --mount=type=cache,id=next-build-cache-${TARGETARCH},target=/app/.next/cache,sharing=locked \
    yarn build

# ============================================================================
# STAGE 6: Verified Build Gate
# Forces both lint AND build to succeed before tests run.
# ============================================================================
FROM build AS verified-build
COPY --from=lint /app/package.json /tmp/lint-passed

# ============================================================================
# STAGE 7: Test Context
# Test file changes DON'T trigger app rebuild - key optimization!
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

# Explicit shard targets (for standard docker build)
FROM test-source AS unit-tests-1
RUN yarn test:run --shard 1/4 > /tmp/test-shard-1.log 2>&1 || (cat /tmp/test-shard-1.log && exit 1)
FROM test-source AS unit-tests-2
RUN yarn test:run --shard 2/4 > /tmp/test-shard-2.log 2>&1 || (cat /tmp/test-shard-2.log && exit 1)
FROM test-source AS unit-tests-3
RUN yarn test:run --shard 3/4 > /tmp/test-shard-3.log 2>&1 || (cat /tmp/test-shard-3.log && exit 1)
FROM test-source AS unit-tests-4
RUN yarn test:run --shard 4/4 > /tmp/test-shard-4.log 2>&1 || (cat /tmp/test-shard-4.log && exit 1)

# Collector with CI-friendly output
FROM test-source AS unit-tests
COPY --from=unit-tests-1 /tmp/test-shard-1.log /tmp/
COPY --from=unit-tests-2 /tmp/test-shard-2.log /tmp/
COPY --from=unit-tests-3 /tmp/test-shard-3.log /tmp/
COPY --from=unit-tests-4 /tmp/test-shard-4.log /tmp/
RUN cat /tmp/test-shard-*.log && \
    echo "::notice::✅ All 4 unit test shards passed"

# ============================================================================
# STAGE 9: E2E Browser Environment
# Playwright browsers cached separately (~400MB savings on cache hit)
# ============================================================================
FROM base AS e2e-browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN --mount=type=cache,id=apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends procps

# Copy package.json to ensure playwright version matches lockfile
COPY --from=dep-context /app/package.json ./

# IMPORTANT: Added sharing=locked to prevent concurrent install corruption
RUN --mount=type=cache,id=playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    npx playwright install chromium --with-deps

# ============================================================================
# STAGE 10: E2E Test Base
# Assembles everything needed for E2E without reinstalling deps.
# ============================================================================
FROM e2e-browser AS e2e-test-base
WORKDIR /app

# 1. FIX: Explicitly copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# 2. Copy test source files (configs, e2e folder)
COPY --from=test-source /app ./

# 3. Overlay built output from verified-build
# Note: This overwrites any overlapping source files with build artifacts
COPY --from=verified-build /app/.next ./.next
COPY --from=verified-build /app/public ./public

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

# ============================================================================
# STAGE 11: E2E Tests (Sharded)
# ============================================================================
FROM e2e-test-base AS e2e-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=4
RUN yarn start:server:and:test --shard ${SHARD_INDEX}/${SHARD_TOTAL} \
    > /tmp/e2e-shard-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/e2e-shard-${SHARD_INDEX}.log && exit 1)

# Explicit shard targets
FROM e2e-test-base AS e2e-tests-1
RUN yarn start:server:and:test --shard 1/4 > /tmp/e2e-shard-1.log 2>&1 || (cat /tmp/e2e-shard-1.log && exit 1)
FROM e2e-test-base AS e2e-tests-2
RUN yarn start:server:and:test --shard 2/4 > /tmp/e2e-shard-2.log 2>&1 || (cat /tmp/e2e-shard-2.log && exit 1)
FROM e2e-test-base AS e2e-tests-3
RUN yarn start:server:and:test --shard 3/4 > /tmp/e2e-shard-3.log 2>&1 || (cat /tmp/e2e-shard-3.log && exit 1)
FROM e2e-test-base AS e2e-tests-4
RUN yarn start:server:and:test --shard 4/4 > /tmp/e2e-shard-4.log 2>&1 || (cat /tmp/e2e-shard-4.log && exit 1)

# Collector with CI-friendly output
FROM e2e-test-base AS e2e-tests
COPY --from=e2e-tests-1 /tmp/e2e-shard-1.log /tmp/
COPY --from=e2e-tests-2 /tmp/e2e-shard-2.log /tmp/
COPY --from=e2e-tests-3 /tmp/e2e-shard-3.log /tmp/
COPY --from=e2e-tests-4 /tmp/e2e-shard-4.log /tmp/
RUN cat /tmp/e2e-shard-*.log && \
    echo "::notice::✅ All 4 E2E test shards passed"

# ============================================================================
# STAGE 12: CI Gateway
# ============================================================================
FROM e2e-tests AS ci
RUN echo "::notice::✅ CI Pipeline Complete: Lint, Build, Unit Tests, E2E Tests"

# ============================================================================
# STAGE 13: Production Image
# Minimal footprint - doesn't inherit from base (no curl, corepack, etc.)
# ============================================================================
FROM ${NODE_IMAGE} AS production
WORKDIR /app

# Build metadata
ARG BUILD_SHA
ARG BUILD_DATE
LABEL org.opencontainers.image.revision="${BUILD_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.title="spike.land" \
      org.opencontainers.image.description="Next.js production image"

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

# Copy standalone output with --link for faster builds
# OPTIMIZATION: Ensure we chown to the correct user in one step
COPY --link --from=build --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=build --chown=1001:1001 /app/.next/static ./.next/static
COPY --link --from=build --chown=1001:1001 /app/public ./public

USER nextjs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000

# Healthcheck using Node (no curl needed = smaller image)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "server.js"]