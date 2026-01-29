import { describe, it, expect, vi } from 'vitest';
import {
  verifyDomainOwnership,
  isValidDomain,
  calculateDaysUntilExpiration,
  getSslStatusFromExpiration,
  generateVerificationToken,
  getVerificationInstructions,
  initiateSslProvisioning,
  checkSslStatus,
} from './domain-verification';
// Mock dns module
const mocks = vi.hoisted(() => ({
  resolveTxt: vi.fn(),
}));

vi.mock('dns', () => ({
  __esModule: true,
  promises: {
    resolveTxt: mocks.resolveTxt,
  },
  default: {
    promises: {
      resolveTxt: mocks.resolveTxt,
    },
  },
}));

describe('Domain Verification', () => {
  describe('generateVerificationToken', () => {
    it('should generate a token with correct prefix', () => {
      const token = generateVerificationToken();
      expect(token).toMatch(/^spike-land-verify=[a-f0-9]{32}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyDomainOwnership', () => {
    it('should return true if token is found in TXT records', async () => {
      mocks.resolveTxt.mockResolvedValue([['other-record'], ['spike-land-verify=abc123456']]);
      const result = await verifyDomainOwnership('example.com', 'spike-land-verify=abc123456');
      expect(result).toBe(true);
    });

    it('should return false if token is not found', async () => {
      mocks.resolveTxt.mockResolvedValue([['other-record']]);
      const result = await verifyDomainOwnership('example.com', 'spike-land-verify=abc123456');
      expect(result).toBe(false);
    });

    it('should return false on dns error', async () => {
      mocks.resolveTxt.mockRejectedValue(new Error('DNS Error'));
      const result = await verifyDomainOwnership('example.com', 'token');
      expect(result).toBe(false);
    });
  });

  describe('getVerificationInstructions', () => {
    it('should return correct instruction object', () => {
      const instructions = getVerificationInstructions('test.com', 'token123');
      expect(instructions).toEqual({
        recordType: 'TXT',
        host: 'test.com',
        value: 'token123',
        ttl: 3600,
      });
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('my-site.org')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('http://example.com')).toBe(false);
      expect(isValidDomain('example')).toBe(false); // No TLD
      expect(isValidDomain('-example.com')).toBe(false);
      expect(isValidDomain('')).toBe(false);
    });
  });
  
  describe('SSL Helpers', () => {
      it('calculateDaysUntilExpiration returns correct days', () => {
          const future = new Date();
          future.setDate(future.getDate() + 10);
          expect(calculateDaysUntilExpiration(future)).toBe(10); // Approx
          
          const past = new Date();
          past.setDate(past.getDate() - 1);
          expect(calculateDaysUntilExpiration(past)).toBe(0);
          
          expect(calculateDaysUntilExpiration(null)).toBe(null);
      });

      it('getSslStatusFromExpiration returns correct status', () => {
          expect(getSslStatusFromExpiration(null)).toBe('PENDING');
          
          const expired = new Date();
          expired.setDate(expired.getDate() - 1);
          expect(getSslStatusFromExpiration(expired)).toBe('EXPIRED');

          const soon = new Date();
          soon.setDate(soon.getDate() + 15);
          expect(getSslStatusFromExpiration(soon)).toBe('EXPIRING_SOON');

          const valid = new Date();
          valid.setDate(valid.getDate() + 60);
          expect(getSslStatusFromExpiration(valid)).toBe('ACTIVE');
      });
  });

  describe('Async Placeholders', () => {
     it('initiateSslProvisioning returns placeholder success', async () => {
         const res = await initiateSslProvisioning('test.com');
         expect(res.success).toBe(true);
     });

     it('checkSslStatus returns placeholder pending', async () => {
         const res = await checkSslStatus('test.com');
         expect(res.status).toBe('PENDING');
     });
  });
});
