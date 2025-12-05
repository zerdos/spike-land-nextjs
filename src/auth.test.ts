import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing auth
const mockUpsert = vi.fn().mockResolvedValue({ id: "user_123" });
const mockFindUnique = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      upsert: mockUpsert,
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: vi.fn((config) => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
    _config: config, // Expose config for testing
  })),
  DefaultSession: {},
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(() => ({ id: "github" })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

// Mock referral modules
vi.mock("@/lib/referral/code-generator", () => ({
  assignReferralCodeToUser: vi.fn().mockResolvedValue("ABC12345"),
}));

vi.mock("@/lib/referral/tracker", () => ({
  linkReferralOnSignup: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/referral/fraud-detection", () => ({
  validateReferralAfterVerification: vi.fn().mockResolvedValue({
    success: true,
    shouldGrantRewards: false,
  }),
}));

vi.mock("@/lib/referral/rewards", () => ({
  completeReferralAndGrantRewards: vi.fn().mockResolvedValue({ success: true }),
}));

describe("NextAuth Full Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_ID = "test-github-id";
    process.env.GITHUB_SECRET = "test-github-secret";
    process.env.GOOGLE_ID = "test-google-id";
    process.env.GOOGLE_SECRET = "test-google-secret";
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  it("should export handlers object", async () => {
    const { handlers } = await import("./auth");
    expect(handlers).toBeDefined();
    expect(handlers).toHaveProperty("GET");
    expect(handlers).toHaveProperty("POST");
  });

  it("should export signIn function", async () => {
    const { signIn } = await import("./auth");
    expect(signIn).toBeDefined();
    expect(typeof signIn).toBe("function");
  });

  it("should export signOut function", async () => {
    const { signOut } = await import("./auth");
    expect(signOut).toBeDefined();
    expect(typeof signOut).toBe("function");
  });

  it("should export auth function", async () => {
    const { auth } = await import("./auth");
    expect(auth).toBeDefined();
    expect(typeof auth).toBe("function");
  });

  it("should re-export createStableUserId", async () => {
    const { createStableUserId } = await import("./auth");
    expect(createStableUserId).toBeDefined();
    expect(typeof createStableUserId).toBe("function");
  });

  it("should export handleSignIn function", async () => {
    const { handleSignIn } = await import("./auth");
    expect(handleSignIn).toBeDefined();
    expect(typeof handleSignIn).toBe("function");
  });
});

