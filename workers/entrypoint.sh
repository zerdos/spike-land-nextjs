#!/bin/sh
set -e

# Generate config.capnp from template by substituting environment variables.
# Defaults ensure workerd starts even if optional vars are missing.

export REDIS_URL="${REDIS_URL:-}"
export REDIS_TOKEN="${REDIS_TOKEN:-}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export DYNAMODB_TABLE="${DYNAMODB_TABLE:-spike-land-kv}"
export S3_BUCKET="${S3_BUCKET:-spike-land-storage}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
export REPLICATE_API_TOKEN="${REPLICATE_API_TOKEN:-}"
export JWT_SECRET="${JWT_SECRET:-dev-secret}"
export AUTH_ISSUER="${AUTH_ISSUER:-spike.land}"

envsubst < /app/config.capnp.template > /app/config.capnp

echo "[entrypoint] Generated config.capnp with env bindings"
echo "[entrypoint] REDIS_URL=${REDIS_URL:+(set)} AWS_REGION=${AWS_REGION}"

exec workerd serve /app/config.capnp "$@"
