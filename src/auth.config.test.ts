import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authConfig, createStableUserId } from "./auth.config";

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(() => ({ id: "github" })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

describe("authConfig", () => {
  beforeEach(() => {
    process.env.GITHUB_ID = "test-github-id";
    process.env.GITHUB_SECRET = "test-github-secret";
    process.env.GOOGLE_ID = "test-google-id";
    process.env.GOOGLE_SECRET = "test-google-secret";
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  it("should have providers configured", () => {
    expect(authConfig.providers).toHaveLength(2);
  });

  it("should have session callback", () => {
    expect(authConfig.callbacks?.session).toBeDefined();
  });

  it("should have jwt callback", () => {
    expect(authConfig.callbacks?.jwt).toBeDefined();
  });

  it("should configure custom pages", () => {
    expect(authConfig.pages?.signIn).toBe("/auth/signin");
    expect(authConfig.pages?.error).toBe("/auth/error");
  });

  it("should use JWT session strategy", () => {
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  describe("session callback", () => {
    it("should add user id from token.sub", () => {
      const session = { user: { name: "Test User" } } as { user: { name: string; id?: string; }; };
      const token = { sub: "user_abc123" };

      const result = authConfig.callbacks?.session?.(
        { session, token } as Parameters<NonNullable<typeof authConfig.callbacks.session>>[0],
      );

      expect(result?.user?.id).toBe("user_abc123");
    });

    it("should handle missing token.sub", () => {
      const session = { user: { name: "Test User" } } as { user: { name: string; id?: string; }; };
      const token = {};

      const result = authConfig.callbacks?.session?.(
        { session, token } as Parameters<NonNullable<typeof authConfig.callbacks.session>>[0],
      );

      expect(result?.user).not.toHaveProperty("id");
    });
  });

  describe("jwt callback", () => {
    it("should use stable ID for users with email", () => {
      const token = {} as { sub?: string; };
      const user = { id: "some-id", email: "test@example.com" };

      const result = authConfig.callbacks?.jwt?.(
        { token, user } as Parameters<NonNullable<typeof authConfig.callbacks.jwt>>[0],
      );

      expect(result?.sub).toMatch(/^user_[a-f0-9]{32}$/);
    });

    it("should use provider prefix for users without email", () => {
      const token = {} as { sub?: string; };
      const user = { id: "provider-id-123" };

      const result = authConfig.callbacks?.jwt?.(
        { token, user } as Parameters<NonNullable<typeof authConfig.callbacks.jwt>>[0],
      );

      expect(result?.sub).toBe("provider_provider-id-123");
    });

    it("should preserve existing token.sub when no user", () => {
      const token = { sub: "existing-id" };

      const result = authConfig.callbacks?.jwt?.(
        { token } as Parameters<NonNullable<typeof authConfig.callbacks.jwt>>[0],
      );

      expect(result?.sub).toBe("existing-id");
    });
  });
});

describe("createStableUserId", () => {
  const originalUserIdSalt = process.env.USER_ID_SALT;
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.USER_ID_SALT;
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  afterEach(() => {
    // Restore original environment variables
    if (originalUserIdSalt) {
      process.env.USER_ID_SALT = originalUserIdSalt;
    } else {
      delete process.env.USER_ID_SALT;
    }
    if (originalAuthSecret) {
      process.env.AUTH_SECRET = originalAuthSecret;
    } else {
      delete process.env.AUTH_SECRET;
    }
  });

  it("should generate a stable ID from email", () => {
    const email = "test@example.com";
    const id = createStableUserId(email);

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.startsWith("user_")).toBe(true);
  });

  it("should throw error when no salt is set", () => {
    delete process.env.USER_ID_SALT;
    delete process.env.AUTH_SECRET;

    expect(() => createStableUserId("test@example.com")).toThrow(
      "USER_ID_SALT or AUTH_SECRET environment variable must be set",
    );
  });

  it("should prefer USER_ID_SALT over AUTH_SECRET", () => {
    const email = "test@example.com";

    // Set both env vars
    process.env.AUTH_SECRET = "auth-secret-value";
    process.env.USER_ID_SALT = "user-id-salt-value";

    const idWithUserIdSalt = createStableUserId(email);

    // Remove USER_ID_SALT, keeping AUTH_SECRET
    delete process.env.USER_ID_SALT;

    const idWithAuthSecret = createStableUserId(email);

    // IDs should be different because different salts are used
    expect(idWithUserIdSalt).not.toBe(idWithAuthSecret);
  });

  it("should fall back to AUTH_SECRET when USER_ID_SALT is not set", () => {
    const email = "test@example.com";

    delete process.env.USER_ID_SALT;
    process.env.AUTH_SECRET = "test-auth-secret";

    const id = createStableUserId(email);

    expect(id).toBeDefined();
    expect(id.startsWith("user_")).toBe(true);
  });

  it("should use salt to prevent ID prediction", () => {
    const email = "test@example.com";

    // ID with current salt
    const idWithSalt = createStableUserId(email);

    // Change the salt
    process.env.AUTH_SECRET = "different-secret";
    const idWithDifferentSalt = createStableUserId(email);

    // Different salts should produce different IDs
    expect(idWithSalt).not.toBe(idWithDifferentSalt);
  });

  it("should generate the same ID for the same email", () => {
    const email = "test@example.com";
    const id1 = createStableUserId(email);
    const id2 = createStableUserId(email);

    expect(id1).toBe(id2);
  });

  it("should be case-insensitive", () => {
    const lowerCase = createStableUserId("test@example.com");
    const upperCase = createStableUserId("TEST@EXAMPLE.COM");
    const mixedCase = createStableUserId("TeSt@ExAmPlE.cOm");

    expect(lowerCase).toBe(upperCase);
    expect(lowerCase).toBe(mixedCase);
  });

  it("should trim whitespace", () => {
    const normal = createStableUserId("test@example.com");
    const leadingSpace = createStableUserId("  test@example.com");
    const trailingSpace = createStableUserId("test@example.com  ");
    const bothSpaces = createStableUserId("  test@example.com  ");

    expect(normal).toBe(leadingSpace);
    expect(normal).toBe(trailingSpace);
    expect(normal).toBe(bothSpaces);
  });

  it("should generate different IDs for different emails", () => {
    const id1 = createStableUserId("user1@example.com");
    const id2 = createStableUserId("user2@example.com");

    expect(id1).not.toBe(id2);
  });

  it("should generate ID with correct format (user_ prefix + 32 hex chars)", () => {
    const id = createStableUserId("test@example.com");

    // Format: user_ + 32 hex characters = 37 characters total
    expect(id.length).toBe(37);
    expect(id).toMatch(/^user_[a-f0-9]{32}$/);
  });

  it("should handle special characters in email", () => {
    const id1 = createStableUserId("user+tag@example.com");
    const id2 = createStableUserId("user.name@example.com");

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
