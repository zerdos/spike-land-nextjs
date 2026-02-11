import prisma from "@/lib/prisma";

import { publishSSEEvent, redis } from "@/lib/upstash";
import { DEFAULT_TEMPLATE } from "./default-template";
import { computeSessionHash } from "./hash-utils";
import type { CodeVersion, ICodeSession, Message } from "./types";

const SESSION_CACHE_TTL = 30; // 30 seconds

export class SessionService {
  private static getCacheKey(codeSpace: string) {
    return `codespace:session:${codeSpace}`;
  }

  /**
   * Get a session by codeSpace name.
   * Checks Redis cache first, then PostgreSQL.
   */
  static async getSession(codeSpace: string): Promise<ICodeSession | null> {
    const cacheKey = this.getCacheKey(codeSpace);

    // Try cache first
    try {
      const cached = await redis.get<ICodeSession>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (e) {
      console.error(`[SessionService] Redis error for ${codeSpace}:`, e);
    }

    // Fallback to PostgreSQL
    const dbSession = await prisma.codespaceSession.findUnique({
      where: { codeSpace },
    });

    if (!dbSession) {
      return null;
    }

    const session: ICodeSession = {
      code: dbSession.code,
      codeSpace: dbSession.codeSpace,
      transpiled: dbSession.transpiled,
      html: dbSession.html,
      css: dbSession.css,
      requiresReRender: dbSession.requiresReRender,
      messages: (dbSession.messages as unknown as Message[]) || [],
      hash: dbSession.hash,
    };

    // Cache the session
    try {
      await redis.set(cacheKey, session, { ex: SESSION_CACHE_TTL });
    } catch (e) {
      console.error(`[SessionService] Failed to cache session for ${codeSpace}:`, e);
    }

    return session;
  }

  /**
   * Initialize a new session with the default template.
   */
  static async initializeSession(codeSpace: string): Promise<ICodeSession> {
    const session: ICodeSession = {
      ...DEFAULT_TEMPLATE,
      codeSpace,
    };

    const hash = computeSessionHash(session);

    await prisma.codespaceSession.upsert({
      where: { codeSpace },
      update: {
        code: session.code,
        transpiled: session.transpiled,
        html: session.html,
        css: session.css,
        hash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: session.messages as any,
        requiresReRender: session.requiresReRender,
      },
      create: {
        codeSpace,
        code: session.code,
        transpiled: session.transpiled,
        html: session.html,
        css: session.css,
        hash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: session.messages as any,
        requiresReRender: session.requiresReRender,
      },
    });

    // Invalidate cache
    await redis.del(this.getCacheKey(codeSpace));

    return { ...session, hash };
  }

  /**
   * Get or create a session.
   */
  static async getOrCreateSession(codeSpace: string): Promise<ICodeSession> {
    const session = await this.getSession(codeSpace);
    if (session) {
      return session;
    }
    return this.initializeSession(codeSpace);
  }

  /**
   * Upsert a session with provided data.
   */
  static async upsertSession(session: ICodeSession): Promise<ICodeSession> {
    const { codeSpace } = session;
    const hash = computeSessionHash(session);

    await prisma.codespaceSession.upsert({
      where: { codeSpace },
      update: {
        code: session.code,
        transpiled: session.transpiled,
        html: session.html,
        css: session.css,
        hash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: session.messages as any,
        requiresReRender: session.requiresReRender,
      },
      create: {
        codeSpace,
        code: session.code,
        transpiled: session.transpiled,
        html: session.html,
        css: session.css,
        hash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: session.messages as any,
        requiresReRender: session.requiresReRender,
      },
    });

    // Invalidate cache
    await redis.del(this.getCacheKey(codeSpace));

    return session;
  }

  /**
   * Update an existing session.
   * Performs an optimistic lock using the expected hash.
   */
  static async updateSession(
    codeSpace: string,
    newSession: ICodeSession,
    expectedHash: string,
  ): Promise<{ success: boolean; session?: ICodeSession; error?: string }> {
    const newHash = computeSessionHash(newSession);

    // Update with optimistic locking
    const updateResult = await prisma.codespaceSession.updateMany({
      where: {
        codeSpace,
        hash: expectedHash,
      },
      data: {
        code: newSession.code,
        transpiled: newSession.transpiled,
        html: newSession.html,
        css: newSession.css,
        hash: newHash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: newSession.messages as any,
        requiresReRender: newSession.requiresReRender ?? false,
      },
    });

    if (updateResult.count === 0) {
      // Optimistic lock failure: either codespace doesn't exist or hash mismatched
      const current = await prisma.codespaceSession.findUnique({
        where: { codeSpace },
      });

      if (!current) {
        return { success: false, error: "Codespace not found" };
      }

      return {
        success: false,
        error: "Conflict: Hash mismatch",
        session: {
          code: current.code,
          codeSpace: current.codeSpace,
          transpiled: current.transpiled,
          html: current.html,
          css: current.css,
          requiresReRender: current.requiresReRender,
          messages: (current.messages as Message[]) || [],
          hash: current.hash,
        },
      };
    }

    // Invalidate cache
    await redis.del(this.getCacheKey(codeSpace));

    // Broadcast the update for real-time sync
    // If this codespace is linked to an app, we use that for broadcasting
    // Fetch once to check for appId if not already present (optimization: check newSession first)
    const appId = newSession.appId || (await prisma.codespaceSession.findUnique({
      where: { codeSpace },
      select: { appId: true }
    }))?.appId;

    const broadcastId = appId || `codespace:${codeSpace}`;

    publishSSEEvent(broadcastId, {
      type: "code_updated",
      data: {
        reloadRequired: true,
        codeSpace,
        appId
      },
      timestamp: Date.now(),
    }).catch(err => {
      console.error(`[SessionService] Failed to broadcast update for ${codeSpace}:`, err);
    });

    return { success: true, session: { ...newSession, hash: newHash } };
  }

  /**
   * Create an immutable snapshot of the current session state.
   */
  static async saveVersion(codeSpace: string): Promise<CodeVersion | null> {
    const session = await prisma.codespaceSession.findUnique({
      where: { codeSpace },
    });

    if (!session) return null;

    // Get current version number
    const maxVersion = await prisma.codespaceVersion.findFirst({
      where: { sessionId: session.id },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = (maxVersion?.number || 0) + 1;

    const version = await prisma.codespaceVersion.create({
      data: {
        sessionId: session.id,
        number: nextNumber,
        code: session.code,
        transpiled: session.transpiled,
        html: session.html,
        css: session.css,
        hash: session.hash,
      },
    });

    return {
      number: version.number,
      code: version.code,
      transpiled: version.transpiled,
      html: version.html,
      css: version.css,
      hash: version.hash,
      createdAt: version.createdAt.getTime(),
    };
  }

  /**
   * Get a specific version of a codespace.
   */
  static async getVersion(codeSpace: string, number: number): Promise<CodeVersion | null> {
    const version = await prisma.codespaceVersion.findFirst({
      where: {
        session: { codeSpace },
        number,
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
      createdAt: version.createdAt.getTime(),
    };
  }

  /**
   * List all versions for a codespace.
   */
  static async getVersionsList(codeSpace: string): Promise<Array<{ number: number; hash: string; createdAt: number }>> {
    const versions = await prisma.codespaceVersion.findMany({
      where: {
        session: { codeSpace },
      },
      orderBy: { number: 'desc' },
      select: {
        number: true,
        hash: true,
        createdAt: true,
      },
    });

    return versions.map(v => ({
      number: v.number,
      hash: v.hash,
      createdAt: v.createdAt.getTime(),
    }));
  }
}

export const getSession = SessionService.getSession.bind(SessionService);
export const initializeSession = SessionService.initializeSession.bind(
  SessionService,
);
export const getOrCreateSession = SessionService.getOrCreateSession.bind(
  SessionService,
);
export const updateSession = SessionService.updateSession.bind(SessionService);
export const upsertSession = SessionService.upsertSession.bind(SessionService);
export const saveVersion = SessionService.saveVersion.bind(SessionService);
export const getVersion = SessionService.getVersion.bind(SessionService);
export const getVersionsList = SessionService.getVersionsList.bind(
  SessionService,
);
