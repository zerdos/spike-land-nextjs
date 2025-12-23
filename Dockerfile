# syntax=docker/dockerfile:1.20

ARG NODE_IMAGE=node:24.12.0-bookworm-slim
ARG DUMMY_DATABASE_URL=postgresql://build:build@localhost:5432/build
# Namespace caches on shared runners (set per repo, e.g. spike-land)
ARG CACHE_NS=vercel-app

# ============================================================================
# STAGE 0: Base
# Ultra-stable runtime + corepack.
# ============================================================================
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG CACHE_NS
ARG TARGETARCH

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && corepack enable

# ============================================================================
# STAGE 1: Dependency Context
# Copy all Yarn metadata (plugins/patches/etc). Keep it stable for caching.
# IMPORTANT: rely on .dockerignore to exclude .yarn/cache and other heavy dirs.
# ============================================================================
FROM base AS dep-context
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/opfs-node-adapter/package.json ./packages/opfs-node-adapter/
COPY prisma ./prisma

# ============================================================================
# STAGE 2: Install Dependencies (native toolchain only here)
# ============================================================================
FROM base AS deps
ARG CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
      libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev

COPY --from=dep-context /app /app

RUN --mount=type=cache,id=${CACHE_NS}-yarn-cache-${TARGETARCH},target=/app/.yarn/cache,sharing=locked \
    DATABASE_URL="${DUMMY_DATABASE_URL}" \
    yarn install --immutable

# Prisma client (postinstall usually does it, keep guard)
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
# STAGE: Development (docker-compose)
# ============================================================================
FROM source AS dev
COPY .env.local .env.local
ENV NODE_ENV=development
EXPOSE 3000
CMD ["yarn", "dev"]

# ============================================================================
# STAGE 4: Lint (parallel with build)
# ============================================================================
FROM source AS lint
RUN yarn lint

# ============================================================================
# STAGE 5: Build (parallel with lint)
# ============================================================================
FROM source AS build
ARG CACHE_NS
ARG TARGETARCH
ARG DUMMY_DATABASE_URL
ENV NODE_ENV=production
ENV DATABASE_URL="${DUMMY_DATABASE_URL}"

RUN --mount=type=cache,id=${CACHE_NS}-next-cache-${TARGETARCH},target=/app/.next/cache,sharing=locked \
    yarn build

# ============================================================================
# STAGE 6: Type Check (parallel with build)
# ============================================================================

FROM source AS tsc
RUN yarn tsc --noEmit

# ============================================================================
# STAGE 7: Test Context (copy tests AFTER build)
# ============================================================================
FROM source AS test-source
COPY vitest.config.ts vitest.setup.ts ./
COPY vitest.mock-*.ts vitest.mock-*.tsx ./
COPY cucumber.js ./
COPY e2e ./e2e

# ============================================================================
# STAGE 8: Unit Tests (sharded)
# Override NODE_ENV for tests - React testing requires development mode for act()
# ============================================================================
FROM test-source AS unit-test-shard
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=4
ENV NODE_ENV=test
RUN yarn test:run --shard ${SHARD_INDEX}/${SHARD_TOTAL} \
    > /tmp/unit-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/unit-${SHARD_INDEX}.log && exit 1)

FROM test-source AS unit-tests-1
ENV NODE_ENV=test
RUN yarn test:run --shard 1/4 > /tmp/unit-1.log 2>&1 || (cat /tmp/unit-1.log && exit 1)
FROM test-source AS unit-tests-2
ENV NODE_ENV=test
RUN yarn test:run --shard 2/4 > /tmp/unit-2.log 2>&1 || (cat /tmp/unit-2.log && exit 1)
FROM test-source AS unit-tests-3
ENV NODE_ENV=test
RUN yarn test:run --shard 3/4 > /tmp/unit-3.log 2>&1 || (cat /tmp/unit-3.log && exit 1)
FROM test-source AS unit-tests-4
ENV NODE_ENV=test
RUN yarn test:run --shard 4/4 > /tmp/unit-4.log 2>&1 || (cat /tmp/unit-4.log && exit 1)

FROM test-source AS unit-tests
COPY --from=unit-tests-1 /tmp/unit-1.log /tmp/
COPY --from=unit-tests-2 /tmp/unit-2.log /tmp/
COPY --from=unit-tests-3 /tmp/unit-3.log /tmp/
COPY --from=unit-tests-4 /tmp/unit-4.log /tmp/
RUN cat /tmp/unit-*.log && echo "::notice::✅ All 4 unit test shards passed"

