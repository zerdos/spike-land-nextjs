import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { analyzeImage } from '@/lib/ai/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageData, mimeType } = body

    if (!imageData || !mimeType) {
      return NextResponse.json(
        { error: 'Missing imageData or mimeType' },
        { status: 400 }
      )
    }

    // Analyze the image with Gemini
    const analysis = await analyzeImage(imageData, mimeType)

    return NextResponse.json({
      success: true,
      analysis,
      userId: session.user.id,
    })
  } catch (error) {
    console.error('Error in test-gemini API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
