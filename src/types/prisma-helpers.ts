import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Type for Prisma transaction client used in $transaction callbacks.
 *
 * This type represents the transaction-scoped client that is passed to
 * the callback function in prisma.$transaction(async (tx) => {...}).
 *
 * The transaction client has the same model operations as PrismaClient
 * but is scoped to the transaction context.
 *
 * @example
 * ```typescript
 * import type { PrismaTransactionClient } from "@/types/prisma-helpers";
 *
 * await prisma.$transaction(async (tx: PrismaTransactionClient) => {
 *   await tx.user.update({ ... });
 *   await tx.referral.update({ ... });
 * });
 * ```
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  | "$connect"
  | "$disconnect"
  | "$on"
  | "$transaction"
  | "$use"
  | "$extends"
>;

/**
 * Alternative type using Prisma's internal TransactionClient type.
 * This is the exact type Prisma uses internally for transaction callbacks.
 *
 * Note: This type is available in Prisma 4.x+ and provides the most
 * accurate representation of the transaction client.
 */
export type PrismaInteractiveTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Type for Prisma batch transaction operations.
 * Used when passing an array of promises to $transaction.
 *
 * @example
 * ```typescript
 * const operations: PrismaBatchOperations = [
 *   prisma.user.create({ data: {...} }),
 *   prisma.post.create({ data: {...} }),
 * ];
 * await prisma.$transaction(operations);
 * ```
 */
export type PrismaBatchOperations = Prisma.PrismaPromise<unknown>[];
