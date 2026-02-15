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
  hook: `Your build takes thirty minutes. Ours takes ten seconds. Your tests run for an hour. Ours finish before you blink. This is not a demo. This is not a prototype. This is spike.land — and this hackathon changed everything about how we build software.`,

  platform: `spike.land is four products in one. A codespace where you describe an app and AI builds it live. A blog with syntax highlighting and read-aloud. A knowledge wiki that generates content on any topic. And a dynamic page generator where every URL becomes a working application. Let me show you each one.`,

  codespace: `In the codespace, you describe what you want in plain English. The AI generates React code in real-time. You see a live preview updating as the code is written. Version history tracks every change. Server-sent events broadcast updates to every connected client. It is a full IDE — chat on the left, live app on the right.`,

  learnit: `LearnIT is an AI-powered wiki. Type any topic — Python lambda functions, quantum computing, Byzantine fault tolerance — and the system generates a complete article. Streaming. With wiki-style links that build a knowledge graph. The blog supports MDX, syntax highlighting, and text-to-speech. Every piece of content is generated, not curated.`,

  generate: `Visit any URL that does not exist, and the system builds it. The pipeline has six stages — planning, plan review, coding, transpiling, code review, published. Two AI reviewers inspect every generation. Each has an ELO rating — like chess. Better reviewers get selected more often via softmax weighting. The system gets smarter with every page it generates.`,

  bridgemind: `BridgeMind and this hackathon made our project adopt MCPs. Before this event, spike.land was a monolith with manual deployments and slow tests. The hackathon forced us to think in tools — forty-plus MCP tools across thirty categories. Progressive disclosure: five gateway tools, everything else discoverable. One hundred sixty-four tool files. Seventy-nine test files. Nearly one to one.`,

  bazdmeg: `The bazdmeg method came from this hackathon. Seven principles. One: Requirements are the product — if you cannot explain the problem, the AI will hallucinate. Two: Discipline before automation — five gates must pass before any AI touches your code. Three: Context is architecture — five layers, cached and optimized. Four: Test the lies — the hourglass model: seventy percent MCP tool tests, twenty percent E2E, ten percent UI. Five: Orchestrate, do not operate. Six: Trust is earned in pull requests, not promises. Seven: Own what you ship — if you cannot explain it at 3 AM, do not deploy it.`,

  breakthrough: `This is huge. We are able to run end-to-end tests in unit test time. A traditional E2E test takes thirty to three hundred seconds. Our MCP tool tests take less than one millisecond. The full CI suite went from forty-five minutes to three minutes. Four parallel shards. Dev iteration from five minutes of setup down to under one second. Your half-hour build gets to ten seconds.`,

  agents: `This video was built by eight agents working in parallel. One handled constants and narration. Two built the demo scenes. One built the methodology scenes. One handled the metrics. One coordinated dependencies. The same MCP architecture that powers spike.land powered the creation of this video. Orchestrate, do not operate.`,

  endCard: `spike.land. Open source on GitHub. Every URL is an app waiting to be born. The bazdmeg method is documented, the MCP tools are tested, and the platform is live. Try it. Star it. Fork it. Built with gratitude for BridgeMind and the Vibeathon twenty twenty-six.`,
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
