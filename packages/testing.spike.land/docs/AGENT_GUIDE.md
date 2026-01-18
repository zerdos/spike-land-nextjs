# Agent Guide for testing.spike.land

This is the **primary reference document** for AI agents (Claude, GPT) working with
the spike.land codeSpace system. Follow these rules and recipes to effectively
create, modify, and deploy code in codeSpaces.

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Rules](#rules)
- [MCP Workflow](#mcp-workflow)
- [Recipes](#recipes)
- [File Structure](#file-structure)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Core Concepts

### What is a codeSpace?

A **codeSpace** is a collaborative, real-time code editing environment that:

- Contains React/JSX code that renders in the browser
- Auto-transpiles TypeScript/JSX to browser-compatible JavaScript
- Persists state via Cloudflare Durable Objects
- Supports live updates via WebSocket connections
- Can import components from other codeSpaces

### Key URLs

| Endpoint                                                | Purpose                 |
| ------------------------------------------------------- | ----------------------- |
| `https://testing.spike.land/live/{codeSpace}`           | View rendered codeSpace |
| `https://testing.spike.land/live/{codeSpace}/code`      | View raw code           |
| `https://testing.spike.land/live/{codeSpace}/mcp`       | MCP API endpoint        |
| `https://testing.spike.land/live/{codeSpace}/htm`       | Server-rendered HTML    |
| `https://testing.spike.land/live/{codeSpace}/index.css` | Generated CSS           |

---

## Rules

### RULE 1: Use Tailwind CSS Only

**NEVER** use inline styles or CSS-in-JS. **ALWAYS** use Tailwind CSS classes.

```tsx
// CORRECT
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// INCORRECT - inline styles
<div style={{ display: 'flex', padding: '16px' }}>

// INCORRECT - CSS-in-JS
<div css={{ display: 'flex' }}>
```

### RULE 2: Export Default Function Component

Every codeSpace must export a default React function component:

```tsx
// CORRECT - named function export
export default function MyComponent() {
  return <div className="p-4">Hello</div>;
}

// CORRECT - arrow function export
export default () => <div className="p-4">Hello</div>;

// INCORRECT - named export
export function MyComponent() { ... }

// INCORRECT - class component
export default class MyComponent extends React.Component { ... }
```

### RULE 3: React is Implicit

Do not import React - it is automatically available:

```tsx
// CORRECT - React hooks work without import
export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// UNNECESSARY - React is already available
import React, { useState } from "react";
```

### RULE 4: Import External Libraries via esm.sh

Import npm packages - they are automatically transformed to CDN URLs:

```tsx
// CORRECT - bare imports work
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

// The transpiler converts these to:
// import { motion } from "/framer-motion?bundle=true&external=react,react-dom,...";
```

### RULE 5: Import Local Components with @/ Alias

Use the `@/` alias for internal imports:

```tsx
// CORRECT - @/ alias for internal files
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// These resolve to bundled .mjs files
```

### RULE 6: Import Other CodeSpaces with /live/

To import a component from another codeSpace:

```tsx
// Import another codeSpace's default export
import OtherComponent from "/live/other-codespace";

// Use in your component
export default function App() {
  return (
    <div>
      <OtherComponent />
    </div>
  );
}
```

---

## MCP Workflow

### The Simple Rule

**Just use `edit_code` directly.** Auto-transpilation handles the rest.

When you modify code via MCP tools, the system automatically:

1. Validates your code
2. Transpiles TypeScript/JSX to JavaScript
3. Applies import map transformations
4. Broadcasts to connected clients
5. Updates the live preview

### Available MCP Tools

| Tool                 | Purpose               | When to Use                         |
| -------------------- | --------------------- | ----------------------------------- |
| `read_code`          | Get current code      | Before making changes               |
| `read_html`          | Get rendered HTML     | Check rendering output              |
| `read_session`       | Get all session data  | Debugging                           |
| `edit_code`          | Line-based edits      | Most efficient for targeted changes |
| `search_and_replace` | Pattern replacement   | Simple text replacements            |
| `update_code`        | Full code replacement | Complete rewrites only              |
| `find_lines`         | Find line numbers     | Before using edit_code              |

### Recommended Workflow

```
1. read_code        → Understand current state
2. find_lines       → Locate code to modify (if needed)
3. edit_code        → Make precise changes
4. (auto-transpile) → System handles this
5. read_html        → Verify output (optional)
```

---

## Recipes

### Recipe: Create a New Component

```tsx
// Use edit_code with full replacement for new codeSpaces
export default function MyNewComponent() {
  const [state, setState] = useState("initial");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          My Component
        </h1>
        <p className="text-gray-600">{state}</p>
      </div>
    </div>
  );
}
```

### Recipe: Add Interactivity

```tsx
export default function InteractiveComponent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  const handleAdd = () => {
    setItems([...items, `Item ${items.length + 1}`]);
  };

  return (
    <div className="p-6 space-y-4">
      <button
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Count: {count}
      </button>

      <button
        onClick={handleAdd}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Add Item
      </button>

      <ul className="space-y-2">
        {items.map((item, i) => <li key={i} className="p-2 bg-white rounded shadow">{item}</li>)}
      </ul>
    </div>
  );
}
```

### Recipe: Add Animation with Framer Motion

```tsx
import { AnimatePresence, motion } from "framer-motion";

export default function AnimatedComponent() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="p-8">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-4 px-4 py-2 bg-purple-500 text-white rounded"
      >
        Toggle
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-white rounded-lg shadow-lg"
          >
            Animated content!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Recipe: Import from Another CodeSpace

```tsx
// Import a component from another codeSpace
import Footer from "/live/my-footer";
import Header from "/live/my-header";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-4">
        Content here
      </main>
      <Footer />
    </div>
  );
}
```

### Recipe: Deploy Self-Contained HTML

To create a standalone HTML file and deploy to R2:

1. The `getSpeedy2()` function builds and uploads:
   - Fetches all code dependencies
   - Inlines CSS and JavaScript
   - Uploads to `/live-cms/{codeSpace}.html`

2. Alternative using `useSpeedy()` for versioned archives:
   - Creates MD5-hashed versions
   - Uploads to `/my-cms/{hash}/{codeSpace}.html`

---

## File Structure

### CodeSpace Session Data

Each codeSpace stores:

```typescript
interface ICodeSession {
  codeSpace: string; // Unique identifier
  code: string; // Source TypeScript/JSX
  transpiled: string; // Compiled JavaScript
  html: string; // Server-rendered HTML
  css: string; // Extracted CSS
}
```

### Import Transformations

The `importMapReplace` function transforms imports:

| Original Import                 | Transformed To                                  |
| ------------------------------- | ----------------------------------------------- |
| `from "react"`                  | `from "/reactMod.mjs"`                          |
| `from "framer-motion"`          | `from "/@/workers/framer-motion.mjs"`           |
| `from "@/components/ui/button"` | `from "/@/components/ui/button.mjs"`            |
| `from "lodash"`                 | `from "/lodash?bundle=true&external=react,..."` |
| `from "/live/other"`            | Unchanged (cross-codeSpace)                     |

---

## Common Patterns

### Responsive Layout

```tsx
export default function ResponsiveLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile-first responsive grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card />
          <Card />
          <Card />
        </div>
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-2">Card Title</h3>
      <p className="text-gray-600">Card content</p>
    </div>
  );
}
```

### Form with Validation

```tsx
export default function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email.includes("@")) newErrors.email = "Invalid email";
    if (!formData.message) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log("Form submitted:", formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
}
```

### Dark Mode Support

```tsx
export default function DarkModeComponent() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded bg-gray-200 dark:bg-gray-700"
        >
          {isDark ? "🌞" : "🌙"}
        </button>
        <p className="text-gray-900 dark:text-white">
          This text adapts to dark mode
        </p>
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Component Not Rendering

**Cause**: Missing default export or syntax error
**Solution**: Ensure you have `export default function` or `export default () =>`

### Issue: Styles Not Applied

**Cause**: Using inline styles instead of Tailwind
**Solution**: Replace `style={{}}` with `className=""`

### Issue: Import Not Found

**Cause**: Incorrect import path
**Solution**:

- Use bare imports for npm packages: `from "package-name"`
- Use `@/` for internal components: `from "@/components/..."`
- Use `/live/` for other codeSpaces: `from "/live/other-codespace"`

### Issue: TypeScript Errors

**Cause**: Type issues in source code
**Solution**: The transpiler is forgiving, but ensure valid JSX syntax

### Issue: Changes Not Appearing

**Cause**: Cache or WebSocket disconnect
**Solution**: Refresh the page or reconnect via MCP

---

## Related Documentation

- [TRANSPILATION_PIPELINE.md](./TRANSPILATION_PIPELINE.md) - How code is transformed
- [SELF_CONTAINED_HTML.md](./SELF_CONTAINED_HTML.md) - Building standalone HTML
- [CROSS_CODESPACE.md](./CROSS_CODESPACE.md) - Importing between codeSpaces
- [MCP_TOOLS.md](./MCP_TOOLS.md) - Complete MCP tool reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