describe("handleSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ id: "user_123" });
    mockFindUnique.mockResolvedValue(null);
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  it("should upsert user with stable ID when email is provided", async () => {
    const { handleSignIn, createStableUserId } = await import("./auth");
    const user = {
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.jpg",
    };

    const result = await handleSignIn(user);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      update: {
        name: "Test User",
        image: "https://example.com/avatar.jpg",
      },
      create: {
        id: createStableUserId("test@example.com"),
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
      },
    });
  });

  it("should return true when user has no email", async () => {
    const { handleSignIn } = await import("./auth");
    const user = { name: "Test User", image: "https://example.com/avatar.jpg" };

    const result = await handleSignIn(user);

    expect(result).toBe(true);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("should return true when email is null", async () => {
    const { handleSignIn } = await import("./auth");
    const user = { email: null, name: "Test User" };

    const result = await handleSignIn(user);

    expect(result).toBe(true);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("should handle undefined name and image", async () => {
    const { handleSignIn, createStableUserId } = await import("./auth");
    const user = { email: "test@example.com" };

    const result = await handleSignIn(user);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      update: {
        name: undefined,
        image: undefined,
      },
      create: {
        id: createStableUserId("test@example.com"),
        email: "test@example.com",
        name: undefined,
        image: undefined,
      },
    });
  });

  it("should handle null name and image", async () => {
    const { handleSignIn, createStableUserId } = await import("./auth");
    const user = { email: "test@example.com", name: null, image: null };

    const result = await handleSignIn(user);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      update: {
        name: undefined,
        image: undefined,
      },
      create: {
        id: createStableUserId("test@example.com"),
        email: "test@example.com",
        name: null,
        image: null,
      },
    });
  });

  it("should return true and log error on database failure", async () => {
    const { handleSignIn } = await import("./auth");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbError = new Error("Database connection failed");
    mockUpsert.mockRejectedValueOnce(dbError);

    const user = { email: "test@example.com", name: "Test User" };
    const result = await handleSignIn(user);

    // Should still return true to allow sign-in
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to upsert user with stable ID:", dbError);

    consoleSpy.mockRestore();
  });

  it("should not block sign-in on any database error type", async () => {
    const { handleSignIn } = await import("./auth");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Test various error types
    const errorTypes = [
      new Error("Connection timeout"),
      new Error("Unique constraint violation"),
      new Error("Database unavailable"),
    ];

    for (const error of errorTypes) {
      mockUpsert.mockRejectedValueOnce(error);
      const result = await handleSignIn({ email: "test@example.com" });
      expect(result).toBe(true);
    }

    consoleSpy.mockRestore();
  });

  it("should assign referral code to new users", async () => {
    const { handleSignIn } = await import("./auth");
    const { assignReferralCodeToUser } = await import("@/lib/referral/code-generator");

    mockFindUnique.mockResolvedValueOnce(null); // No existing user
    const user = { email: "newuser@example.com", name: "New User" };

    await handleSignIn(user);

    expect(assignReferralCodeToUser).toHaveBeenCalledWith("user_123");
  });

  it("should link referral on new user signup", async () => {
    const { handleSignIn } = await import("./auth");
    const { linkReferralOnSignup } = await import("@/lib/referral/tracker");

    mockFindUnique.mockResolvedValueOnce(null); // No existing user
    const user = { email: "newuser@example.com" };

    await handleSignIn(user);

    expect(linkReferralOnSignup).toHaveBeenCalledWith("user_123");
  });

  it("should not process referrals for existing users", async () => {
    const { handleSignIn } = await import("./auth");
    const { assignReferralCodeToUser } = await import("@/lib/referral/code-generator");
    const { linkReferralOnSignup } = await import("@/lib/referral/tracker");

    mockFindUnique.mockResolvedValueOnce({ id: "user_123", email: "existing@example.com" });
    const user = { email: "existing@example.com" };

    await handleSignIn(user);

    expect(assignReferralCodeToUser).not.toHaveBeenCalled();
    expect(linkReferralOnSignup).not.toHaveBeenCalled();
  });

  it("should grant referral rewards for new users with valid referrals", async () => {
    const { handleSignIn } = await import("./auth");
    const { validateReferralAfterVerification } = await import("@/lib/referral/fraud-detection");
    const { completeReferralAndGrantRewards } = await import("@/lib/referral/rewards");

    vi.mocked(validateReferralAfterVerification).mockResolvedValueOnce({
      success: true,
      shouldGrantRewards: true,
      referralId: "ref-123",
    });

    mockFindUnique.mockResolvedValueOnce(null); // No existing user
    const user = { email: "newuser@example.com" };

    await handleSignIn(user);

    expect(completeReferralAndGrantRewards).toHaveBeenCalledWith("ref-123");
  });

  it("should not grant rewards if fraud checks fail", async () => {
    const { handleSignIn } = await import("./auth");
    const { validateReferralAfterVerification } = await import("@/lib/referral/fraud-detection");
    const { completeReferralAndGrantRewards } = await import("@/lib/referral/rewards");

    vi.mocked(validateReferralAfterVerification).mockResolvedValueOnce({
      success: true,
      shouldGrantRewards: false,
      error: "Disposable email detected",
    });

    mockFindUnique.mockResolvedValueOnce(null);
    const user = { email: "newuser@tempmail.com" };

    await handleSignIn(user);

    expect(completeReferralAndGrantRewards).not.toHaveBeenCalled();
  });

  it("should handle referral errors gracefully without blocking sign-in", async () => {
    const { handleSignIn } = await import("./auth");
    const { assignReferralCodeToUser } = await import("@/lib/referral/code-generator");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(assignReferralCodeToUser).mockRejectedValueOnce(new Error("Referral code error"));

    mockFindUnique.mockResolvedValueOnce(null);
    const user = { email: "newuser@example.com" };

    const result = await handleSignIn(user);

    expect(result).toBe(true); // Should still allow sign-in
    expect(consoleSpy).toHaveBeenCalledWith("Failed to assign referral code:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});
