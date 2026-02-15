import { N404_DURATIONS, N404_TIMING } from "./n404-constants";
import { N404_NARRATION_TIMESTAMPS } from "./n404-narration-timestamps";
import type { NarrationWord } from "./narration";

/**
 * No More 404s — Scene narration text
 */
export const N404_NARRATION_TEXT: Record<keyof typeof N404_DURATIONS, string> = {
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

/**
 * Compute cumulative scene start frames
 */
const sceneKeys = Object.keys(N404_DURATIONS) as (keyof typeof N404_DURATIONS)[];
const sceneStartFrames: Record<string, number> = {};
let cumulative = 0;
for (const key of sceneKeys) {
  sceneStartFrames[key] = cumulative;
  cumulative += N404_DURATIONS[key];
}

/**
 * Get the start frame for a given scene
 */
export function getN404SceneStartFrame(sceneId: keyof typeof N404_DURATIONS): number {
  return sceneStartFrames[sceneId] ?? 0;
}

/**
 * Voice-active frame ranges for music ducking.
 */
export function getN404VoiceActiveFrames(): [number, number][] {
  return sceneKeys.map((key) => {
    const startFrame = sceneStartFrames[key] ?? 0;
    const timestamps = N404_NARRATION_TIMESTAMPS[key];

    if (timestamps && timestamps.audioDurationSeconds > 0) {
      const audioDurationFrames = Math.ceil(
        timestamps.audioDurationSeconds * N404_TIMING.fps,
      );
      return [startFrame, startFrame + audioDurationFrames] as [number, number];
    }

    // Fallback: assume voice active throughout scene
    return [startFrame, startFrame + N404_DURATIONS[key]] as [number, number];
  });
}

/**
 * Get scene audio entries for Remotion <Audio> components.
 */
export function getN404SceneAudioEntries(): { sceneId: string; startFrame: number }[] {
  return sceneKeys.map((key) => ({
    sceneId: key,
    startFrame: sceneStartFrames[key] ?? 0,
  }));
}

/**
 * Get the word being spoken at a given frame.
 */
export function getN404WordAtFrame(frame: number): NarrationWord | null {
  let sceneKey: string | null = null;
  for (const key of sceneKeys) {
    const sceneStart = sceneStartFrames[key] ?? 0;
    const sceneEnd = sceneStart + N404_DURATIONS[key];
    if (frame >= sceneStart && frame < sceneEnd) {
      sceneKey = key;
      break;
    }
  }

  if (!sceneKey) return null;

  const timestamps = N404_NARRATION_TIMESTAMPS[sceneKey];
  if (!timestamps || timestamps.words.length === 0) return null;

  const sceneStart = sceneStartFrames[sceneKey] ?? 0;
  const relativeSeconds = (frame - sceneStart) / N404_TIMING.fps;

  for (const word of timestamps.words) {
    if (relativeSeconds >= word.start && relativeSeconds <= word.end) {
      return word;
    }
  }

  return null;
}
