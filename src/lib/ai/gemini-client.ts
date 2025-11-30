import { GoogleGenAI } from '@google/genai'
import mime from 'mime'

let genAI: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    genAI = new GoogleGenAI({
      apiKey,
    })
  }
  return genAI
}

export interface ImageAnalysisResult {
  description: string
  quality: 'low' | 'medium' | 'high'
  suggestedImprovements: string[]
  enhancementPrompt: string
}

export interface EnhanceImageParams {
  imageData: string
  mimeType: string
  tier: '1K' | '2K' | '4K'
  originalWidth?: number
  originalHeight?: number
}

const ENHANCEMENT_BASE_PROMPT = `Create a high resolution version of this photo. Please generate it detailed with perfect focus, lights, and colors, make it look like if this photo was taken by a professional photographer with a modern professional camera in 2025.`

export async function analyzeImage(
  imageData: string,
  mimeType: string
): Promise<ImageAnalysisResult> {
  console.log('Analyzing image with Gemini API')

  // For now, return a simple analysis
  // In the future, we could use Gemini's vision model to actually analyze the image
  return {
    description: 'Photo ready for enhancement',
    quality: 'medium' as const,
    suggestedImprovements: ['sharpness', 'color enhancement', 'detail preservation'],
    enhancementPrompt: `${ENHANCEMENT_BASE_PROMPT}\n\nFocus on improving: sharpness, color enhancement, detail preservation`,
  }
}

export async function enhanceImageWithGemini(
  params: EnhanceImageParams
): Promise<Buffer> {
  const ai = getGeminiClient()

  const analysis = await analyzeImage(params.imageData, params.mimeType)

  const resolutionMap = {
    '1K': '1024x1024',
    '2K': '2048x2048',
    '4K': '4096x4096',
  }

  const config = {
    responseModalities: ['IMAGE'],
    imageConfig: {
      imageSize: params.tier,
    },
  }

  const model = 'gemini-3-pro-image-preview'

  const contents = [
    {
      role: 'user' as const,
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageData,
          },
        },
        {
          text: `${analysis.enhancementPrompt}\n\nGenerate at ${resolutionMap[params.tier]} resolution.`,
        },
      ],
    },
  ]

  console.log('Generating enhanced image with Gemini API...')

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  })

  const imageChunks: Buffer[] = []

  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue
    }

    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const inlineData = chunk.candidates[0].content.parts[0].inlineData
      const buffer = Buffer.from(inlineData.data || '', 'base64')
      imageChunks.push(buffer)
    }
  }

  if (imageChunks.length === 0) {
    throw new Error('No image data received from Gemini API')
  }

  return Buffer.concat(imageChunks)
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
