import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'

// Create a mock send function
const mockSend = vi.fn()

// Mock Resend at the module level
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  }
})

describe('Email Client', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockSend.mockClear()
    // Reset rate limit state before each test
    vi.resetModules()
    const { resetRateLimitState } = await import('./client')
    resetRateLimitState()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getResend', () => {
    it('should throw error when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY
      // Re-import to get fresh module with current env
      vi.resetModules()
      const { getResend } = await import('./client')

      expect(() => getResend()).toThrow('RESEND_API_KEY is not configured')
    })

    it('should return Resend client when API key is configured', async () => {
      process.env.RESEND_API_KEY = 'test_api_key'
      vi.resetModules()
      const { getResend } = await import('./client')

      const resend = getResend()

      expect(resend).toBeDefined()
      expect(resend.emails).toBeDefined()
    })

    it('should return same instance on multiple calls (singleton)', async () => {
      process.env.RESEND_API_KEY = 'test_api_key'
      vi.resetModules()
      const { getResend } = await import('./client')

      const resend1 = getResend()
      const resend2 = getResend()

      expect(resend1).toBe(resend2)
    })
  })

  describe('sendEmail', () => {
    const mockReactElement = React.createElement('div', {}, 'Test Email')

    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test_api_key'
      process.env.EMAIL_FROM = 'test@example.com'
    })

    it('should send email successfully with default from address', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('test-email-id')
      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })
    })

    it('should send email with custom from address', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
        from: 'custom@example.com',
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        from: 'custom@example.com',
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })
    })

    it('should use fallback from address when EMAIL_FROM is not set', async () => {
      delete process.env.EMAIL_FROM
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@spike.land',
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })
    })

    it('should send email to multiple recipients', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const recipients = ['user1@example.com', 'user2@example.com']
      const result = await sendEmail({
        to: recipients,
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: recipients,
        subject: 'Test Email',
        react: mockReactElement,
      })
    })

    it('should handle error from Resend API (validation error)', async () => {
      vi.resetModules()
      // Set mock before importing to ensure proper setup
      mockSend.mockClear()
      mockSend.mockResolvedValue({
        data: null,
        error: {
          message: 'validation error: domain not verified',
          statusCode: 400,
          name: 'validation_error',
        },
      })
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('validation error')
      expect(mockSend).toHaveBeenCalledTimes(1) // No retries on validation errors
    })

    it('should handle error when email send fails with no ID', async () => {
      vi.resetModules()
      mockSend.mockClear()
      mockSend.mockResolvedValue({
        data: {},
        error: null,
      })
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed')
    })

    it('should handle error when email send throws error', async () => {
      vi.resetModules()
      mockSend.mockClear()
      mockSend.mockRejectedValue(new Error('Network error'))
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.retriesUsed).toBe(2) // Retried twice before giving up
    })

    it('should handle unknown error types', async () => {
      vi.resetModules()
      mockSend.mockClear()
      mockSend.mockRejectedValue('Unknown error')
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle RESEND_API_KEY not configured in sendEmail', async () => {
      delete process.env.RESEND_API_KEY
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('RESEND_API_KEY is not configured')
    })

    it('should handle null data in response', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: null,
      })
      vi.resetModules()
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email formats', async () => {
      vi.resetModules()
      const { isValidEmail } = await import('./client')

      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('user.name@example.com')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
      expect(isValidEmail('user@sub.example.com')).toBe(true)
    })

    it('should reject invalid email formats', async () => {
      vi.resetModules()
      const { isValidEmail } = await import('./client')

      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('email validation in sendEmail', () => {
    const mockReactElement = React.createElement('div', {}, 'Test Email')

    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test_api_key'
      process.env.EMAIL_FROM = 'test@example.com'
    })

    it('should reject invalid email format before sending', async () => {
      vi.resetModules()
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should reject if any recipient has invalid email', async () => {
      vi.resetModules()
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: ['valid@example.com', 'invalid-email'],
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('rate limiting', () => {
    const mockReactElement = React.createElement('div', {}, 'Test Email')

    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test_api_key'
      process.env.EMAIL_FROM = 'test@example.com'
    })

    it('should block emails when rate limit exceeded', async () => {
      vi.resetModules()
      const { sendEmail, setRateLimitCount, resetRateLimitState } = await import('./client')
      resetRateLimitState()
      setRateLimitCount(100) // At limit

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Daily email limit exceeded')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should return warning when approaching rate limit', async () => {
      vi.resetModules()
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      const { sendEmail, setRateLimitCount, resetRateLimitState } = await import('./client')
      resetRateLimitState()
      setRateLimitCount(80) // At warning threshold

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(true)
      expect(result.rateLimitWarning).toBe(true)
    })

    it('should return rate limit status', async () => {
      vi.resetModules()
      const { getRateLimitStatus, setRateLimitCount, resetRateLimitState } = await import('./client')
      resetRateLimitState()
      setRateLimitCount(50)

      const status = getRateLimitStatus()

      expect(status.count).toBe(50)
      expect(status.remaining).toBe(50)
      expect(status.resetIn).toBeGreaterThan(0)
    })
  })

  describe('retry logic', () => {
    const mockReactElement = React.createElement('div', {}, 'Test Email')

    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test_api_key'
      process.env.EMAIL_FROM = 'test@example.com'
    })

    it('should not retry on validation errors', async () => {
      vi.resetModules()
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'validation error: invalid email' },
      })
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.retriesUsed).toBe(0)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should not retry on configuration errors', async () => {
      delete process.env.RESEND_API_KEY
      vi.resetModules()
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('RESEND_API_KEY')
      expect(result.retriesUsed).toBe(0)
    })

    it('should return retriesUsed count on success', async () => {
      vi.resetModules()
      mockSend.mockResolvedValue({
        data: { id: 'test-email-id' },
        error: null,
      })
      const { sendEmail, resetRateLimitState } = await import('./client')
      resetRateLimitState()

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(true)
      expect(result.retriesUsed).toBe(0)
    })
  })
})
