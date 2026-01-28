import { describe, expect, it } from "vitest";
import { buildWebhookUrl, generateSignature, verifySignature } from "./webhook-trigger";

describe("generateSignature", () => {
  it("should generate consistent signatures for same input", () => {
    const payload = '{"test": "data"}';
    const secret = "my-secret-key";

    const sig1 = generateSignature(payload, secret);
    const sig2 = generateSignature(payload, secret);

    expect(sig1).toBe(sig2);
  });

  it("should generate different signatures for different payloads", () => {
    const secret = "my-secret-key";

    const sig1 = generateSignature('{"a": 1}', secret);
    const sig2 = generateSignature('{"a": 2}', secret);

    expect(sig1).not.toBe(sig2);
  });

  it("should generate different signatures for different secrets", () => {
    const payload = '{"test": "data"}';

    const sig1 = generateSignature(payload, "secret-1");
    const sig2 = generateSignature(payload, "secret-2");

    expect(sig1).not.toBe(sig2);
  });

  it("should return 64-character hex string", () => {
    const sig = generateSignature("test", "secret");

    expect(sig).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(sig)).toBe(true);
  });
});

describe("verifySignature", () => {
  it("should verify correct signature", () => {
    const payload = '{"test": "data"}';
    const secret = "my-secret-key";
    const signature = generateSignature(payload, secret);

    expect(verifySignature(payload, signature, secret)).toBe(true);
  });

  it("should reject incorrect signature", () => {
    const payload = '{"test": "data"}';
    const secret = "my-secret-key";

    expect(verifySignature(payload, "wrong-signature", secret)).toBe(false);
  });

  it("should reject modified payload", () => {
    const secret = "my-secret-key";
    const signature = generateSignature('{"test": "data"}', secret);

    expect(verifySignature('{"test": "modified"}', signature, secret)).toBe(false);
  });

  it("should reject wrong secret", () => {
    const payload = '{"test": "data"}';
    const signature = generateSignature(payload, "correct-secret");

    expect(verifySignature(payload, signature, "wrong-secret")).toBe(false);
  });

  it("should handle invalid hex signature gracefully", () => {
    expect(verifySignature("test", "not-hex", "secret")).toBe(false);
    expect(verifySignature("test", "abc", "secret")).toBe(false); // Too short
  });
});

describe("buildWebhookUrl", () => {
  it("should build URL with token", () => {
    const token = "test-token-123";
    const url = buildWebhookUrl(token);

    expect(url).toContain("/api/workflows/webhook/");
    expect(url).toContain(token);
  });

  it("should use environment variable for base URL", () => {
    // The function uses process.env.NEXTAUTH_URL or NEXT_PUBLIC_APP_URL
    // In test environment, it falls back to localhost
    const url = buildWebhookUrl("token");

    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain("/api/workflows/webhook/token");
  });
});
