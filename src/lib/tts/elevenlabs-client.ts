import { tryCatch } from "@/lib/try-catch";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - good narration voice
const MAX_TEXT_LENGTH = 5000;

interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
}

/**
 * Synthesize text to speech using ElevenLabs API.
 * Returns MP3 audio buffer.
 */
export async function synthesizeSpeech(
  text: string,
  options: ElevenLabsOptions = {},
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
    );
  }

  const voiceId = options.voiceId
    || process.env.ELEVENLABS_VOICE_ID?.trim()
    || DEFAULT_VOICE_ID;
  const modelId = options.modelId || "eleven_multilingual_v2";

  const url = `${ELEVENLABS_API_URL}/${voiceId}`;

  const { data: response, error } = await tryCatch(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }),
  );

  if (error) {
    throw new Error(`ElevenLabs API request failed: ${error.message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `ElevenLabs API returned ${response.status}: ${errorBody}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { MAX_TEXT_LENGTH };
