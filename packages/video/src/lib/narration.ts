import { VCP_DURATIONS, VCP_TIMING } from "./constants";
import { NARRATION_TIMESTAMPS } from "./narration-timestamps";

export interface NarrationWord {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface NarrationSegment {
  sceneId: keyof typeof VCP_DURATIONS;
  text: string;
  words: NarrationWord[];
  startFrame: number;
  endFrame: number;
}

/**
 * Scene narration text — to be synced with ElevenLabs timestamps post-recording
 */
export const NARRATION_TEXT: Record<keyof typeof VCP_DURATIONS, string> = {
  hook: `I built an AI that turns URLs into working apps. Type /create/games/tetris and a playable Tetris appears in seconds. Sounds magical. Here's what actually happened: it worked forty percent of the time. The other sixty percent? Broken imports. Undefined variables. Apps that crash on load. The AI was smart enough to write Tetris — it just wasn't smart enough to remember that it had failed at Tetris before. Every generation started from scratch. No memory. No wisdom. Just raw intelligence with zero institutional knowledge. Here's the paradox: giving an AI MORE freedom — letting it "vibe code" — produces WORSE results than constraining it. You'd think fewer rules means more creativity. Physics says otherwise.`,

  physicsOfAttention: `Let's start from first principles. A token is the atomic unit of an AI model's world. Every instruction gets chopped into tokens. The model processes them through self-attention, and here's the equation: attention equals softmax of Q-K-transpose over root-d, times V. The crucial part is softmax. It normalizes attention weights to sum to one. This is a conservation law. You cannot create attention from nothing. There is a fixed budget. Every token competes. Attention is like a room with one spotlight. Vibe coding puts twenty people in the room and hopes the spotlight finds the right one. Context engineering puts three people in and nails the spotlight to the floor. A 2025 paper found a forty-seven-point-six percent accuracy drop at thirty thousand tokens — even when retrieval was perfect. Even blank whitespace caused drops. This isn't a bug. It's physics.`,

  beforeState: `Let's be honest about where we started. One Gemini API call. One retry on failure. No memory. No learning. Like a student who writes the exam without studying: sometimes brilliant, usually mediocre. And crucially — a student who forgets everything between exams.`,

  fiveLayerStack: `The fix isn't more AI. It's better physics. The five-layer context stack — Identity, Knowledge, Examples, Constraints, Tools — is a conservation strategy. Stable layers get cached. Dynamic layers get appended fresh. The model's attention goes to the right things. Identity is the conservation law — never changes. Knowledge is fresh measurement — rebuilt per request. Examples are calibration data. Constraints are boundary conditions. Tools define what's observable. The key function returns split blocks: a stable prefix for caching and a dynamic suffix. On subsequent requests, the stable prefix is served from KV cache at ten times lower cost. Context engineering isn't just technically sound — it's economically optimal.`,

  fixLoop: `The agent loop is Darwinian selection for code. Generate — mutation. Transpile — environmental test. Fix — adaptation. Learn — heritable memory. Up to three generations per request. Opus at temperature zero-point-five creates. High temperature means high entropy — good for novel solutions. When code fails, Sonnet at zero-point-two fixes. Precise. Deterministic. A different model than the generator — like a proofreader who isn't the author. Haiku handles learning at the cheapest tier. You hire an architect for the design and a laborer for the drywall.`,

  agentMemory: `The loop fixes individual errors. But the memory system prevents them from recurring. Every error triggers Haiku to extract a learning note. Each starts as a CANDIDATE with confidence zero-point-five. The Bayesian formula — successes plus one over successes plus failures plus two — is the same math behind A/B testing. Help three times with above sixty percent confidence? Promoted to ACTIVE. Drop below thirty percent? DEPRECATED. Extinct. Notes are budget-constrained to eight hundred tokens. High-confidence notes earn their place. Low-confidence notes get pruned. Natural selection, running on softmax.`,

  skillMatching: `When someone requests /create/games/tetris, keywords trigger game-specific skills: confetti for celebrations, howler for audio. Different URL, different skills. Eight categories. Keyword-driven. Deliberately simple. In electronics, maximum power transfer happens when impedances match. In prompting, maximum quality happens when skill context matches the task. A game prompt loaded with chart docs is impedance mismatch — energy wasted on wrong context.`,

  metaBuild: `Here's the part that broke my brain. The entire agent was designed using Claude Code's plan mode — the exact technique the agent now uses internally. Context engineering was used to build a system that does context engineering. The plan was a prompt. The prompt built a system that builds prompts. It's recursive. All the way down.`,

  results: `First-try success: forty percent to sixty-five percent. With retries: fifty-five to eighty-five percent. The agent is fifteen to twenty times more expensive. But a ten-cent generation that works is infinitely more valuable than a half-cent generation that's broken. The metrics show something unexpected: learning notes have diminishing returns. First three to five notes help significantly. After that, attention starts competing. Same physics. All the way down.`,

  endCard: `Three takeaways. One: Conserve your attention budget. Every token competes. Two: Build feedback loops, not bigger prompts. Evolution beats intelligent design. Three: Match your tools to your task. The best AI isn't the one that tries hardest. It's the one that remembers what went wrong. Vibe coding is entropy. Context engineering is order.`,
};

/**
 * Compute cumulative scene start frames
 */
const sceneKeys = Object.keys(VCP_DURATIONS) as (keyof typeof VCP_DURATIONS)[];
const sceneStartFrames: Record<string, number> = {};
let cumulative = 0;
for (const key of sceneKeys) {
  sceneStartFrames[key] = cumulative;
  cumulative += VCP_DURATIONS[key];
}

/**
 * Get the start frame for a given scene
 */
export function getSceneStartFrame(sceneId: keyof typeof VCP_DURATIONS): number {
  return sceneStartFrames[sceneId] ?? 0;
}

/**
 * Voice-active frame ranges for music ducking.
 * Uses actual audio durations from ElevenLabs timestamps when available,
 * falls back to full scene duration otherwise.
 */
export function getVoiceActiveFrames(): [number, number][] {
  return sceneKeys.map((key) => {
    const startFrame = sceneStartFrames[key] ?? 0;
    const timestamps = NARRATION_TIMESTAMPS[key];

    if (timestamps && timestamps.audioDurationSeconds > 0) {
      const audioDurationFrames = Math.ceil(
        timestamps.audioDurationSeconds * VCP_TIMING.fps,
      );
      return [startFrame, startFrame + audioDurationFrames] as [number, number];
    }

    // Fallback: assume voice active throughout scene
    return [startFrame, startFrame + VCP_DURATIONS[key]] as [number, number];
  });
}

/**
 * Get scene audio entries for Remotion <Audio> components.
 * Returns scene IDs with their start frames for audio sequencing.
 */
export function getSceneAudioEntries(): { sceneId: string; startFrame: number }[] {
  return sceneKeys.map((key) => ({
    sceneId: key,
    startFrame: sceneStartFrames[key] ?? 0,
  }));
}

/**
 * Get the word being spoken at a given frame, for subtitle/highlight support.
 * Returns null if no word is active at that frame.
 */
export function getWordAtFrame(frame: number): NarrationWord | null {
  // Find which scene this frame belongs to
  let sceneKey: string | null = null;
  for (const key of sceneKeys) {
    const sceneStart = sceneStartFrames[key] ?? 0;
    const sceneEnd = sceneStart + VCP_DURATIONS[key];
    if (frame >= sceneStart && frame < sceneEnd) {
      sceneKey = key;
      break;
    }
  }

  if (!sceneKey) return null;

  const timestamps = NARRATION_TIMESTAMPS[sceneKey];
  if (!timestamps || timestamps.words.length === 0) return null;

  // Convert frame to seconds relative to scene start
  const sceneStart = sceneStartFrames[sceneKey] ?? 0;
  const relativeSeconds = (frame - sceneStart) / VCP_TIMING.fps;

  // Find the word at this time
  for (const word of timestamps.words) {
    if (relativeSeconds >= word.start && relativeSeconds <= word.end) {
      return word;
    }
  }

  return null;
}
