# React App Examples

A collection of single-file React apps built with shadcn/ui and Tailwind CSS.

## Overview

This package contains production-ready React apps that can be:

- Deployed to testing.spike.land/live/{app-name}
- Imported directly into other React applications
- Used as learning examples for React development

## Structure

```
react-app-examples/
├── utility/          # Calculators, converters, generators
├── visualization/    # Charts, dashboards, trackers
├── productivity/     # Todo lists, planners, notes
├── interactive/      # Games, quizzes, puzzles
├── health/           # Wellness and health trackers
├── dogs/             # Dog-related apps
└── lucky/            # Random/experimental apps
```

## Usage

### Direct Import

```tsx
import PomodoroTimer from "@spike-land/react-app-examples/utility/pomodoro-timer";

function MyPage() {
  return <PomodoroTimer />;
}
```

### Dynamic Import

```tsx
const App = lazy(() => import("@spike-land/react-app-examples/utility/pomodoro-timer"));

function MyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  );
}
```

### Bulk Import (index.ts)

```tsx
import { PomodoroTimer, TodoListClassic } from "@spike-land/react-app-examples";
```

## App Requirements

Each app in this collection:

1. **Single File**: One `.tsx` file with `export default function App()`
2. **Self-Contained**: No external dependencies beyond React, shadcn/ui, Tailwind, recharts
3. **Responsive**: Works on mobile (320px) through desktop (1440px)
4. **Accessible**: Keyboard navigable, proper ARIA labels, good contrast
5. **Persistent**: Uses localStorage where appropriate

## Dependencies

These apps require:

- React 18+
- Tailwind CSS 3.4+
- shadcn/ui components
- lucide-react (for icons)
- recharts (for data visualization apps)

## Categories

### Utility Tools

Calculators, converters, generators, and formatters for everyday tasks.

### Data Visualization

Charts, graphs, dashboards, and trackers for displaying data.

### Productivity Apps

Todo lists, planners, notes, and organizational tools.

### Interactive Experiences

Games, quizzes, puzzles, and interactive entertainment.

### Health & Wellness

Trackers and tools for health, fitness, and mental wellness.

### Dog-Related Apps

Apps for dog owners and dog lovers.

### GET LUCKY

Random and experimental apps discovered through serendipity.

## Contributing

Apps are generated via the Jules App Factory pipeline. See:
`/Users/z/Developer/spike-land-app-factory/JULES.md`

## License

MIT - See main repository license.
