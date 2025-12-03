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

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockSend.mockClear()
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

    it('should handle error from Resend API', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid email address',
          statusCode: 400,
          name: 'validation_error',
        },
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email address')
    })

    it('should handle error when email send fails with no ID', async () => {
      mockSend.mockResolvedValue({
        data: {},
        error: null,
      })
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send email - no ID returned')
    })

    it('should handle error when email send throws error', async () => {
      mockSend.mockRejectedValue(new Error('Network error'))
      vi.resetModules()
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle unknown error types', async () => {
      mockSend.mockRejectedValue('Unknown error')
      vi.resetModules()
      const { sendEmail } = await import('./client')

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
      const { sendEmail } = await import('./client')

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        react: mockReactElement,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send email - no ID returned')
    })
  })
})
