import { describe, expect, it, vi } from "vitest";
import { CSP_NONCE_HEADER, generateNonce } from "./csp-nonce";
import { getNonce } from "./csp-nonce-server";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";

describe("CSP Nonce Utility", () => {
  describe("generateNonce", () => {
    it("should generate a base64 string", () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe("string");
      expect(nonce.length).toBeGreaterThan(0);
      // Base64 regex (letters, numbers, +, /, and optional = padding)
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe("getNonce", () => {
    it("should retrieve nonce from headers", async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue("test-nonce"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const nonce = await getNonce();
      expect(nonce).toBe("test-nonce");
      expect(mockHeaders.get).toHaveBeenCalledWith(CSP_NONCE_HEADER);
    });

    it("should return null if nonce is missing", async () => {
      const mockHeaders = {
        get: vi.fn().mockReturnValue(null),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const nonce = await getNonce();
      expect(nonce).toBeNull();
      expect(mockHeaders.get).toHaveBeenCalledWith(CSP_NONCE_HEADER);
    });
  });
});
