import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { MAX_TEXT_LENGTH, synthesizeSpeech } from "@/lib/tts/elevenlabs-client";
import { cacheTTSAudio, getCachedTTSUrl } from "@/lib/tts/tts-cache";
import { tryCatch } from "@/lib/try-catch";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Rate limit by IP
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headersList.get("x-real-ip")
    || "unknown";

  const rateLimit = await checkRateLimit(
    `tts:${ip}`,
    rateLimitConfigs.tts,
  );

  if (rateLimit.isLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  // Parse and validate request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { text, voiceId } = body as { text?: string; voiceId?: string; };
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Text is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
      { status: 400 },
    );
  }

  // Check R2 cache first
  const { data: cachedUrl } = await tryCatch(getCachedTTSUrl(text, voiceId));
  if (cachedUrl) {
    return NextResponse.json({ url: cachedUrl });
  }

  // Generate speech via ElevenLabs
  const { data: audioBuffer, error: synthError } = await tryCatch(
    synthesizeSpeech(text, { voiceId }),
  );

  if (synthError) {
    console.error("[TTS] Synthesis failed:", synthError);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 },
    );
  }

  // Cache to R2
  const { data: url } = await tryCatch(cacheTTSAudio(text, audioBuffer, voiceId));

  if (url) {
    return NextResponse.json({ url });
  }

  // Fallback: return audio directly if R2 upload failed
  return new NextResponse(new Uint8Array(audioBuffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
