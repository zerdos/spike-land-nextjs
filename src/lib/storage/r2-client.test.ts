import { describe, it, expect, beforeEach } from 'vitest'
import { isR2Configured } from './r2-client'

describe('r2-client', () => {
  describe('isR2Configured', () => {
    beforeEach(() => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
      delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      delete process.env.CLOUDFLARE_R2_BUCKET_NAME
      delete process.env.CLOUDFLARE_R2_ENDPOINT
    })

    it('should return true when all required env vars are set', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(true)
    })

    it('should return false when CLOUDFLARE_ACCOUNT_ID is missing', () => {
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when CLOUDFLARE_R2_ACCESS_KEY_ID is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when CLOUDFLARE_R2_BUCKET_NAME is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when CLOUDFLARE_R2_ENDPOINT is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when no env vars are set', () => {
      expect(isR2Configured()).toBe(false)
    })
  })
})
