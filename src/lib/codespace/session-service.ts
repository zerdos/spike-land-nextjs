/**
 * Codespace Session Service
 *
 * Replaces Cloudflare Durable Object state operations (chatRoom.ts)
 * with PostgreSQL (Neon) + Redis (Upstash) caching.
 */

import { createHash } from "crypto";

import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";

import {
  DEFAULT_CODE,
  DEFAULT_CSS,
  DEFAULT_HTML,
  DEFAULT_TRANSPILED,
} from "./default-template";
import type {
  CodespaceSessionData,
  CodespaceSessionWithHash,
  CodespaceVersionData,
  CodespaceVersionMeta,
} from "./types";
import { OptimisticLockError } from "./types";

// ---------------------------------------------------------------------------
// Hash computation
// ---------------------------------------------------------------------------

/** Server-side session hash using MD5. Matches the structure of the client hash. */
export function computeSessionHash(session: CodespaceSessionData): string {
  const md5 = (s: string) =>
    createHash("md5").update(s || "empty").digest("hex").slice(0, 8);

  const hashObj = {
    codeSpace: session.codeSpace,
    code: md5(session.code),
    html: md5(session.html),
    css: md5(session.css),
    transpiled: md5(session.transpiled),
  };
  return md5(JSON.stringify(hashObj));
}

// ---------------------------------------------------------------------------
// Redis cache helpers
// ---------------------------------------------------------------------------

const CACHE_TTL = 30; // seconds

function cacheKey(codeSpace: string): string {
  return `session:${codeSpace}`;
}

async function getCached(
  codeSpace: string,
): Promise<CodespaceSessionWithHash | null> {
  const raw = await redis.get<string>(cacheKey(codeSpace));
  if (!raw) return null;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    ...parsed,
    updatedAt: new Date(parsed.updatedAt),
  } as CodespaceSessionWithHash;
}

async function setCache(
  codeSpace: string,
  session: CodespaceSessionWithHash,
): Promise<void> {
  await redis
    .set(cacheKey(codeSpace), JSON.stringify(session), { ex: CACHE_TTL })
    .catch((err: unknown) => {
      console.warn("[CodespaceService] Redis cache set failed:", err);
    });
}

