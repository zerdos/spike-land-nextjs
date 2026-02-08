---
applyTo: "packages/shared/**"
---

# Shared Package Standards

## Purpose

The `@spike-npm-land/shared` package contains code shared between the web app and workers:

- TypeScript types and interfaces
- Constants and enums
- Zod validation schemas
- Utility functions

## Build

- Uses `tsup` for building (see `tsup.config.ts`)
- Build: `yarn workspace @spike-npm-land/shared build`
- Watch: `yarn workspace @spike-npm-land/shared dev`
- Output goes to `dist/`

## Guidelines

- Keep dependencies minimal — this package is used by both Node.js and Workers
- Export types from `src/types/`
- Export Zod schemas from `src/validations/`
- Export constants from `src/constants/`
- All exports must be listed in `package.json` exports field
- No side effects — pure functions and type definitions only
