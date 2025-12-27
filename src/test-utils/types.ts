/**
 * Type Utilities for Test Mocks
 *
 * Provides utility types for creating type-safe mock objects in tests.
 * These utilities help eliminate `as any` type assertions while maintaining
 * flexibility for partial mock data.
 */

/**
 * Deep partial type that recursively makes all properties optional.
 * Useful for creating mock objects where only certain fields are specified.
 *
 * @example
 * type User = { id: string; profile: { name: string; age: number } };
 * type MockUser = DeepPartial<User>;
 * // MockUser = { id?: string; profile?: { name?: string; age?: number } }
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; }
  : T;

/**
 * Creates a type that requires at least the specified keys from T.
 * Other keys remain optional.
 *
 * @example
 * type User = { id: string; name: string; email: string };
 * type MockUser = RequireKeys<User, 'id'>;
 * // MockUser = { id: string; name?: string; email?: string }
 */
export type RequireKeys<T, K extends keyof T> =
  & Omit<Partial<T>, K>
  & Pick<T, K>;

/**
 * Makes specified keys optional while keeping others required.
 *
 * @example
 * type User = { id: string; name: string; createdAt: Date };
 * type NewUser = OptionalKeys<User, 'id' | 'createdAt'>;
 * // NewUser = { id?: string; name: string; createdAt?: Date }
 */
export type OptionalKeys<T, K extends keyof T> =
  & Omit<T, K>
  & Partial<Pick<T, K>>;

/**
 * Utility type for mocking Prisma model responses.
 * Prisma models often include relations that are optionally loaded.
 *
 * @example
 * type UserWithPosts = MockPrismaModel<User, 'posts', Post[]>;
 */
export type MockPrismaModel<
  TModel,
  TRelation extends string,
  TRelationType,
> = TModel & { [K in TRelation]?: TRelationType; };

/**
 * Type for NextAuth session mock with custom user properties.
 */
export interface MockSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
}

/**
 * Full mock session type matching NextAuth Session structure.
 */
export interface MockSession {
  user: MockSessionUser;
  expires: string;
}

/**
 * Type for API response mocks.
 */
export interface MockApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Type guard to check if a value is a non-null object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