async function invalidateCache(codeSpace: string): Promise<void> {
  await redis.del(cacheKey(codeSpace)).catch((err: unknown) => {
    console.warn("[CodespaceService] Redis cache invalidate failed:", err);
  });
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

/**
 * Read session from PostgreSQL, with Redis cache layer.
 * Returns null if the session doesn't exist.
 */
export async function getSession(
  codeSpace: string,
): Promise<CodespaceSessionWithHash | null> {
  // Try cache first
  const cached = await getCached(codeSpace);
  if (cached) return cached;

  // Fall back to DB
  const row = await prisma.codespaceSession.findUnique({
    where: { codeSpace },
  });
  if (!row) return null;

  const session: CodespaceSessionWithHash = {
    codeSpace: row.codeSpace,
    code: row.code,
    transpiled: row.transpiled,
    html: row.html,
    css: row.css,
    hash: row.hash,
    updatedAt: row.updatedAt,
  };

  // Populate cache
  await setCache(codeSpace, session);
  return session;
}

/**
 * Get session or create a default one if it doesn't exist.
 */
export async function getOrCreateSession(
  codeSpace: string,
): Promise<CodespaceSessionWithHash> {
  const existing = await getSession(codeSpace);
  if (existing) return existing;
  return initializeSession(codeSpace);
}

/**
 * Optimistic lock update — only succeeds if `expectedHash` matches current.
 * Throws OptimisticLockError on conflict.
 */
export async function updateSession(
  codeSpace: string,
  data: CodespaceSessionData,
  expectedHash: string,
): Promise<CodespaceSessionWithHash> {
  const newHash = computeSessionHash(data);

  // Attempt optimistic lock update via raw SQL for atomicity
  const result = await prisma.$executeRaw`
    UPDATE "codespace_sessions"
    SET "code" = ${data.code},
        "transpiled" = ${data.transpiled},
        "html" = ${data.html},
        "css" = ${data.css},
        "hash" = ${newHash},
        "updatedAt" = NOW()
    WHERE "codeSpace" = ${codeSpace}
      AND "hash" = ${expectedHash}
  `;

  if (result === 0) {
    // Either the row doesn't exist or the hash didn't match
    const current = await prisma.codespaceSession.findUnique({
      where: { codeSpace },
      select: { hash: true },
    });

    if (!current) {
      // Row doesn't exist — initialize and retry
      await initializeSession(codeSpace);
      return updateSession(codeSpace, data, computeSessionHash({
        codeSpace,
        code: DEFAULT_CODE,
        transpiled: DEFAULT_TRANSPILED,
        html: DEFAULT_HTML,
        css: DEFAULT_CSS,
      }));
    }

    throw new OptimisticLockError(codeSpace, expectedHash, current.hash);
  }

  // Invalidate cache and return the updated session
  await invalidateCache(codeSpace);

  const session: CodespaceSessionWithHash = {
    codeSpace: data.codeSpace,
    code: data.code,
    transpiled: data.transpiled,
    html: data.html,
    css: data.css,
    hash: newHash,
    updatedAt: new Date(),
  };

  await setCache(codeSpace, session);
  return session;
}

/**
 * Force-update session (no optimistic locking). Used for initial writes or admin.
 */
export async function upsertSession(
  data: CodespaceSessionData,
): Promise<CodespaceSessionWithHash> {
  const hash = computeSessionHash(data);

  const row = await prisma.codespaceSession.upsert({
    where: { codeSpace: data.codeSpace },
    update: {
      code: data.code,
      transpiled: data.transpiled,
      html: data.html,
      css: data.css,
      hash,
    },
    create: {
      codeSpace: data.codeSpace,
      code: data.code,
      transpiled: data.transpiled,
      html: data.html,
      css: data.css,
      hash,
    },
  });

  await invalidateCache(data.codeSpace);

  const session: CodespaceSessionWithHash = {
    codeSpace: row.codeSpace,
    code: row.code,
    transpiled: row.transpiled,
    html: row.html,
    css: row.css,
    hash: row.hash,
    updatedAt: row.updatedAt,
  };

  await setCache(data.codeSpace, session);
  return session;
}

/**
 * Create default session if it doesn't already exist.
 */
export async function initializeSession(
  codeSpace: string,
): Promise<CodespaceSessionWithHash> {
  const data: CodespaceSessionData = {
    codeSpace,
    code: DEFAULT_CODE,
    transpiled: DEFAULT_TRANSPILED,
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
  };

  return upsertSession(data);
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

/**
 * Save a new immutable version snapshot of the current session state.
 */
export async function saveVersion(
  codeSpace: string,
): Promise<CodespaceVersionData> {
  const session = await prisma.codespaceSession.findUnique({
    where: { codeSpace },
  });
  if (!session) {
    throw new Error(`No session found for codeSpace "${codeSpace}"`);
  }

  // Get the next version number
  const lastVersion = await prisma.codespaceVersion.findFirst({
    where: { sessionId: session.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (lastVersion?.number ?? 0) + 1;

  const hash = computeSessionHash({
    codeSpace,
    code: session.code,
    transpiled: session.transpiled,
    html: session.html,
    css: session.css,
  });

  const version = await prisma.codespaceVersion.create({
    data: {
      sessionId: session.id,
      number: nextNumber,
      code: session.code,
      transpiled: session.transpiled,
      html: session.html,
      css: session.css,
      hash,
    },
  });

  console.log(
    `[CodespaceService] Saved version ${nextNumber} for "${codeSpace}"`,
  );

  return {
    number: version.number,
    code: version.code,
    transpiled: version.transpiled,
    html: version.html,
    css: version.css,
    hash: version.hash,
    createdAt: version.createdAt,
  };
}

/**
 * Get a specific version by number.
 */
export async function getVersion(
  codeSpace: string,
  versionNumber: number,
): Promise<CodespaceVersionData | null> {
  const session = await prisma.codespaceSession.findUnique({
    where: { codeSpace },
    select: { id: true },
  });
  if (!session) return null;

  const version = await prisma.codespaceVersion.findUnique({
    where: {
      sessionId_number: {
        sessionId: session.id,
        number: versionNumber,
      },
    },
  });
  if (!version) return null;

  return {
    number: version.number,
    code: version.code,
    transpiled: version.transpiled,
    html: version.html,
    css: version.css,
    hash: version.hash,
    createdAt: version.createdAt,
  };
}

/**
 * List all versions (lightweight metadata only).
 */
export async function getVersionsList(
  codeSpace: string,
): Promise<CodespaceVersionMeta[]> {
  const session = await prisma.codespaceSession.findUnique({
    where: { codeSpace },
    select: { id: true },
  });
  if (!session) return [];

  const versions = await prisma.codespaceVersion.findMany({
    where: { sessionId: session.id },
    orderBy: { number: "desc" },
    select: {
      number: true,
      hash: true,
      createdAt: true,
    },
  });

  return versions;
}

/**
 * Link a codespace session to an existing App record.
 */
export async function linkSessionToApp(
  codeSpace: string,
  appId: string,
): Promise<void> {
  await prisma.codespaceSession.update({
    where: { codeSpace },
    data: { appId },
  });
}
