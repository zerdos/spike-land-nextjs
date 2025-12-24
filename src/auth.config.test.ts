import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/providers/facebook", () => ({
  default: vi.fn(() => ({ id: "facebook" })),
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(() => ({ id: "github" })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

vi.mock("next-auth/providers/apple", () => ({
  default: vi.fn(() => ({ id: "apple" })),
}));

describe("authConfig", () => {
  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules();
    // Set up environment variables before each test
    process.env.AUTH_APPLE_ID = "test-apple-id";
    process.env.AUTH_APPLE_SECRET = "test-apple-secret";
    process.env.AUTH_FACEBOOK_ID = "test-facebook-id";
    process.env.AUTH_FACEBOOK_SECRET = "test-facebook-secret";
    process.env.GITHUB_ID = "test-github-id";
    process.env.GITHUB_SECRET = "test-github-secret";
    process.env.GOOGLE_ID = "test-google-id";
    process.env.GOOGLE_SECRET = "test-google-secret";
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  it("should have providers configured when env vars are set", async () => {
    const { authConfig } = await import("./auth.config");
    // With all OAuth credentials set, we should have 4 providers
    expect(authConfig.providers).toHaveLength(4);
  });

  it("should have session callback", async () => {
    const { authConfig } = await import("./auth.config");
    expect(authConfig.callbacks?.session).toBeDefined();
  });

  it("should have jwt callback", async () => {
    const { authConfig } = await import("./auth.config");
    expect(authConfig.callbacks?.jwt).toBeDefined();
  });

  it("should configure custom pages", async () => {
    const { authConfig } = await import("./auth.config");
    expect(authConfig.pages?.signIn).toBe("/auth/signin");
    expect(authConfig.pages?.error).toBe("/auth/error");
  });

  it("should use JWT session strategy", async () => {
    const { authConfig } = await import("./auth.config");
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  describe("session callback", () => {
    it("should add user id from token.sub", async () => {
      const { authConfig } = await import("./auth.config");
      const session = { user: { name: "Test User" } } as {
        user: { name: string; id?: string; };
      };
      const token = { sub: "user_abc123" };

      const result = await authConfig.callbacks?.session?.(
        { session, token } as Parameters<
          NonNullable<typeof authConfig.callbacks.session>
        >[0],
      );

      expect(result?.user?.id).toBe("user_abc123");
    });

    it("should handle missing token.sub", async () => {
      const { authConfig } = await import("./auth.config");
      const session = { user: { name: "Test User" } } as {
        user: { name: string; id?: string; };
      };
      const token = {};

      const result = await authConfig.callbacks?.session?.(
        { session, token } as Parameters<
          NonNullable<typeof authConfig.callbacks.session>
        >[0],
      );

      expect(result?.user).not.toHaveProperty("id");
    });
  });

  describe("jwt callback", () => {
    it("should use stable ID for users with email", async () => {
      const { authConfig } = await import("./auth.config");
      const token = {} as { sub?: string; };
      const user = { id: "some-id", email: "test@example.com" };

      const result = await authConfig.callbacks?.jwt?.(
        { token, user } as Parameters<
          NonNullable<typeof authConfig.callbacks.jwt>
        >[0],
      );

      expect(result?.sub).toMatch(/^user_[a-f0-9]{32}$/);
    });

    it("should use provider prefix for users without email", async () => {
      const { authConfig } = await import("./auth.config");
      const token = {} as { sub?: string; };
      const user = { id: "provider-id-123" };

      const result = await authConfig.callbacks?.jwt?.(
        { token, user } as Parameters<
          NonNullable<typeof authConfig.callbacks.jwt>
        >[0],
      );

      expect(result?.sub).toBe("provider_provider-id-123");
    });

    it("should preserve existing token.sub when no user", async () => {
      const { authConfig } = await import("./auth.config");
      const token = { sub: "existing-id" };

      const result = await authConfig.callbacks?.jwt?.(
        { token } as Parameters<
          NonNullable<typeof authConfig.callbacks.jwt>
        >[0],
      );

      expect(result?.sub).toBe("existing-id");
    });
  });
});

describe("createStableUserId", () => {
  const originalUserIdSalt = process.env.USER_ID_SALT;
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    vi.resetModules();
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

  it("should generate a stable ID from email", async () => {
    const { createStableUserId } = await import("./auth.config");
    const email = "test@example.com";
    const id = createStableUserId(email);

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.startsWith("user_")).toBe(true);
  });

  it("should throw error when no salt is set", async () => {
    delete process.env.USER_ID_SALT;
    delete process.env.AUTH_SECRET;
    const { createStableUserId } = await import("./auth.config");

    expect(() => createStableUserId("test@example.com")).toThrow(
      "USER_ID_SALT or AUTH_SECRET environment variable must be set",
    );
  });

  it("should prefer USER_ID_SALT over AUTH_SECRET", async () => {
    const email = "test@example.com";

    // Set both env vars
    process.env.AUTH_SECRET = "auth-secret-value";
    process.env.USER_ID_SALT = "user-id-salt-value";

    const { createStableUserId: createWithSalt } = await import("./auth.config");
    const idWithUserIdSalt = createWithSalt(email);

    // Reset modules, remove USER_ID_SALT, keeping AUTH_SECRET
    vi.resetModules();
    delete process.env.USER_ID_SALT;
    process.env.AUTH_SECRET = "auth-secret-value";

    const { createStableUserId: createWithAuth } = await import("./auth.config");
    const idWithAuthSecret = createWithAuth(email);

    // IDs should be different because different salts are used
    expect(idWithUserIdSalt).not.toBe(idWithAuthSecret);
  });

  it("should fall back to AUTH_SECRET when USER_ID_SALT is not set", async () => {
    const email = "test@example.com";

    delete process.env.USER_ID_SALT;
    process.env.AUTH_SECRET = "test-auth-secret";

    const { createStableUserId } = await import("./auth.config");
    const id = createStableUserId(email);

    expect(id).toBeDefined();
    expect(id.startsWith("user_")).toBe(true);
  });

  it("should use salt to prevent ID prediction", async () => {
    const email = "test@example.com";

    // ID with current salt
    process.env.AUTH_SECRET = "test-auth-secret";
    const { createStableUserId: create1 } = await import("./auth.config");
    const idWithSalt = create1(email);

    // Change the salt and reimport
    vi.resetModules();
    process.env.AUTH_SECRET = "different-secret";
    const { createStableUserId: create2 } = await import("./auth.config");
    const idWithDifferentSalt = create2(email);

    // Different salts should produce different IDs
    expect(idWithSalt).not.toBe(idWithDifferentSalt);
  });

  it("should generate the same ID for the same email", async () => {
    const { createStableUserId } = await import("./auth.config");
    const email = "test@example.com";
    const id1 = createStableUserId(email);
    const id2 = createStableUserId(email);

    expect(id1).toBe(id2);
  });

  it("should be case-insensitive", async () => {
    const { createStableUserId } = await import("./auth.config");
    const lowerCase = createStableUserId("test@example.com");
    const upperCase = createStableUserId("TEST@EXAMPLE.COM");
    const mixedCase = createStableUserId("TeSt@ExAmPlE.cOm");

    expect(lowerCase).toBe(upperCase);
    expect(lowerCase).toBe(mixedCase);
  });

  it("should trim whitespace", async () => {
    const { createStableUserId } = await import("./auth.config");
    const normal = createStableUserId("test@example.com");
    const leadingSpace = createStableUserId("  test@example.com");
    const trailingSpace = createStableUserId("test@example.com  ");
    const bothSpaces = createStableUserId("  test@example.com  ");

    expect(normal).toBe(leadingSpace);
    expect(normal).toBe(trailingSpace);
    expect(normal).toBe(bothSpaces);
  });

  it("should generate different IDs for different emails", async () => {
    const { createStableUserId } = await import("./auth.config");
    const id1 = createStableUserId("user1@example.com");
    const id2 = createStableUserId("user2@example.com");

    expect(id1).not.toBe(id2);
  });

  it("should generate ID with correct format (user_ prefix + 32 hex chars)", async () => {
    const { createStableUserId } = await import("./auth.config");
    const id = createStableUserId("test@example.com");

    // Format: user_ + 32 hex characters = 37 characters total
    expect(id.length).toBe(37);
    expect(id).toMatch(/^user_[a-f0-9]{32}$/);
  });

  it("should handle special characters in email", async () => {
    const { createStableUserId } = await import("./auth.config");
    const id1 = createStableUserId("user+tag@example.com");
    const id2 = createStableUserId("user.name@example.com");

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
