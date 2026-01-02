# syntax=docker/dockerfile:1.20

ARG NODE_IMAGE=node:24.12.0-bookworm-slim
ARG DUMMY_DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG CACHE_NS=vercel-app
ARG TEST_CACHE_NS=test-cache

# ============================================================================
# STAGE 0: Base
# ============================================================================
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG CACHE_NS
ARG TARGETARCH

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && corepack enable

# ============================================================================
# STAGE 1: Dependency Context
# ============================================================================
FROM base AS dep-context
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn/ ./.yarn/
COPY --link packages/mcp-server/package.json ./packages/mcp-server/
COPY --link packages/opfs-node-adapter/package.json ./packages/opfs-node-adapter/
COPY --link packages/js.spike.land/package.json ./packages/js.spike.land/
COPY --link packages/code/package.json ./packages/code/
COPY --link packages/testing.spike.land/package.json ./packages/testing.spike.land/
COPY --link packages/spike-land-renderer/package.json ./packages/spike-land-renderer/
COPY --link packages/mobile-app/package.json ./packages/mobile-app/
COPY --link packages/shared/package.json ./packages/shared/
COPY --link prisma ./prisma

# ============================================================================
# STAGE 2: Install Dependencies
# ============================================================================
FROM base AS deps
ARG CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 make g++ \
       libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev

COPY --link --from=dep-context /app /app

RUN --mount=type=cache,id=${CACHE_NS}-yarn-cache-${TARGETARCH},target=/app/.yarn/cache,sharing=locked \
    DATABASE_URL="${DUMMY_DATABASE_URL}" \
    yarn install --immutable

RUN test -d node_modules/.prisma/client || \
    (DATABASE_URL="${DUMMY_DATABASE_URL}" yarn prisma generate --no-hints)

# ============================================================================
# STAGE 3: Source Code
# ============================================================================
FROM deps AS source
COPY --link tsconfig*.json next.config.ts postcss.config.mjs ./
COPY --link tailwind.config.ts eslint.config.mjs ./
COPY --link src ./src
COPY --link apps ./apps
COPY --link public ./public
COPY --link content ./content

# ============================================================================
# STAGE: Development
# ============================================================================
FROM source AS dev
COPY --link .env.local .env.local
ENV NODE_ENV=development
EXPOSE 3000
CMD ["yarn", "dev"]

# ============================================================================
# STAGE 4: Lint
# ============================================================================
FROM source AS lint
RUN yarn lint

# ============================================================================
# STAGE 5: Build
# ============================================================================
FROM source AS build
ARG CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=production \
    DATABASE_URL="${DUMMY_DATABASE_URL}"

RUN --mount=type=cache,id=${CACHE_NS}-next-cache-${TARGETARCH},target=/app/.next/cache,sharing=locked \
    yarn build

# ============================================================================
# STAGE 6: Type Check
# ============================================================================
FROM source AS tsc
RUN yarn tsc --noEmit

# ============================================================================
# STAGE 7: Test Context
# ============================================================================
FROM source AS test-source
COPY --link vitest.config.ts vitest.setup.ts ./
COPY --link vitest.mock-*.ts vitest.mock-*.tsx ./
COPY --link cucumber.js ./
COPY --link e2e ./e2e
# Copy test caching scripts
COPY --link scripts/vitest-coverage-mapper-reporter.ts scripts/test-cache-manager.ts scripts/run-cached-tests.sh ./scripts/
RUN chmod +x ./scripts/run-cached-tests.sh

# ============================================================================
# STAGE 8: Unit Tests (sharded) - with coverage-based caching
# ============================================================================
FROM test-source AS unit-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=4
ARG TEST_CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=test \
    DATABASE_URL=${DUMMY_DATABASE_URL} \
    SHARD_INDEX=${SHARD_INDEX} \
    SHARD_TOTAL=${SHARD_TOTAL} \
    TEST_CACHE_DIR=/app/.test-cache \
    VITEST_COVERAGE=true
RUN --mount=type=cache,id=${TEST_CACHE_NS}-${TARGETARCH},target=/app/.test-cache,sharing=locked \
    ./scripts/run-cached-tests.sh > /tmp/unit-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/unit-${SHARD_INDEX}.log && exit 1)

FROM test-source AS unit-tests-1
ARG TEST_CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=test \
    DATABASE_URL=${DUMMY_DATABASE_URL} \
    SHARD_INDEX=1 \
    SHARD_TOTAL=4 \
    TEST_CACHE_DIR=/app/.test-cache \
    VITEST_COVERAGE=true
RUN --mount=type=cache,id=${TEST_CACHE_NS}-${TARGETARCH},target=/app/.test-cache,sharing=locked \
    ./scripts/run-cached-tests.sh > /tmp/unit-1.log 2>&1 || (cat /tmp/unit-1.log && exit 1)

FROM test-source AS unit-tests-2
ARG TEST_CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=test \
    DATABASE_URL=${DUMMY_DATABASE_URL} \
    SHARD_INDEX=2 \
    SHARD_TOTAL=4 \
    TEST_CACHE_DIR=/app/.test-cache \
    VITEST_COVERAGE=true
RUN --mount=type=cache,id=${TEST_CACHE_NS}-${TARGETARCH},target=/app/.test-cache,sharing=locked \
    ./scripts/run-cached-tests.sh > /tmp/unit-2.log 2>&1 || (cat /tmp/unit-2.log && exit 1)

FROM test-source AS unit-tests-3
ARG TEST_CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=test \
    DATABASE_URL=${DUMMY_DATABASE_URL} \
    SHARD_INDEX=3 \
    SHARD_TOTAL=4 \
    TEST_CACHE_DIR=/app/.test-cache \
    VITEST_COVERAGE=true
