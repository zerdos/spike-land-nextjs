# AGENTS.md - Instructions for AI Coding Agents

This file provides context for AI coding agents (Jules, Claude, etc.) working on this codebase.

## Quick Reference

| Command                    | Purpose                            |
| -------------------------- | ---------------------------------- |
| `yarn install --immutable` | Install dependencies               |
| `yarn dev`                 | Start dev server                   |
| `yarn build`               | Production build                   |
| `yarn test:coverage`       | Run tests (100% coverage required) |
| `yarn lint`                | Check code style                   |
| `yarn db:generate`         | Generate Prisma client             |

## Project Structure

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **ORM**: Prisma
- **Testing**: Vitest + Playwright

## Key Directories

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # React components
│   └── ui/        # shadcn/ui primitives
├── lib/           # Utilities and business logic
└── test-utils/    # Test helpers and mocks

packages/
├── mcp-server/    # MCP server implementation
├── code/          # Code editor (Vite + Monaco)
└── shared/        # Shared types and utilities
```

## Code Patterns

### API Routes

```typescript
// Always use tryCatch for error handling
import { tryCatch } from "@/lib/try-catch";

// Use the singleton Prisma client
import prisma from "@/lib/prisma";

// Validate with Zod
import { z } from "zod";
```

### Testing

- Tests MUST achieve 100% coverage
- Place `.test.ts` files alongside source files
- Mock external dependencies, not internal modules
- Use `vi.mock()` for module mocking

### Commits

```bash
# Format: type(scope): description
git commit -m "feat(api): add user endpoint

Resolves #123"
```

## Before Completing a Task

1. [ ] Run `yarn test:coverage` - must pass with 100% coverage
2. [ ] Run `yarn lint` - must have no errors
3. [ ] Run `yarn build` - must succeed
4. [ ] PR title follows conventional commits format
5. [ ] PR body includes "Resolves #<issue-number>"

## Common Pitfalls

- **Don't use `npm`** - this project uses `yarn`
- **Don't create new files** unless necessary - prefer editing existing
- **Don't add dependencies** without justification
- **Don't modify migration files** - they are immutable
- **Don't skip tests** - 100% coverage is required
