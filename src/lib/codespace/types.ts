/**
 * Codespace session types — mirrors ICodeSession from @spike-npm-land/code
 * but without the browser-only dependencies.
 */

export interface CodespaceSessionData {
  codeSpace: string;
  code: string;
  transpiled: string;
  html: string;
  css: string;
}

export interface CodespaceVersionData {
  number: number;
  code: string;
  transpiled: string;
  html: string;
  css: string;
  hash: string;
  createdAt: Date;
}

export interface CodespaceVersionMeta {
  number: number;
  hash: string;
  createdAt: Date;
}

/** Returned by getSession / updateSession */
export interface CodespaceSessionWithHash extends CodespaceSessionData {
  hash: string;
  updatedAt: Date;
}

/** Thrown when optimistic locking detects a conflict */
export class OptimisticLockError extends Error {
  constructor(
    public readonly codeSpace: string,
    public readonly expectedHash: string,
    public readonly actualHash: string,
  ) {
    super(
      `Optimistic lock conflict on "${codeSpace}": expected ${expectedHash}, got ${actualHash}`,
    );
    this.name = "OptimisticLockError";
  }
}
