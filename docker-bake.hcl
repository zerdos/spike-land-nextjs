# ============================================================================
# Docker Bake Configuration for CI/CD Pipeline
#
# This replaces repetitive Dockerfile sharding with declarative HCL syntax.
# BuildKit will automatically parallelize targets within the same group.
#
# Usage:
#   docker buildx bake                    # Build default (ci) target
#   docker buildx bake ci                 # Full CI pipeline
#   docker buildx bake unit-tests         # Just unit tests (all shards)
#   docker buildx bake e2e-tests          # Just E2E tests (all shards)
#   docker buildx bake production         # Production image
#   docker buildx bake --print            # Preview what would be built
#
# With secrets (for E2E):
#   docker buildx bake ci \
#     --set *.args.DATABASE_URL=$DATABASE_URL \
#     --set *.args.AUTH_SECRET=$AUTH_SECRET \
#     --set *.args.E2E_BYPASS_SECRET=$E2E_BYPASS_SECRET
# ============================================================================

variable "UNIT_SHARDS" {
  default = 4
}

variable "E2E_SHARDS" {
  default = 4
}

variable "DATABASE_URL" {
  default = ""
}

variable "AUTH_SECRET" {
  default = ""
}

variable "E2E_BYPASS_SECRET" {
  default = ""
}

# ============================================================================
# Groups - Logical collections of targets
# ============================================================================

group "default" {
  targets = ["ci"]
}

group "ci" {
  targets = ["ci-final"]
}

group "unit-tests" {
  targets = ["unit-tests-collector"]
}

group "e2e-tests" {
  targets = ["e2e-tests-collector"]
}

# ============================================================================
# Base Targets - Shared configuration
# ============================================================================

target "_common" {
  dockerfile = "Dockerfile"
  context    = "."
}

# ============================================================================
# Build Pipeline Targets
# ============================================================================

target "base" {
  inherits = ["_common"]
  target   = "base"
}

target "deps" {
  inherits = ["_common"]
  target   = "deps"
}

target "source" {
  inherits = ["_common"]
  target   = "source"
}

target "lint" {
  inherits = ["_common"]
  target   = "lint"
}

target "build" {
  inherits = ["_common"]
  target   = "build"
  cache-to = ["type=local,dest=.docker-cache/build"]
  cache-from = ["type=local,src=.docker-cache/build"]
}

target "verified-build" {
  inherits = ["_common"]
  target   = "verified-build"
}

target "test-source" {
  inherits = ["_common"]
  target   = "test-source"
}

# ============================================================================
# Unit Test Shards - Matrix build pattern
# ============================================================================

target "unit-test-shard" {
  inherits = ["_common"]
  target   = "unit-test-shard"
  args = {
    SHARD_INDEX = "1"
    SHARD_TOTAL = "${UNIT_SHARDS}"
  }
}

target "unit-tests-1" {
  inherits = ["unit-test-shard"]
  args = {
    SHARD_INDEX = "1"
    SHARD_TOTAL = "${UNIT_SHARDS}"
  }
}

target "unit-tests-2" {
  inherits = ["unit-test-shard"]
  args = {
    SHARD_INDEX = "2"
    SHARD_TOTAL = "${UNIT_SHARDS}"
  }
}

target "unit-tests-3" {
  inherits = ["unit-test-shard"]
  args = {
    SHARD_INDEX = "3"
    SHARD_TOTAL = "${UNIT_SHARDS}"
  }
}

target "unit-tests-4" {
  inherits = ["unit-test-shard"]
  args = {
    SHARD_INDEX = "4"
    SHARD_TOTAL = "${UNIT_SHARDS}"
  }
}

target "unit-tests-collector" {
  inherits = ["_common"]
  target   = "unit-tests"
}

# ============================================================================
# E2E Test Shards - Matrix build pattern
# ============================================================================

target "e2e-test-shard" {
  inherits = ["_common"]
  target   = "e2e-test-shard"
  args = {
    SHARD_INDEX       = "1"
    SHARD_TOTAL       = "${E2E_SHARDS}"
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "e2e-tests-1" {
  inherits = ["e2e-test-shard"]
  args = {
    SHARD_INDEX       = "1"
    SHARD_TOTAL       = "${E2E_SHARDS}"
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "e2e-tests-2" {
  inherits = ["e2e-test-shard"]
  args = {
    SHARD_INDEX       = "2"
    SHARD_TOTAL       = "${E2E_SHARDS}"
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "e2e-tests-3" {
  inherits = ["e2e-test-shard"]
  args = {
    SHARD_INDEX       = "3"
    SHARD_TOTAL       = "${E2E_SHARDS}"
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "e2e-tests-4" {
  inherits = ["e2e-test-shard"]
  args = {
    SHARD_INDEX       = "4"
    SHARD_TOTAL       = "${E2E_SHARDS}"
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "e2e-tests-collector" {
  inherits = ["_common"]
  target   = "e2e-tests"
  args = {
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

# ============================================================================
# Final Targets
# ============================================================================

target "ci-final" {
  inherits = ["_common"]
  target   = "ci"
  args = {
    DATABASE_URL      = "${DATABASE_URL}"
    AUTH_SECRET       = "${AUTH_SECRET}"
    E2E_BYPASS_SECRET = "${E2E_BYPASS_SECRET}"
  }
}

target "production" {
  inherits = ["_common"]
  target   = "production"
  tags     = ["spike-land:production", "spike-land:latest"]
}

target "dev" {
  inherits = ["_common"]
  target   = "dev"
  tags     = ["spike-land:dev"]
}