# ============================================================================
# STAGE 9: E2E Browser Environment (Playwright cached)
# Uses the Playwright version from deps (no npx version drift).
# ============================================================================
FROM base AS e2e-browser
ARG CACHE_NS
ARG TARGETARCH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN --mount=type=cache,id=${CACHE_NS}-apt-cache-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=${CACHE_NS}-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends procps

# Install browsers using your repo's installed Playwright CLI (mounted from deps)
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    /app/node_modules/.bin/playwright install chromium --with-deps

# ============================================================================
# STAGE 10: E2E Test Base (small, deterministic)
# Copy only what E2E needs. Node modules are mounted per-shard.
# ============================================================================
FROM e2e-browser AS e2e-test-base
WORKDIR /app

# Yarn runtime metadata (so `yarn <script>` works)
COPY --from=dep-context /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=dep-context /app/.yarn/ ./.yarn/
COPY --from=dep-context /app/packages/ ./packages/

# Built app (standalone mode) - preserve directory structure for start:ci script
COPY --from=build /app/.next/standalone ./.next/standalone
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# E2E tests + config only
COPY --from=test-source /app/e2e ./e2e
COPY --from=test-source /app/cucumber.js ./cucumber.js

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
# STAGE 11: E2E Tests (sharded)
# Mount node_modules from deps and Playwright cache for browser access.
# ============================================================================
FROM e2e-test-base AS e2e-test-shard
ARG CACHE_NS
ARG TARGETARCH
ARG SHARD_INDEX=1
ARG SHARD_TOTAL=8
ENV SHARD_INDEX=${SHARD_INDEX}
ENV SHARD_TOTAL=${SHARD_TOTAL}
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci \
    > /tmp/e2e-${SHARD_INDEX}.log 2>&1 \
    || (cat /tmp/e2e-${SHARD_INDEX}.log && exit 1)

FROM e2e-test-base AS e2e-tests-1
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=1
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-1.log 2>&1 || (cat /tmp/e2e-1.log && exit 1)

FROM e2e-test-base AS e2e-tests-2
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=2
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-2.log 2>&1 || (cat /tmp/e2e-2.log && exit 1)

FROM e2e-test-base AS e2e-tests-3
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=3
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci 

FROM e2e-test-base AS e2e-tests-4
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=4
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-4.log 2>&1 || (cat /tmp/e2e-4.log && exit 1)

FROM e2e-test-base AS e2e-tests-5
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=5
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-5.log 2>&1 || (cat /tmp/e2e-5.log && exit 1)

FROM e2e-test-base AS e2e-tests-6
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=6
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-6.log 2>&1 || (cat /tmp/e2e-6.log && exit 1)

FROM e2e-test-base AS e2e-tests-7
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=7
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-7.log 2>&1 || (cat /tmp/e2e-7.log && exit 1)

FROM e2e-test-base AS e2e-tests-8
ARG CACHE_NS
ARG TARGETARCH
ENV SHARD_INDEX=8
ENV SHARD_TOTAL=8
RUN --mount=type=bind,from=deps,source=/app/node_modules,target=/app/node_modules,readonly \
    --mount=type=cache,id=${CACHE_NS}-playwright-${TARGETARCH},target=/ms-playwright,sharing=locked \
    yarn start:server:and:test:ci > /tmp/e2e-8.log 2>&1 || (cat /tmp/e2e-8.log && exit 1)

FROM e2e-test-base AS e2e-tests
COPY --from=e2e-tests-1 /tmp/e2e-1.log /tmp/
COPY --from=e2e-tests-2 /tmp/e2e-2.log /tmp/
COPY --from=e2e-tests-3 /tmp/e2e-3.log /tmp/
COPY --from=e2e-tests-4 /tmp/e2e-4.log /tmp/
COPY --from=e2e-tests-5 /tmp/e2e-5.log /tmp/
COPY --from=e2e-tests-6 /tmp/e2e-6.log /tmp/
COPY --from=e2e-tests-7 /tmp/e2e-7.log /tmp/
COPY --from=e2e-tests-8 /tmp/e2e-8.log /tmp/
RUN cat /tmp/e2e-*.log && echo "::notice::✅ All 8 E2E test shards passed"

# ============================================================================
# STAGE 12: CI Gateway
# Must depend on BOTH unit-tests and e2e-tests
# ============================================================================
FROM e2e-tests AS ci
# Force unit-tests to complete by copying proof file
COPY --from=unit-tests /tmp/unit-1.log /tmp/unit-passed
COPY --from=lint   /app/package.json   /tmp/lint-passed
COPY --from=tsc    /app/package.json   /tmp/tsc-passed
RUN echo "::notice::✅ CI Pipeline Complete: Lint, Build, Unit Tests, E2E Tests"

# ============================================================================
# STAGE 13: Production Image (minimal)
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

USER nextjs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "server.js"]