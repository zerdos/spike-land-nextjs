import { NextResponse } from "next/server"

interface ImageErrorLog {
  type: string
  versionId: string
  tier: string
  url: string
  timestamp: string
}

export async function POST(request: Request) {
  try {
    const body: ImageErrorLog = await request.json()

    // Log to server console - this will appear in Vercel logs
    console.error(
      "[ENHANCED_IMAGE_LOAD_ERROR]",
      JSON.stringify(
        {
          type: body.type,
          versionId: body.versionId,
          tier: body.tier,
          url: body.url,
          timestamp: body.timestamp,
          serverTimestamp: new Date().toISOString(),
        },
        null,
        2
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Image Error Logging] Failed to process error log:", error)
    return NextResponse.json(
      { success: false, error: "Failed to log error" },
      { status: 500 }
    )
  }
}
