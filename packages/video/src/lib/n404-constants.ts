/**
 * No More 404s — Scene Durations (frames @ 30fps)
 * Total: 9900 frames = 330 seconds = 5 minutes 30 seconds
 */
export const N404_DURATIONS = {
  hook: 900,          // 30s
  platform: 1200,     // 40s
  codespace: 1200,    // 40s
  learnit: 1050,      // 35s
  generate: 1200,     // 40s
  bridgemind: 1050,   // 35s
  bazdmeg: 1350,      // 45s
  breakthrough: 1050, // 35s
  agents: 900,        // 30s
  endCard: 900,       // 30s
} as const;

export const N404_TIMING = {
  totalFrames: 9900,  // 5 minutes 30 seconds
  fps: 30,
  transitionFrames: 20,
} as const;
