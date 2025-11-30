import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeImage, isGeminiConfigured } from './gemini-client'

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
})
