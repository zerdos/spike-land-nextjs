/**
 * Token Encryption Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptToken,
  encryptToken,
  isEncrypted,
  safeDecryptToken,
  safeEncryptToken,
} from "./token-encryption";

// Valid 32-byte (64 hex chars) test key
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("token-encryption", () => {
  beforeEach(() => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("encryptToken", () => {
    it("encrypts a token successfully", () => {
      const token = "test-access-token-12345";
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(token);
      expect(encrypted.split(":")).toHaveLength(3);
    });

    it("produces different output for same input (random IV)", () => {
      const token = "test-token";
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("throws error for empty token", () => {
      expect(() => encryptToken("")).toThrow("Cannot encrypt empty token");
    });

    it("throws error when encryption key is not configured", () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");

      expect(() => encryptToken("test")).toThrow(
        "TOKEN_ENCRYPTION_KEY environment variable is not configured",
      );
    });

    it("throws error when encryption key is wrong length", () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "tooshort");

      expect(() => encryptToken("test")).toThrow(
        "TOKEN_ENCRYPTION_KEY must be a 64-character hex string",
      );
    });

    it("handles unicode characters", () => {
      const token = "token-with-unicode-\u{1F600}-emoji";
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it("handles very long tokens", () => {
      const token = "a".repeat(10000);
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });
  });

  describe("decryptToken", () => {
    it("decrypts an encrypted token successfully", () => {
      const original = "my-secret-token-xyz";
      const encrypted = encryptToken(original);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(original);
    });

    it("throws error for empty data", () => {
      expect(() => decryptToken("")).toThrow("Cannot decrypt empty data");
    });

    it("throws error for invalid format (missing parts)", () => {
      expect(() => decryptToken("invalid")).toThrow(
        "Invalid encrypted data format",
      );
      expect(() => decryptToken("part1:part2")).toThrow(
        "Invalid encrypted data format",
      );
    });

    it("throws error for invalid format (empty components)", () => {
      expect(() => decryptToken("::")).toThrow(
        "Invalid encrypted data: missing components",
      );
    });

    it("throws error for corrupted data", () => {
      const encrypted = encryptToken("test");
      const corrupted = encrypted.replace(/[a-f]/g, "x"); // corrupt the hex

      expect(() => decryptToken(corrupted)).toThrow(
        "Failed to decrypt token",
      );
    });

    it("throws error when using wrong key", () => {
      const encrypted = encryptToken("test");

      // Change to a different key
      const differentKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", differentKey);

      expect(() => decryptToken(encrypted)).toThrow(
        "Failed to decrypt token",
      );
    });
  });

  describe("isEncrypted", () => {
    it("returns true for encrypted data", () => {
      const encrypted = encryptToken("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("returns false for plaintext", () => {
      expect(isEncrypted("plain-text-token")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("returns false for partial format", () => {
      expect(isEncrypted("part1:part2")).toBe(false);
    });

    it("returns false for wrong IV length", () => {
      // IV should be 32 hex chars, this is shorter
      expect(isEncrypted("abc:00000000000000000000000000000000:deadbeef")).toBe(
        false,
      );
    });

    it("returns false for wrong authTag length", () => {
      expect(isEncrypted("00000000000000000000000000000000:abc:deadbeef")).toBe(
        false,
      );
    });

    it("returns false for non-hex characters", () => {
      expect(
        isEncrypted(
          "0000000000000000000000000000000g:00000000000000000000000000000000:deadbeef",
        ),
      ).toBe(false);
    });

    it("returns false for empty ciphertext", () => {
      expect(
        isEncrypted(
          "00000000000000000000000000000000:00000000000000000000000000000000:",
        ),
      ).toBe(false);
    });
  });

  describe("safeEncryptToken", () => {
    it("encrypts when key is available", () => {
      const token = "test-token";
      const result = safeEncryptToken(token);

      expect(result).not.toBe(token);
      expect(isEncrypted(result)).toBe(true);
    });

    it("returns original when key is missing (default)", () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");

      const token = "test-token";
      const result = safeEncryptToken(token);

      expect(result).toBe(token);
    });

    it("throws when key is missing and throwOnMissingKey is true", () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");

      expect(() => safeEncryptToken("test", { throwOnMissingKey: true }))
        .toThrow(
          "TOKEN_ENCRYPTION_KEY",
        );
    });

    it("returns empty string for empty input", () => {
      expect(safeEncryptToken("")).toBe("");
    });

    it("throws for other errors", () => {
      // Wrong length key should still throw
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "tooshort");

      expect(() => safeEncryptToken("test")).toThrow();
    });
  });

  describe("safeDecryptToken", () => {
    it("decrypts encrypted data", () => {
      const original = "my-token";
      const encrypted = encryptToken(original);
      const result = safeDecryptToken(encrypted);

      expect(result).toBe(original);
    });

    it("returns plaintext as-is (migration support)", () => {
      const plaintext = "unencrypted-legacy-token";
      const result = safeDecryptToken(plaintext);

      expect(result).toBe(plaintext);
    });

    it("returns empty string for empty input", () => {
      expect(safeDecryptToken("")).toBe("");
    });

    it("returns original on decryption failure", () => {
      // Create something that looks encrypted but isn't valid
      const fakeEncrypted =
        "00000000000000000000000000000000:00000000000000000000000000000000:deadbeef";
      const result = safeDecryptToken(fakeEncrypted);

      // Should return as-is since decryption fails
      expect(result).toBe(fakeEncrypted);
    });
  });

  describe("round-trip encryption", () => {
    it("handles special characters", () => {
      const tokens = [
        "token+with+plus",
        "token/with/slash",
        "token=with=equals",
        "token&with&ampersand",
        "token?with?question",
        'token"with"quotes',
        "token'with'apostrophe",
        "token\nwith\nnewlines",
        "token\twith\ttabs",
      ];

      for (const token of tokens) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it("handles JWT-like tokens", () => {
      const jwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const encrypted = encryptToken(jwt);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(jwt);
    });

    it("handles Facebook-like access tokens", () => {
      const fbToken =
        "EAABsbCS1iHgBAJZC8TqZAIZCZB6aKFpZBdZBDyV3Yx7tFzf7tZAZC8TqZAIZCZB6aKFpZBdZBDyV3Yx7tFzf7t";

      const encrypted = encryptToken(fbToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(fbToken);
    });

    it("handles Google OAuth tokens", () => {
      const googleToken = "ya29.a0ARrdaM-abc123XYZ_longer_token_string_here";

      const encrypted = encryptToken(googleToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(googleToken);
    });
  });
});
