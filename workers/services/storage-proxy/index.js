// Storage Proxy Service - KV/R2-style API backed by DynamoDB and S3
// Provides a unified storage interface for spike.land nanoservices.

// TODO: Integrate AWS SDK v3 with SigV4 signing for DynamoDB and S3 calls.
// For now, the route structure is defined with placeholder implementations.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// ---------------------------------------------------------------------------
// DynamoDB helpers (KV-style operations)
// TODO: Replace with AWS SDK v3 DynamoDBClient + fetch-based HTTP calls
// ---------------------------------------------------------------------------

async function kvGet(key, env) {
  // TODO: DynamoDB GetItem on table env.DYNAMODB_TABLE
  // Partition key: "pk" = key
  console.log(`[storage-proxy] KV GET: ${key}`);
  return null;
}

async function kvPut(key, value, env) {
  // TODO: DynamoDB PutItem on table env.DYNAMODB_TABLE
  // { pk: key, value: value, updatedAt: Date.now() }
  console.log(`[storage-proxy] KV PUT: ${key}`);
}

async function kvDelete(key, env) {
  // TODO: DynamoDB DeleteItem on table env.DYNAMODB_TABLE
  console.log(`[storage-proxy] KV DELETE: ${key}`);
}

// ---------------------------------------------------------------------------
// S3 helpers (R2-style operations)
// TODO: Replace with AWS SDK v3 S3Client + fetch-based HTTP calls
// ---------------------------------------------------------------------------

async function r2Get(key, env) {
  // TODO: S3 GetObject from bucket env.S3_BUCKET
  console.log(`[storage-proxy] R2 GET: ${key}`);
  return null;
}

async function r2Put(key, body, contentType, env) {
  // TODO: S3 PutObject to bucket env.S3_BUCKET
  console.log(`[storage-proxy] R2 PUT: ${key}`);
}

async function r2Delete(key, env) {
  // TODO: S3 DeleteObject from bucket env.S3_BUCKET
  console.log(`[storage-proxy] R2 DELETE: ${key}`);
}

async function r2List(prefix, env) {
  // TODO: S3 ListObjectsV2 from bucket env.S3_BUCKET with prefix
  console.log(`[storage-proxy] R2 LIST: prefix=${prefix}`);
  return { objects: [], truncated: false };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // Validate AWS configuration
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      // Allow health checks even without config
      if (pathname === "/health") {
        return jsonResponse({ status: "ok", configured: false });
      }
      return errorResponse("AWS credentials not configured", 503);
    }

    try {
      // --- KV operations: /kv/{key} ---
      if (pathname.startsWith("/kv/")) {
        const key = decodeURIComponent(pathname.slice(4));
        if (!key) return errorResponse("Missing key", 400);

        if (method === "GET") {
          const value = await kvGet(key, env);
          if (value === null) return errorResponse("Key not found", 404);
          return new Response(value, {
            headers: { "Content-Type": "application/octet-stream" },
          });
        }

        if (method === "PUT") {
          const value = await request.text();
          await kvPut(key, value, env);
          return jsonResponse({ key, stored: true });
        }

        if (method === "DELETE") {
          await kvDelete(key, env);
          return jsonResponse({ key, deleted: true });
        }

        return errorResponse("Method not allowed", 405);
      }

      // --- R2 operations: /r2/{key} or /r2?prefix={prefix} ---
      if (pathname.startsWith("/r2")) {
        // LIST: /r2?prefix={prefix}
        if (pathname === "/r2" && method === "GET") {
          const prefix = url.searchParams.get("prefix") || "";
          const result = await r2List(prefix, env);
          return jsonResponse(result);
        }

        const key = decodeURIComponent(pathname.slice(4));
        if (!key) return errorResponse("Missing key", 400);

        if (method === "GET") {
          const data = await r2Get(key, env);
          if (data === null) return errorResponse("Object not found", 404);
          return new Response(data, {
            headers: { "Content-Type": "application/octet-stream" },
          });
        }

        if (method === "PUT") {
          const body = await request.arrayBuffer();
          const contentType = request.headers.get("Content-Type") || "application/octet-stream";
          await r2Put(key, body, contentType, env);
          return jsonResponse({ key, stored: true });
        }

        if (method === "DELETE") {
          await r2Delete(key, env);
          return jsonResponse({ key, deleted: true });
        }

        return errorResponse("Method not allowed", 405);
      }

      // --- Health check ---
      if (pathname === "/health") {
        return jsonResponse({
          status: "ok",
          configured: true,
          region: env.AWS_REGION || "us-east-1",
          table: env.DYNAMODB_TABLE || "spike-land-kv",
          bucket: env.S3_BUCKET || "spike-land-storage",
        });
      }

      return errorResponse("Not found", 404);

    } catch (err) {
      console.error(`[storage-proxy] Error:`, err);
      return errorResponse(`Storage operation failed: ${err.message}`, 500);
    }
  },
};