RUN --mount=type=cache,id=${TEST_CACHE_NS}-${TARGETARCH},target=/app/.test-cache,sharing=locked \
    ./scripts/run-cached-tests.sh > /tmp/unit-3.log 2>&1 || (cat /tmp/unit-3.log && exit 1)

FROM test-source AS unit-tests-4
ARG TEST_CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=test \
    DATABASE_URL=${DUMMY_DATABASE_URL} \
    SHARD_INDEX=4 \
    SHARD_TOTAL=4 \
    TEST_CACHE_DIR=/app/.test-cache \
    VITEST_COVERAGE=true
RUN --mount=type=cache,id=${TEST_CACHE_NS}-${TARGETARCH},target=/app/.test-cache,sharing=locked \
    ./scripts/run-cached-tests.sh > /tmp/unit-4.log 2>&1 || (cat /tmp/unit-4.log && exit 1)

FROM test-source AS unit-tests
COPY --link --from=unit-tests-1 /tmp/unit-1.log /tmp/
COPY --link --from=unit-tests-2 /tmp/unit-2.log /tmp/
COPY --link --from=unit-tests-3 /tmp/unit-3.log /tmp/
COPY --link --from=unit-tests-4 /tmp/unit-4.log /tmp/
RUN cat /tmp/unit-*.log && echo "::notice::✅ All 4 unit test shards passed"

# ============================================================================
# STAGE 9: E2E Browser Environment
# ============================================================================
FROM base AS e2e-browser
ARG CACHE_NS
ARG TARGETARCH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends procps

RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/tmp/pw-cache,sharing=locked \
    mkdir -p /ms-playwright \
    && PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-cache /app/node_modules/.bin/playwright install chromium --with-deps \
    && cp -a /tmp/pw-cache/* /ms-playwright/

# ============================================================================
# STAGE 10: E2E Test Base
# ============================================================================
FROM e2e-browser AS e2e-test-base
WORKDIR /app
ARG DUMMY_DATABASE_URL

# Copy dependency metadata
COPY --link --from=dep-context /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --link --from=dep-context /app/.yarn/ ./.yarn/
COPY --link --from=dep-context /app/packages/ ./packages/
COPY --link --from=dep-context /app/prisma ./prisma

# Copy built application and dependencies
# COPY --link --from=build /app/.next ./.next
# COPY --link --from=build /app/public ./public
COPY --link --from=deps /app/node_modules ./node_modules

# Copy source files needed for E2E
COPY --link --from=source /app/tsconfig*.json /app/next.config.ts /app/postcss.config.mjs ./
COPY --link --from=source /app/tailwind.config.ts ./
COPY --link --from=source /app/src ./src
COPY --link --from=source /app/apps ./apps
COPY --link --from=source /app/content ./content

# Copy test files and environment
COPY --link .env.local ./
COPY --link --from=test-source /app/e2e ./e2e
COPY --link --from=test-source /app/cucumber.js ./cucumber.js
# Copy E2E cache scripts
COPY --link scripts/e2e-cache-manager.ts scripts/run-cached-e2e.sh scripts/e2e-shard.sh ./scripts/
RUN chmod +x ./scripts/run-cached-e2e.sh ./scripts/e2e-shard.sh

ARG DATABASE_URL=${DUMMY_DATABASE_URL}
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
# STAGE 11: E2E Tests (sharded) - with coverage-based caching
# ============================================================================
FROM e2e-test-base AS e2e-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=8
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=${SHARD_INDEX} \
    SHARD_TOTAL=${SHARD_TOTAL} \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-1
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=1 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-2
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=2 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-3
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=3 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-4
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=4 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-5
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=5 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-6
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=6 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-7
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=7 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests-8
ARG TEST_CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=8 \
    SHARD_TOTAL=8 \
    E2E_CACHE_DIR=/app/.e2e-cache \
    E2E_COVERAGE=true
RUN yarn start:server:and:test:pr

FROM e2e-test-base AS e2e-tests
COPY --link --from=e2e-tests-1 /tmp/. /tmp/
COPY --link --from=e2e-tests-2 /tmp/. /tmp/
COPY --link --from=e2e-tests-3 /tmp/. /tmp/
COPY --link --from=e2e-tests-4 /tmp/. /tmp/
COPY --link --from=e2e-tests-5 /tmp/. /tmp/
COPY --link --from=e2e-tests-6 /tmp/. /tmp/
COPY --link --from=e2e-tests-7 /tmp/. /tmp/
COPY --link --from=e2e-tests-8 /tmp/. /tmp/
RUN cat /tmp/e2e-*.log && echo "::notice::✅ All 8 E2E test shards passed"

# ============================================================================
# STAGE 12: CI Gateway
# ============================================================================
FROM e2e-tests AS ci
COPY --link --from=unit-tests /tmp/unit-1.log /tmp/unit-passed
COPY --link --from=lint /app/package.json /tmp/lint-passed
COPY --link --from=tsc /app/package.json /tmp/tsc-passed
RUN echo "::notice::✅ CI Pipeline Complete: Lint, Build, Unit Tests, E2E Tests"

# ============================================================================
# STAGE 13: Production Image
# ============================================================================
FROM ${NODE_IMAGE} AS production
WORKDIR /app

ARG BUILD_SHA
ARG BUILD_DATE
LABEL org.opencontainers.image.revision="${BUILD_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.title="spike.land" \
      org.opencontainers.image.description="Next.js production image"

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

COPY --link --from=build --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=build --chown=1001:1001 /app/.next/static ./.next/static
COPY --link --from=build --chown=1001:1001 /app/public ./public

# Copy Prisma client (required for database operations)
COPY --link --from=deps --chown=1001:1001 /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "server.js"]
