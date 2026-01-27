# @spike-npm-land/video

Promotional video for spike.land built with [Remotion](https://www.remotion.dev/) - a framework for creating videos programmatically using React.

## Overview

This package creates a 15-second promotional video showcasing spike.land's unique AI workflow:

1. **Orbit A/B Testing** → Discovers insights from experiments
2. **My-Apps Agent** → Updates landing page in real-time
3. **Live Preview** → Shows changes instantly with a glitch transition effect
4. **End Card** → Brand reinforcement and call-to-action

## Technical Specifications

| Property     | Value        |
| ------------ | ------------ |
| Duration     | 15 seconds   |
| FPS          | 30           |
| Total Frames | 450          |
| Resolution   | 1920x1080    |
| Framework    | Remotion 4.x |

## Getting Started

### Prerequisites

Make sure you've installed dependencies from the monorepo root:

```bash
yarn install
```

### Development

Open Remotion Studio to preview and develop the video:

```bash
yarn workspace @spike-npm-land/video dev
```

This will open the studio at http://localhost:3000 where you can:

- Preview individual scenes
- Scrub through the timeline
- Adjust timing and animations
- See real-time updates

### Building

Render the final video:

```bash
yarn workspace @spike-npm-land/video build
```

Output: `packages/video/out/promo.mp4`

## Project Structure

```
packages/video/
├── src/
│   ├── Root.tsx                    # Composition registry
│   ├── Video.tsx                   # Main 15s composition
│   ├── compositions/
│   │   ├── OrbitDashboard.tsx      # Scene 1: A/B test dashboard
│   │   ├── MyAppsAgent.tsx         # Scene 2: Chat interface
│   │   ├── LiveUpdate.tsx          # Scene 3: Glitch transition
│   │   └── EndCard.tsx             # Scene 4: Brand reveal
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── effects/                # Visual effects
│   │   └── branding/               # Logo and brand elements
│   └── lib/
│       ├── constants.ts            # Colors, timing, config
│       └── animations.ts           # Animation helpers
├── remotion.config.ts              # Remotion + Tailwind config
└── tailwind.config.ts              # Tailwind CSS setup
```

## Scene Breakdown

### Scene 1: Orbit Dashboard (0-3s)

- Animated A/B test dashboard
- Bar charts showing engagement metrics
- "WINNER DETECTED" notification with glow effect

### Scene 2: My-Apps Agent (3-8s)

- Split-view: chat panel + iframe preview
- Agent typing indicator and responses
- Code snippets with syntax highlighting
- Progress stages indicator

### Scene 3: Live Update (8-12s)

- Glitch transition effect (RGB split, scan lines, noise)
- Text morphing animation
- "DEPLOYED" status badge

### Scene 4: End Card (12-15s)

- Logo reveal with spring animation
- Tagline with word-by-word stagger
- Feature pills animation
- Aurora borealis background

## Design System

### Colors

```typescript
const COLORS = {
  cyan: "#00E5FF", // Variant A
  fuchsia: "#FF00FF", // Variant B / Accent
  purple: "#9945FF", // Secondary
  amber: "#F59E0B", // Logo primary
  gold: "#FBBF24", // Logo secondary
  darkBg: "#0a0a0f", // Background
  darkCard: "#1a1a2e", // Card background
};
```

### Animation Configs

```typescript
// Smooth, no bounce (subtle reveals)
const smooth = { damping: 200 };

// Snappy, minimal bounce (UI elements)
const snappy = { damping: 20, stiffness: 200 };

// Bouncy entrance (playful animations)
const bouncy = { damping: 8 };
```

## Available Compositions

| ID                      | Duration | Description             |
| ----------------------- | -------- | ----------------------- |
| `PromoVideo`            | 15s      | Full promotional video  |
| `Scene1-OrbitDashboard` | 3s       | A/B testing scene       |
| `Scene2-MyAppsAgent`    | 5s       | Agent chat scene        |
| `Scene3-LiveUpdate`     | 4s       | Glitch transition scene |
| `Scene4-EndCard`        | 3s       | Brand reveal scene      |

Extended versions are available in the "Extended" folder for development.

## Adding Audio

Place audio files in `public/audio/`:

```
public/audio/
├── background-music.mp3    # Upbeat electronic
└── sfx/
    ├── notification.wav    # Winner notification
    ├── typing.wav          # Typing sound
    ├── glitch.wav          # Glitch effect
    └── whoosh.wav          # Transition swoosh
```

Then import in compositions:

```tsx
import { Audio, staticFile } from "remotion";

<Audio src={staticFile("audio/background-music.mp3")} volume={0.3} />;
```

## Tips

- All animations must use `useCurrentFrame()` - CSS animations don't work in Remotion
- Use `spring()` for physics-based motion
- Wrap delayed elements in `<Sequence from={frameNumber}>`
- The local frame inside a Sequence starts at 0
