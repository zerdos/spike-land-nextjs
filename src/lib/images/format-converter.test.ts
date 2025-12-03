import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import {
  convertImageFormat,
  type ExportFormat,
} from './format-converter'

const mockPng = vi.fn()
const mockJpeg = vi.fn()
const mockWebp = vi.fn()
const mockToBuffer = vi.fn()

vi.mock('sharp', () => {
  const createSharpInstance = () => ({
    png: mockPng.mockReturnThis(),
    jpeg: mockJpeg.mockReturnThis(),
    webp: mockWebp.mockReturnThis(),
    toBuffer: mockToBuffer,
  })

  return {
    default: vi.fn(() => createSharpInstance()),
  }
})

describe('format-converter', () => {
  const mockBuffer = Buffer.from('test-image-data')
  const mockOutputBuffer = Buffer.from('converted-image-data')

  beforeEach(() => {
    vi.clearAllMocks()
    mockToBuffer.mockResolvedValue(mockOutputBuffer)
  })

  describe('convertImageFormat', () => {
    it('should convert to PNG format', async () => {
      const result = await convertImageFormat(mockBuffer, { format: 'png' })

      expect(sharp).toHaveBeenCalledWith(mockBuffer)
      expect(mockPng).toHaveBeenCalledWith({
        compressionLevel: 9,
        palette: false,
      })
      expect(result).toEqual({
        buffer: mockOutputBuffer,
        mimeType: 'image/png',
        sizeBytes: mockOutputBuffer.length,
      })
    })

    it('should convert to JPEG format with default quality', async () => {
      const result = await convertImageFormat(mockBuffer, { format: 'jpeg' })

      expect(sharp).toHaveBeenCalledWith(mockBuffer)
      expect(mockJpeg).toHaveBeenCalledWith({
        quality: 95,
        mozjpeg: true,
      })
      expect(result).toEqual({
        buffer: mockOutputBuffer,
        mimeType: 'image/jpeg',
        sizeBytes: mockOutputBuffer.length,
      })
    })

    it('should convert to JPEG format with custom quality', async () => {
      const result = await convertImageFormat(mockBuffer, {
        format: 'jpeg',
        quality: 80,
      })

      expect(mockJpeg).toHaveBeenCalledWith({
        quality: 80,
        mozjpeg: true,
      })
      expect(result.mimeType).toBe('image/jpeg')
    })

    it('should convert to WebP format', async () => {
      const result = await convertImageFormat(mockBuffer, { format: 'webp' })

      expect(sharp).toHaveBeenCalledWith(mockBuffer)
      expect(mockWebp).toHaveBeenCalledWith({
        quality: 95,
        effort: 4,
      })
      expect(result).toEqual({
        buffer: mockOutputBuffer,
        mimeType: 'image/webp',
        sizeBytes: mockOutputBuffer.length,
      })
    })

    it('should throw error for invalid quality (too low)', async () => {
      await expect(
        convertImageFormat(mockBuffer, { format: 'jpeg', quality: 0 })
      ).rejects.toThrow('Quality must be between 1 and 100')
    })

    it('should throw error for invalid quality (too high)', async () => {
      await expect(
        convertImageFormat(mockBuffer, { format: 'jpeg', quality: 101 })
      ).rejects.toThrow('Quality must be between 1 and 100')
    })

    it('should throw error for unsupported format', async () => {
      await expect(
        convertImageFormat(mockBuffer, { format: 'bmp' as ExportFormat })
      ).rejects.toThrow('Unsupported format: bmp')
    })
  })

})
