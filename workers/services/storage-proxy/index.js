// Storage Proxy Service - KV/R2-style API backed by DynamoDB and S3
// Provides a unified storage interface for spike.land nanoservices.
// Uses raw fetch() with AWS SigV4 signing (no SDK - runs inside workerd).

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

const encoder = new TextEncoder();

/** Hex-encode a Uint8Array. */
function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** SHA-256 hash of arbitrary data (string or ArrayBuffer). Returns hex string. */
async function sha256Hex(data) {
  const input = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", input);
  return toHex(hash);
}

/** HMAC-SHA256 sign. Key can be ArrayBuffer or string (prefixed). Returns ArrayBuffer. */
async function hmacSha256(key, message) {
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const msgData = typeof message === "string" ? encoder.encode(message) : message;
  return crypto.subtle.sign("HMAC", cryptoKey, msgData);
}

// ---------------------------------------------------------------------------
// AWS SigV4 Signing
// ---------------------------------------------------------------------------

/**
 * URI-encode per AWS rules (RFC 3986 but also encode '/').
 * If `encodeSlash` is false, '/' is left unencoded (used for S3 paths).
 */
function uriEncode(str, encodeSlash = true) {
  let encoded = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (
      (ch >= "A" && ch <= "Z") ||
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "_" ||
      ch === "-" ||
      ch === "~" ||
      ch === "."
    ) {
      encoded += ch;
    } else if (ch === "/" && !encodeSlash) {
      encoded += ch;
    } else {
      const bytes = encoder.encode(ch);
      for (const b of bytes) {
        encoded += "%" + b.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return encoded;
}

/**
 * Build the canonical request string for SigV4.
 * @param {string} method - HTTP method
 * @param {string} path - URL path (already URI-encoded as needed)
 * @param {string} query - query string (without leading '?'), keys sorted
 * @param {Object} headers - canonical headers as { lowercaseName: trimmedValue }
 * @param {string} payloadHash - hex-encoded SHA-256 of the payload
 * @returns {string}
 */
function createCanonicalRequest(method, path, query, headers, payloadHash) {
  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${headers[k]}`)
    .join("\n") + "\n";
  const signedHeaders = sortedHeaderKeys.join(";");

  // Sort query parameters
  const sortedQuery = query
    ? query
        .split("&")
        .sort()
        .join("&")
    : "";

  return [
    method,
    path,
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
}

/**
 * Build the string-to-sign for SigV4.
 * @param {string} datetime - ISO8601 basic format: YYYYMMDDTHHMMSSZ
 * @param {string} region
 * @param {string} service
 * @param {string} canonicalRequestHash - hex SHA-256 of canonical request
 * @returns {string}
 */
function createStringToSign(datetime, region, service, canonicalRequestHash) {
  const date = datetime.slice(0, 8);
  const scope = `${date}/${region}/${service}/aws4_request`;
  return ["AWS4-HMAC-SHA256", datetime, scope, canonicalRequestHash].join("\n");
}

/**
 * Derive the signing key and compute the signature.
 * Key derivation: HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date), region), service), "aws4_request")
 */
async function calculateSignature(secretKey, datetime, region, service, stringToSign) {
  const date = datetime.slice(0, 8);
  const kDate = await hmacSha256("AWS4" + secretKey, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = await hmacSha256(kSigning, stringToSign);
  return toHex(signature);
}

/**
 * Produce the full Authorization header value.
 */
function getAuthorizationHeader(accessKeyId, datetime, region, service, signedHeaders, signature) {
  const date = datetime.slice(0, 8);
  const credential = `${accessKeyId}/${date}/${region}/${service}/aws4_request`;
  return `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Sign and execute a request to an AWS service.
 * @param {Object} opts
 * @param {string} opts.method
 * @param {string} opts.url - Full URL
 * @param {string} opts.service - "dynamodb" or "s3"
 * @param {string} opts.region
 * @param {string} opts.accessKeyId
 * @param {string} opts.secretAccessKey
 * @param {Object} [opts.headers] - Additional headers (Content-Type, x-amz-target, etc.)
 * @param {string|ArrayBuffer|null} [opts.body]
 * @returns {Promise<Response>}
 */
async function signedFetch(opts) {
  const {
    method,
    url,
    service,
    region,
    accessKeyId,
    secretAccessKey,
    headers: extraHeaders = {},
    body = null,
  } = opts;

  const parsedUrl = new URL(url);
  const datetime = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // datetime is now like "20260215T120000Z"

  // Payload hash
  const payloadData = body
    ? typeof body === "string"
      ? body
      : body
    : "";
  const payloadHash = await sha256Hex(payloadData);

  // Build headers map
  const allHeaders = {
    host: parsedUrl.host,
    "x-amz-date": datetime,
    "x-amz-content-sha256": payloadHash,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  };

  // Canonical path: for S3 we don't encode slashes in path
  const encodeSlash = service !== "s3";
  const canonicalPath = uriEncode(decodeURIComponent(parsedUrl.pathname), encodeSlash) || "/";

  // Query string
  const queryString = parsedUrl.search ? parsedUrl.search.slice(1) : "";

  const canonicalRequest = createCanonicalRequest(
    method,
    canonicalPath,
    queryString,
    allHeaders,
    payloadHash,
  );

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = createStringToSign(datetime, region, service, canonicalRequestHash);
  const signature = await calculateSignature(secretAccessKey, datetime, region, service, stringToSign);

  const signedHeaderKeys = Object.keys(allHeaders).sort().join(";");
  const authorization = getAuthorizationHeader(
    accessKeyId,
    datetime,
    region,
    service,
    signedHeaderKeys,
    signature,
  );

  // Build the actual fetch headers
  const fetchHeaders = {};
  for (const [k, v] of Object.entries(allHeaders)) {
    if (k !== "host") {
      fetchHeaders[k] = v;
    }
  }
  fetchHeaders["Authorization"] = authorization;

  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: body || undefined,
  });
}

// ---------------------------------------------------------------------------
// AWS credential helpers
// ---------------------------------------------------------------------------

function awsConfig(env) {
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION || "us-east-1",
    table: env.DYNAMODB_TABLE || "spike-land-kv",
    bucket: env.S3_BUCKET || "spike-land-storage",
    endpointUrl: env.AWS_ENDPOINT_URL || null,
  };
}

