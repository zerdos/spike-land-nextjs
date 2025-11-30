import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey)

export interface ImageAnalysisResult {
  description: string
  quality: 'low' | 'medium' | 'high'
  suggestedImprovements: string[]
  enhancementPrompt: string
}

export interface EnhanceImageParams {
  imageData: string // base64 encoded image
  mimeType: string
  tier: '1K' | '2K' | '4K'
}

const ENHANCEMENT_BASE_PROMPT = `Create a high resolution version of this photo. Please generate it detailed with perfect focus, lights, and colors, make it look like if this photo was taken by a professional photographer with a modern professional camera in 2025.`

/**
 * Analyze an image and generate enhancement recommendations
 */
export async function analyzeImage(
  imageData: string,
  mimeType: string
): Promise<ImageAnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analyze this image and provide:
1. A brief description of what's in the image
2. The current quality level (low/medium/high)
3. Specific improvements that could be made (lighting, focus, colors, composition)
4. Return the response in JSON format with keys: description, quality, suggestedImprovements (array of strings)`

    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType,
      },
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = result.response
    const text = response.text()

    // Parse the response (Gemini should return JSON)
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])

        // Generate enhancement prompt based on analysis
        const enhancementPrompt = `${ENHANCEMENT_BASE_PROMPT}\n\nFocus on improving: ${analysis.suggestedImprovements.join(', ')}`

        return {
          description: analysis.description || 'Image analysis',
          quality: analysis.quality || 'medium',
          suggestedImprovements: analysis.suggestedImprovements || [],
          enhancementPrompt,
        }
      }
    } catch {
      console.warn('Failed to parse Gemini JSON response, using fallback')
    }

    // Fallback if JSON parsing fails
    return {
      description: text.substring(0, 200),
      quality: 'medium',
      suggestedImprovements: ['lighting', 'focus', 'colors'],
      enhancementPrompt: ENHANCEMENT_BASE_PROMPT,
    }
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error)
    throw new Error('Failed to analyze image')
  }
}

/**
 * Generate an enhanced version of an image
 * Note: Gemini doesn't directly generate images, this is a placeholder
 * for Imagen API integration
 */
export async function enhanceImageWithGemini(
  params: EnhanceImageParams
): Promise<string> {
  // For now, we'll use Gemini to generate a detailed prompt
  // In Week 3, we'll integrate with Imagen API to actually generate the image
  const analysis = await analyzeImage(params.imageData, params.mimeType)

  // Resolution mapping
  const resolutionMap = {
    '1K': '1024x1024',
    '2K': '2048x2048',
    '4K': '4096x4096',
  }

  const enhancementPrompt = `${analysis.enhancementPrompt}\n\nGenerate at ${resolutionMap[params.tier]} resolution.`

  // TODO: Week 3 - Call Imagen API with this prompt
  // For now, return the prompt as a placeholder
  return enhancementPrompt
}

/**
 * Check if Gemini API is properly configured
 */
export function isGeminiConfigured(): boolean {
  return !!apiKey
}
