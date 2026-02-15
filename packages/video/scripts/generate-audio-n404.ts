/**
 * Generate N404 voiceover audio via ElevenLabs TTS.
 *
 * Usage:
 *   npx tsx scripts/generate-audio-n404.ts          # all scenes
 *   npx tsx scripts/generate-audio-n404.ts --scene=hook  # single scene
 *
 * Self-contained — does NOT import from src/lib/tts/ to avoid @/ alias issues.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
const envPath = fs.existsSync(path.join(__dirname, "../../../.env.local"))
  ? path.join(__dirname, "../../../.env.local")
  : path.join(__dirname, "../../../.env");
dotenv.config({ path: envPath });

// ---------------------------------------------------------------------------
// Narration text (duplicated from n404-narration.ts to avoid @/ alias)
// ---------------------------------------------------------------------------
const N404_NARRATION_TEXT: Record<string, string> = {
  hook: `You type a URL. The page doesn't exist. Normally, you'd see this — a 404. But on spike.land, something different happens. The URL becomes an app. Instantly.`,
  problem: `The internet is full of dead ends. Broken links, missing pages, abandoned projects. Every 404 is a missed opportunity — a question that went unanswered, a tool that was never built. What if instead of nothing, every URL led somewhere useful?`,
  pipeline: `Here's how it works. When you visit an unknown URL on spike.land, an AI agent analyzes the path. /games/tetris tells it to build a game. /tools/calculator means a calculator. The agent generates React code, transpiles it with esbuild, and the app goes live — all in seconds. But we don't ship code blindly.`,
  reviewers: `Two AI reviewer agents inspect every generated app. One reviews the plan. The other reviews the code. Each reviewer has an ELO rating — like chess. Correct approvals raise their score. Wrong approvals lower it. The system uses softmax-weighted selection — better reviewers get chosen more often. Over time, review quality improves automatically.`,
  demo: `Watch it happen. A user visits spike.land/games/tetris. The route doesn't exist. The generation pipeline activates. Code is written, reviewed, transpiled. A live React app appears — playable Tetris, right in the browser. The first visitor waits a few seconds. Every visitor after gets it instantly from cache.`,
  bridgemind: `Every generated page is tracked. A ticket is automatically created on BridgeMind with the URL, generation metadata, and reviewer decisions. These sync to GitHub Issues and Projects. The entire history is auditable — which agent generated it, which reviewers approved it, and what ELO they had.`,
  flywheel: `This creates a flywheel. More visitors generate more pages. Reviewer ELOs improve. The platform gets richer. Every URL becomes a permanent, cached application. spike.land grows organically — from the URLs people actually want.`,
  endCard: `spike.land. Every URL is an app waiting to be born. Open source on GitHub. Built for the BridgeMind Vibeathon 2026.`,
};

// ---------------------------------------------------------------------------
// ElevenLabs client (inline to avoid @/ path alias issues)
// ---------------------------------------------------------------------------
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "jRAAK67SEFE9m7ci5DhD";

interface NarrationWord {
  word: string;
  start: number;
  end: number;
}

interface TimestampResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

function characterTimestampsToWords(
  alignment: TimestampResponse["alignment"],
): NarrationWord[] {
  const words: NarrationWord[] = [];
  let currentWord = "";
  let wordStart = -1;
  let wordEnd = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i]!;
    const charStart = alignment.character_start_times_seconds[i]!;
    const charEnd = alignment.character_end_times_seconds[i]!;

    if (char === " " || char === "\n" || char === "\t") {
      if (currentWord.length > 0) {
        words.push({ word: currentWord, start: wordStart, end: wordEnd });
        currentWord = "";
        wordStart = -1;
      }
    } else {
      if (wordStart === -1) {
        wordStart = charStart;
      }
      currentWord += char;
      wordEnd = charEnd;
    }
  }

  if (currentWord.length > 0) {
    words.push({ word: currentWord, start: wordStart, end: wordEnd });
  }

  return words;
}

async function synthesizeSpeechWithTimestamps(
  text: string,
): Promise<{ audio: Buffer; words: NarrationWord[]; audioDurationSeconds: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set. Add it to .env.local or .env");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
  const url = `${ELEVENLABS_API_URL}/${voiceId}/with-timestamps`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: text.trim(),
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`ElevenLabs API returned ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as TimestampResponse;
  const audioBuffer = Buffer.from(data.audio_base64, "base64");
  const words = characterTimestampsToWords(data.alignment);
  const endTimes = data.alignment.character_end_times_seconds;
  const audioDurationSeconds = endTimes.length > 0 ? endTimes[endTimes.length - 1]! : 0;

  return { audio: audioBuffer, words, audioDurationSeconds };
}

// ---------------------------------------------------------------------------
// Timestamp file generator
// ---------------------------------------------------------------------------
interface SceneTimestampData {
  sceneId: string;
  words: NarrationWord[];
  audioDurationSeconds: number;
}

function generateTimestampsFile(scenes: SceneTimestampData[]): string {
  const lines: string[] = [
    '// Auto-generated by scripts/generate-audio-n404.ts — do not edit manually',
    'import type { NarrationWord } from "./narration";',
    '',
    'export interface N404SceneTimestamps {',
    '  sceneId: string;',
    '  words: NarrationWord[];',
    '  audioDurationSeconds: number;',
    '}',
    '',
    'export const N404_NARRATION_TIMESTAMPS: Record<string, N404SceneTimestamps> = {',
  ];

  for (const scene of scenes) {
    lines.push(`  ${scene.sceneId}: {`);
    lines.push(`    sceneId: "${scene.sceneId}",`);
    lines.push(
      `    audioDurationSeconds: ${scene.audioDurationSeconds.toFixed(3)},`,
    );
    lines.push(`    words: [`);
    for (const word of scene.words) {
      lines.push(
        `      { word: ${JSON.stringify(word.word)}, start: ${word.start.toFixed(3)}, end: ${word.end.toFixed(3)} },`,
      );
    }
    lines.push(`    ],`);
    lines.push(`  },`);
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  sceneId: string,
  text: string,
  retries = 3,
): Promise<{ audio: Buffer; words: NarrationWord[]; audioDurationSeconds: number }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await synthesizeSpeechWithTimestamps(text);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const is429 = message.includes("429");
      if (is429 && attempt < retries) {
        const delay = attempt * 5000;
        console.warn(
          `  Rate limited on ${sceneId}, retrying in ${delay / 1000}s (attempt ${attempt}/${retries})...`,
        );
        await sleep(delay);
      } else if (attempt < retries) {
        console.warn(
          `  Error on ${sceneId}: ${message}, retrying (attempt ${attempt}/${retries})...`,
        );
        await sleep(2000);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Unreachable");
}

async function main() {
  const sceneArg = process.argv.find((a) => a.startsWith("--scene="));
  const targetScene = sceneArg ? sceneArg.split("=")[1] : null;

  const sceneIds = Object.keys(N404_NARRATION_TEXT);

  if (targetScene && !sceneIds.includes(targetScene)) {
    console.error(
      `Unknown scene: ${targetScene}. Available: ${sceneIds.join(", ")}`,
    );
    process.exit(1);
  }

  const scenesToGenerate = targetScene ? [targetScene] : sceneIds;

  const OUTPUT_DIR = path.join(__dirname, "../public/audio");
  const ROOT_AUDIO_DIR = path.join(__dirname, "../../../public/audio");
  const TIMESTAMPS_OUTPUT = path.join(
    __dirname,
    "../src/lib/n404-narration-timestamps.ts",
  );

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROOT_AUDIO_DIR)) {
    fs.mkdirSync(ROOT_AUDIO_DIR, { recursive: true });
  }

  let allTimestamps: SceneTimestampData[] = [];

  // Load existing timestamps if doing single-scene regeneration
  if (targetScene && fs.existsSync(TIMESTAMPS_OUTPUT)) {
    try {
      // Dynamic import won't work here; just regenerate all timestamps
    } catch {
      // ignore
    }
  }

  console.log(
    `Generating N404 audio for ${scenesToGenerate.length} scene(s)...\n`,
  );

  for (let i = 0; i < scenesToGenerate.length; i++) {
    const sceneId = scenesToGenerate[i]!;
    const text = N404_NARRATION_TEXT[sceneId]!;

    console.log(
      `[${i + 1}/${scenesToGenerate.length}] ${sceneId} (${text.length} chars)`,
    );

    try {
      const { audio, words, audioDurationSeconds } = await generateWithRetry(
        sceneId,
        text,
      );

      const fileName = `n404-${sceneId}.mp3`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      const rootPath = path.join(ROOT_AUDIO_DIR, fileName);
      fs.writeFileSync(filePath, audio);
      fs.writeFileSync(rootPath, audio);
      console.log(
        `  Saved ${fileName} (${(audio.length / 1024).toFixed(1)} KB, ${audioDurationSeconds.toFixed(1)}s, ${words.length} words)`,
      );

      allTimestamps.push({ sceneId, words, audioDurationSeconds });

      // Rate limit: 1s delay between API calls
      if (i < scenesToGenerate.length - 1) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`  FAILED: ${sceneId}:`, error);
      process.exit(1);
    }
  }

  // Sort timestamps by scene order
  const orderedTimestamps = sceneIds
    .map((id) => allTimestamps.find((s) => s.sceneId === id))
    .filter(Boolean) as SceneTimestampData[];

  const tsContent = generateTimestampsFile(orderedTimestamps);
  fs.writeFileSync(TIMESTAMPS_OUTPUT, tsContent);
  console.log(`\nTimestamps written to ${TIMESTAMPS_OUTPUT}`);
  console.log("\nDone!");
}

main();