// ---------------------------------------------------------------------------
// DynamoDB helpers (KV-style operations)
// ---------------------------------------------------------------------------

async function dynamoRequest(action, payload, cfg) {
  const url = cfg.endpointUrl || `https://dynamodb.${cfg.region}.amazonaws.com/`;
  const body = JSON.stringify(payload);

  const response = await signedFetch({
    method: "POST",
    url,
    service: "dynamodb",
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    headers: {
      "Content-Type": "application/x-amz-json-1.0",
      "X-Amz-Target": `DynamoDB_20120810.${action}`,
    },
    body,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`DynamoDB ${action} failed (${response.status}): ${errBody}`);
  }

  return response.json();
}

async function kvGet(key, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] KV GET: ${key}`);

  const result = await dynamoRequest("GetItem", {
    TableName: cfg.table,
    Key: {
      pk: { S: key },
    },
  }, cfg);

  if (!result.Item) {
    return null;
  }

  // Return the "value" attribute as a string
  return result.Item.value?.S ?? null;
}

async function kvPut(key, value, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] KV PUT: ${key}`);

  await dynamoRequest("PutItem", {
    TableName: cfg.table,
    Item: {
      pk: { S: key },
      value: { S: value },
      updatedAt: { N: String(Date.now()) },
    },
  }, cfg);
}

async function kvDelete(key, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] KV DELETE: ${key}`);

  await dynamoRequest("DeleteItem", {
    TableName: cfg.table,
    Key: {
      pk: { S: key },
    },
  }, cfg);
}

// ---------------------------------------------------------------------------
// S3 helpers (R2-style operations)
// ---------------------------------------------------------------------------

function s3Url(bucket, region, key, endpointUrl) {
  // Use path-style URL for compatibility
  const base = endpointUrl || `https://s3.${region}.amazonaws.com`;
  if (key) {
    return `${base}/${bucket}/${key}`;
  }
  return `${base}/${bucket}`;
}

async function r2Get(key, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] R2 GET: ${key}`);

  const url = s3Url(cfg.bucket, cfg.region, key, cfg.endpointUrl);
  const response = await signedFetch({
    method: "GET",
    url,
    service: "s3",
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
  });

  if (response.status === 404 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`S3 GetObject failed (${response.status}): ${errBody}`);
  }

  return response.body;
}

async function r2Put(key, body, contentType, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] R2 PUT: ${key}`);

  const url = s3Url(cfg.bucket, cfg.region, key, cfg.endpointUrl);
  const response = await signedFetch({
    method: "PUT",
    url,
    service: "s3",
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    headers: {
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`S3 PutObject failed (${response.status}): ${errBody}`);
  }
}

async function r2Delete(key, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] R2 DELETE: ${key}`);

  const url = s3Url(cfg.bucket, cfg.region, key, cfg.endpointUrl);
  const response = await signedFetch({
    method: "DELETE",
    url,
    service: "s3",
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
  });

  // S3 returns 204 on successful delete; 404 is also acceptable (idempotent)
  if (!response.ok && response.status !== 404) {
    const errBody = await response.text();
    throw new Error(`S3 DeleteObject failed (${response.status}): ${errBody}`);
  }
}

async function r2List(prefix, env) {
  const cfg = awsConfig(env);
  console.log(`[storage-proxy] R2 LIST: prefix=${prefix}`);

  let queryParams = "list-type=2";
  if (prefix) {
    queryParams += `&prefix=${encodeURIComponent(prefix)}`;
  }

  const url = `${s3Url(cfg.bucket, cfg.region, null, cfg.endpointUrl)}?${queryParams}`;
  const response = await signedFetch({
    method: "GET",
    url,
    service: "s3",
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`S3 ListObjectsV2 failed (${response.status}): ${errBody}`);
  }

  // Parse the XML response
  const xml = await response.text();
  return parseListObjectsResponse(xml);
}

/**
 * Simple XML parser for S3 ListObjectsV2 response.
 * Extracts Key, Size, LastModified, and IsTruncated.
 */
function parseListObjectsResponse(xml) {
  const objects = [];
  const truncated = /<IsTruncated>true<\/IsTruncated>/i.test(xml);

  // Extract each <Contents> block
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = extractXmlValue(block, "Key");
    const size = extractXmlValue(block, "Size");
    const lastModified = extractXmlValue(block, "LastModified");

    if (key) {
      objects.push({
        key,
        size: size ? parseInt(size, 10) : 0,
        lastModified: lastModified || null,
      });
    }
  }

  // Extract continuation token if present
  const nextToken = extractXmlValue(xml, "NextContinuationToken");

  return {
    objects,
    truncated,
    ...(nextToken ? { nextContinuationToken: nextToken } : {}),
  };
}

function extractXmlValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
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
