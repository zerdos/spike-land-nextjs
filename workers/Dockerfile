# Production workerd Docker image
#
# Runs workerd serve with the capnp config and embedded JS services.
# Uses a minimal Node.js base since workerd is distributed via npm.
#
# Build:
#   docker build -t spike-land-workerd -f workers/Dockerfile workers/
#
# Run:
#   docker run -p 8080:8080 \
#     -e REDIS_URL=redis://host:6379 \
#     -e DATABASE_URL=postgresql://... \
#     spike-land-workerd

FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g workerd@latest

WORKDIR /app
COPY config.capnp ./
COPY services/ ./services/

# Verify workerd binary works
RUN workerd --version

# Production image: slim Node.js base (workerd needs libc++)
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy workerd binary from builder
COPY --from=builder /usr/local/lib/node_modules/workerd /usr/local/lib/node_modules/workerd
RUN ln -s /usr/local/lib/node_modules/workerd/bin/workerd /usr/local/bin/workerd

# Copy application
WORKDIR /app
COPY --from=builder /app/config.capnp ./
COPY --from=builder /app/services/ ./services/

# Create non-root user
RUN groupadd -g 1001 workerd && useradd -u 1001 -g workerd workerd
USER workerd

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD ["curl", "-sf", "http://localhost:8080/ping"]

ENTRYPOINT ["workerd", "serve", "config.capnp"]
