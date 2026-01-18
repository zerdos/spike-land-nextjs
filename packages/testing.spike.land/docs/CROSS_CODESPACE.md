# Cross-CodeSpace Imports

This document explains how to import components from one codeSpace into another,
enabling component reuse and modular application development.

---

## Table of Contents

- [Overview](#overview)
- [Import Syntax](#import-syntax)
- [How It Works](#how-it-works)
- [Live Refresh Dependencies](#live-refresh-dependencies)
- [Use Cases](#use-cases)
- [Limitations](#limitations)

---

## Overview

spike.land supports importing components between codeSpaces, allowing you to:

- **Reuse components**: Create a library of reusable UI components
- **Build modular apps**: Split complex applications into manageable pieces
- **Share code**: Import components created by others
- **Live updates**: Changes to imported components reflect immediately

### Key Concept

Each codeSpace exports a **default React component**. This component can be
imported by other codeSpaces using the `/live/` URL prefix.

---

## Import Syntax

### Basic Import

```tsx
// Import another codeSpace's default export
import ComponentName from "/live/codespace-name";

// Use in your component
export default function App() {
  return (
    <div>
      <ComponentName />
    </div>
  );
}
```

### Multiple Imports

```tsx
import Footer from "/live/shared-footer";
import Header from "/live/shared-header";
import Sidebar from "/live/shared-sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4">
          Content goes here
        </main>
      </div>
      <Footer />
    </div>
  );
}
```

### With Props

```tsx
import Card from "/live/card-component";

export default function Gallery() {
  const items = [
    { title: "Item 1", description: "First item" },
    { title: "Item 2", description: "Second item" },
    { title: "Item 3", description: "Third item" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {items.map((item, i) => <Card key={i} title={item.title} description={item.description} />)}
    </div>
  );
}
```

---

## How It Works

### URL Resolution

The `/live/` prefix is preserved during import transformation:

```typescript
// This import is NOT transformed by importMapReplace
import Component from "/live/other-codespace";

// It resolves to:
// https://testing.spike.land/live/other-codespace
```

### Server-Side Resolution

When the browser requests `/live/other-codespace`:

1. The server identifies this as a codeSpace request
2. Loads the codeSpace session from Durable Object
3. Returns the transpiled JavaScript module
4. The module exports the default component

### Response Format

```javascript
// /live/other-codespace returns something like:
/** importMapReplace */
import { useState } from "/reactMod.mjs";

export default function OtherComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(s => s + 1)}>{state}</button>;
}
```

---

## Live Refresh Dependencies

### Automatic Updates

When an imported codeSpace changes:

1. The source codeSpace broadcasts a WebSocket update
2. Connected clients receive the update notification
3. The importing codeSpace re-imports the module
4. Components re-render with the updated code

### Dependency Graph

spike.land tracks import relationships:

```
app-page
├── imports: /live/header
├── imports: /live/footer
└── imports: /live/sidebar
    └── imports: /live/nav-item
```

When `nav-item` changes, both `sidebar` and `app-page` receive updates.

### WebSocket Connection

Each codeSpace maintains a WebSocket connection for live updates:

```typescript
// Connection established to:
wss://testing.spike.land/live/{codeSpace}/websocket

// Update messages contain:
{
  type: "session-update",
  codeSpace: string,
  session: ICodeSession
}
```

---

## Use Cases

### Use Case 1: Component Library

Create reusable UI components:

**button-component** codeSpace:

```tsx
export default function Button({ children, variant = "primary", onClick }) {
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded font-medium ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
```

**app** codeSpace:

```tsx
import Button from "/live/button-component";

export default function App() {
  return (
    <div className="p-4 space-x-2">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete</Button>
    </div>
  );
}
```

### Use Case 2: Shared Layout

Create a shared layout for multiple pages:

**shared-layout** codeSpace:

```tsx
export default function Layout({ children, title }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
```

**home-page** codeSpace:

```tsx
import Layout from "/live/shared-layout";

export default function HomePage() {
  return (
    <Layout title="Home">
      <p className="text-gray-600">Welcome to the home page!</p>
    </Layout>
  );
}
```

### Use Case 3: Widget Embedding

Embed interactive widgets:

**counter-widget** codeSpace:

```tsx
export default function CounterWidget() {
  const [count, setCount] = useState(0);

  return (
    <div className="inline-flex items-center gap-2 p-2 bg-white rounded shadow">
      <button
        onClick={() => setCount(c => c - 1)}
        className="w-8 h-8 bg-red-100 rounded"
      >
        -
      </button>
      <span className="w-8 text-center font-bold">{count}</span>
      <button
        onClick={() => setCount(c => c + 1)}
        className="w-8 h-8 bg-green-100 rounded"
      >
        +
      </button>
    </div>
  );
}
```

**dashboard** codeSpace:

```tsx
import ChartWidget from "/live/chart-widget";
import CounterWidget from "/live/counter-widget";
import StatsWidget from "/live/stats-widget";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <CounterWidget />
      <ChartWidget />
      <StatsWidget />
    </div>
  );
}
```

---

## Limitations

### No Named Exports

Only the default export is accessible:

```tsx
// In source codeSpace
export default function Main() { ... }  // ✅ Accessible
export function Helper() { ... }         // ❌ NOT accessible

// In consuming codeSpace
import Main from "/live/source";         // ✅ Works
import { Helper } from "/live/source";   // ❌ Error
```

### No TypeScript Types

Cross-codeSpace imports don't include TypeScript definitions:

```tsx
// Types are not available
import Component from "/live/typed-component";
// Props will be typed as 'any'
```

### Circular Dependencies

Avoid circular imports between codeSpaces:

```tsx
// codeSpace A imports B
import B from "/live/b";

// codeSpace B imports A
import A from "/live/a"; // ⚠️ May cause issues
```

### Same-Origin Policy

Cross-codeSpace imports work within the same spike.land instance:

```tsx
// ✅ Works (same origin)
import Component from "/live/other-codespace";

// ❌ Cannot import from different spike.land instances
import Component from "https://other.spike.land/live/component";
```

### State Isolation

Each imported component has isolated state:

```tsx
// counter-widget maintains its own state
// Multiple instances don't share state
<CounterWidget />  // State: 0
<CounterWidget />  // State: 0 (independent)
```

---

## Best Practices

### 1. Keep Imports Stable

Avoid changing the codeSpace name of components that are widely used.

### 2. Document Props

Include comments describing expected props:

```tsx
/**
 * Button component
 * @param children - Button text
 * @param variant - "primary" | "secondary" | "danger"
 * @param onClick - Click handler
 */
export default function Button({ children, variant = "primary", onClick }) {
  // ...
}
```

### 3. Handle Missing Components

Consider fallback rendering:

```tsx
import { lazy, Suspense } from "react";

const DynamicComponent = lazy(() => import("/live/optional-component"));

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DynamicComponent />
    </Suspense>
  );
}
```

### 4. Minimize Dependencies

Keep codeSpaces focused and minimize their dependency chains.

---

## Related Documentation

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) - Import rules and syntax
- [TRANSPILATION_PIPELINE.md](./TRANSPILATION_PIPELINE.md) - How /live/ URLs are handled
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
