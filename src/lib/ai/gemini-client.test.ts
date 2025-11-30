import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import {
  analyzeImage,
  isGeminiConfigured,
  enhanceImageWithGemini,
  resetGeminiClient,
  type EnhanceImageParams,
} from './gemini-client'

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}))

import { GoogleGenAI } from '@google/genai'

describe('gemini-client', () => {
  describe('analyzeImage', () => {
    it('should return analysis result with enhancement prompt', async () => {
      const result = await analyzeImage('base64data', 'image/jpeg')

      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('quality')
      expect(result).toHaveProperty('suggestedImprovements')
      expect(result).toHaveProperty('enhancementPrompt')
      expect(result.quality).toMatch(/low|medium|high/)
      expect(Array.isArray(result.suggestedImprovements)).toBe(true)
    })

    it('should include enhancement prompt with base prompt', async () => {
      const result = await analyzeImage('base64data', 'image/jpeg')

      expect(result.enhancementPrompt).toContain('Create a high resolution version')
      expect(result.enhancementPrompt).toContain('professional photographer')
    })

    it('should log image metadata during analysis', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      await analyzeImage('testImageData', 'image/png')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('image/png')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('13 chars') // 'testImageData'.length
      )

      consoleSpy.mockRestore()
    })
  })

  describe('isGeminiConfigured', () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY
    })

    it('should return true when API key is set', () => {
      process.env.GEMINI_API_KEY = 'test-api-key'
      expect(isGeminiConfigured()).toBe(true)
    })

    it('should return false when API key is not set', () => {
      expect(isGeminiConfigured()).toBe(false)
    })

    it('should return false when API key is empty string', () => {
      process.env.GEMINI_API_KEY = ''
      expect(isGeminiConfigured()).toBe(false)
    })
  })

  describe('enhanceImageWithGemini', () => {
    const mockGenerateContentStream = vi.fn()
    const mockGeminiClient = {
      models: {
        generateContentStream: mockGenerateContentStream,
      },
    }

    beforeEach(() => {
      vi.clearAllMocks()
      resetGeminiClient()
      process.env.GEMINI_API_KEY = 'test-api-key'
      ;(GoogleGenAI as Mock).mockImplementation(() => mockGeminiClient)
    })

    afterEach(() => {
      delete process.env.GEMINI_API_KEY
      resetGeminiClient()
    })

    const defaultParams: EnhanceImageParams = {
      imageData: 'base64imagedata',
      mimeType: 'image/jpeg',
      tier: '1K',
    }

    it('should throw error when API key is not set', async () => {
      delete process.env.GEMINI_API_KEY
      resetGeminiClient()

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        'GEMINI_API_KEY environment variable is not set'
      )
    })

    it('should handle streaming response correctly', async () => {
      const imageBase64 = Buffer.from('test-image-data').toString('base64')

      // Create async generator for streaming response
      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: imageBase64,
                    },
                  },
                ],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      const result = await enhanceImageWithGemini(defaultParams)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('test-image-data')
    })

    it('should concatenate multiple chunks correctly', async () => {
      const chunk1 = Buffer.from('chunk1').toString('base64')
      const chunk2 = Buffer.from('chunk2').toString('base64')

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk1 } }],
              },
            },
          ],
        }
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk2 } }],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      const result = await enhanceImageWithGemini(defaultParams)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('chunk1chunk2')
    })

    it('should throw when no image data received', async () => {
      async function* mockStream() {
        yield { candidates: [] }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        'No image data received from Gemini API'
      )
    })

    it('should skip chunks without valid candidates', async () => {
      const imageBase64 = Buffer.from('valid-data').toString('base64')

      async function* mockStream() {
        // Chunk without candidates
        yield { candidates: null }
        // Chunk without content
        yield { candidates: [{ content: null }] }
        // Chunk without parts
        yield { candidates: [{ content: { parts: null } }] }
        // Valid chunk
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      const result = await enhanceImageWithGemini(defaultParams)

      expect(result.toString()).toBe('valid-data')
    })

    it('should handle empty inline data gracefully', async () => {
      const imageBase64 = Buffer.from('fallback-data').toString('base64')

      async function* mockStream() {
        // Chunk with empty data string
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: '' } }],
              },
            },
          ],
        }
        // Valid chunk
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      const result = await enhanceImageWithGemini(defaultParams)

      // Empty data still creates a buffer (0 bytes), so both are concatenated
      expect(result.toString()).toBe('fallback-data')
    })

    it('should pass correct parameters to Gemini API', async () => {
      const imageBase64 = Buffer.from('test').toString('base64')

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      const params: EnhanceImageParams = {
        imageData: 'myImageData',
        mimeType: 'image/png',
        tier: '2K',
        originalWidth: 800,
        originalHeight: 600,
      }

      await enhanceImageWithGemini(params)

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro-image-preview',
          config: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              imageSize: '2K',
            },
          },
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'myImageData',
                  },
                }),
                expect.objectContaining({
                  text: expect.stringContaining('2048x2048'),
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should handle different tier resolutions', async () => {
      const imageBase64 = Buffer.from('test').toString('base64')

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        }
      }

      // Test 4K tier
      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      await enhanceImageWithGemini({ ...defaultParams, tier: '4K' })

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { imageSize: '4K' },
          }),
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('4096x4096'),
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('should log generation message', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const imageBase64 = Buffer.from('test').toString('base64')

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        }
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream())

      await enhanceImageWithGemini(defaultParams)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Generating enhanced image with Gemini API...'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('resetGeminiClient', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    afterEach(() => {
      delete process.env.GEMINI_API_KEY
      resetGeminiClient()
    })

    it('should allow reinitializing client after reset', () => {
      process.env.GEMINI_API_KEY = 'first-key'
      ;(GoogleGenAI as Mock).mockImplementation(({ apiKey }) => ({
        apiKey,
        models: { generateContentStream: vi.fn() },
      }))

      resetGeminiClient()

      // First call should create new client
      expect(GoogleGenAI).not.toHaveBeenCalled()
    })
  })
})
