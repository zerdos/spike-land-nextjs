# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application with TypeScript, Tailwind CSS 4, and shadcn/ui components. It uses the App Router architecture and React Server Components (RSC).

## Development Commands

- **Start dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Lint**: `npm run lint`

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **UI Components**: shadcn/ui (New York style variant)
- **Fonts**: Geist Sans and Geist Mono (via next/font)

### Directory Structure
```
src/
├── app/               # Next.js App Router pages and layouts
│   ├── layout.tsx     # Root layout with fonts and metadata
│   ├── page.tsx       # Home page
│   └── globals.css    # Global styles and Tailwind imports
├── components/        # React components
│   └── ui/            # shadcn/ui components (button, card, etc.)
└── lib/
    └── utils.ts       # Utility functions (cn helper for class merging)
```

### shadcn/ui Configuration
The project uses shadcn/ui with the following configuration (components.json):
- **Style**: new-york
- **RSC**: Enabled (React Server Components)
- **Base color**: neutral
- **CSS variables**: Enabled
- **Path aliases**:
  - `@/components` → src/components
  - `@/ui` → src/components/ui
  - `@/lib` → src/lib
  - `@/hooks` → src/hooks
  - `@/utils` → src/lib/utils

### Styling System
- Tailwind CSS uses HSL-based CSS variables for theming (defined in globals.css)
- Dark mode is configured with class-based strategy
- Custom border radius values use CSS variables (--radius)
- Use the `cn()` utility from `@/lib/utils` to merge Tailwind classes

### Adding shadcn/ui Components
When adding new shadcn/ui components, they should be placed in `src/components/ui/` and follow the established patterns using the configured path aliases.
