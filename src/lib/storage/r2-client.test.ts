import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isR2Configured, deleteFromR2 } from './r2-client'

// Create shared mock function
const mockSend = vi.fn()

// Mock AWS SDK - Vitest 4: Use class constructors for mock classes
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = mockSend
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public params: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public params: unknown) {}
  },
}))

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn(),
}))

describe('r2-client', () => {
  describe('isR2Configured', () => {
    beforeEach(() => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
      delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      delete process.env.CLOUDFLARE_R2_BUCKET_NAME
      delete process.env.CLOUDFLARE_R2_ENDPOINT
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL
    })

    it('should return true when all required env vars are set', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'
      process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-test.r2.dev'

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
      process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-test.r2.dev'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when CLOUDFLARE_R2_PUBLIC_URL is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

      expect(isR2Configured()).toBe(false)
    })

    it('should return false when no env vars are set', () => {
      expect(isR2Configured()).toBe(false)
    })
  })

  describe('deleteFromR2', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Set up required env vars
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
      process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'
    })

    it('should return success result when deletion succeeds', async () => {
      mockSend.mockResolvedValue({})

      const result = await deleteFromR2('test-key.jpg')

      expect(result.success).toBe(true)
      expect(result.key).toBe('test-key.jpg')
      expect(result.error).toBeUndefined()
    })

    it('should return error result when deletion fails', async () => {
      mockSend.mockRejectedValue(new Error('Network error'))

      const result = await deleteFromR2('test-key.jpg')

      expect(result.success).toBe(false)
      expect(result.key).toBe('test-key.jpg')
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('String error')

      const result = await deleteFromR2('test-key.jpg')

      expect(result.success).toBe(false)
      expect(result.key).toBe('test-key.jpg')
      expect(result.error).toBe('Unknown error')
    })
  })
})
