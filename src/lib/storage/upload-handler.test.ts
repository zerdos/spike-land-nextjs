import { describe, it, expect } from 'vitest'
import { validateImageFile } from './upload-handler'

describe('upload-handler', () => {
  describe('validateImageFile', () => {
    it('should validate buffer within size limit', () => {
      const buffer = Buffer.alloc(1024 * 1024) // 1MB
      const result = validateImageFile(buffer)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject buffer exceeding default size limit', () => {
      const buffer = Buffer.alloc(51 * 1024 * 1024) // 51MB (exceeds default 50MB)
      const result = validateImageFile(buffer)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('File size exceeds maximum')
    })

    it('should validate buffer within custom size limit', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024) // 5MB
      const result = validateImageFile(buffer, 10 * 1024 * 1024) // 10MB limit

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject buffer exceeding custom size limit', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024) // 5MB
      const result = validateImageFile(buffer, 2 * 1024 * 1024) // 2MB limit

      expect(result.valid).toBe(false)
      expect(result.error).toContain('File size exceeds maximum of 2MB')
    })

    it('should validate empty buffer', () => {
      const buffer = Buffer.alloc(0)
      const result = validateImageFile(buffer)

      expect(result.valid).toBe(true)
    })

    it('should validate File object within size limit', () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
