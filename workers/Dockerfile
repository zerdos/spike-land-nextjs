# syntax=docker/dockerfile:1.20
# Production workerd Docker image
#
# Runs workerd serve with capnp config, injecting environment variables
# at startup via envsubst from config.capnp.template.
#
# Build:
#   docker build -t spike-land-workerd -f workers/Dockerfile workers/
#
# Run:
#   docker run -p 8080:8080 \
#     -e REDIS_URL=redis://host:6379 \
#     -e JWT_SECRET=your-secret \
#     spike-land-workerd

FROM node:22-slim AS builder

ARG TARGETARCH

RUN --mount=type=cache,id=workerd-apt-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=workerd-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl

RUN npm install -g workerd@1.20260214.0

WORKDIR /app
COPY --link config.capnp.template ./
COPY --link config.capnp ./

# Copy transpiler package.json first for dependency install caching
COPY --link services/transpiler/package.json ./services/transpiler/package.json

WORKDIR /app/services/transpiler
RUN npm install --production

# Copy remaining services source for build
WORKDIR /app
COPY --link services/ ./services/

# Build the transpiler bundle (esbuild-wasm + worker code -> single file)
WORKDIR /app/services/transpiler
RUN node build.mjs
WORKDIR /app

# Verify workerd binary works
RUN workerd --version

# Production image: slim Node.js base (workerd needs libc++)
FROM node:22-slim

ARG TARGETARCH

RUN --mount=type=cache,id=workerd-prod-apt-${TARGETARCH},target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=workerd-prod-apt-lists-${TARGETARCH},target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends gettext-base

# Copy workerd binary from builder
COPY --link --from=builder /usr/local/lib/node_modules/workerd /usr/local/lib/node_modules/workerd
RUN ln -s /usr/local/lib/node_modules/workerd/bin/workerd /usr/local/bin/workerd

# Copy application
WORKDIR /app
COPY --link --from=builder /app/config.capnp.template ./
COPY --link --from=builder /app/config.capnp ./
COPY --link --from=builder /app/services/ ./services/
COPY --link entrypoint.sh ./
RUN chmod +x /app/entrypoint.sh

# Create non-root user
RUN groupadd -g 1001 workerd && useradd -u 1001 -g workerd workerd
USER workerd

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:8080/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
