# Self-Improving Agent Loop for `/create/[...]` App Generation

## Executive Summary

Replace the current single-shot Gemini 3 Flash API call with a **Claude Opus 4.6 agent loop** that generates React apps through an iterative Generate → Transpile → Verify → Fix → Learn cycle. Every mistake the agent makes gets recorded as a **learning note** — over time the system accumulates institutional knowledge that makes future generations smarter, creating a data flywheel moat.

---

## Architecture Overview

```
User Request → SSE Endpoint → Agent Loop → Codespace API → Published App
                                  ↑                ↓
                              Learning Notes ← Error Detection
```

### Core Loop (State Machine)

```
PLANNING → GENERATING → TRANSPILING → VERIFYING → PUBLISHED
              ↑              ↓
              ← FIXING ←─────┘ (max 3 iterations)
                   ↓
               LEARNING (extract note from error+fix pair)
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI SDK | Anthropic SDK directly | Full control over tool_use, caching, streaming |
| Codespace API | REST (not MCP transport) | Simpler; MCP adds JSON-RPC overhead for single-tool use |
| Claude calls | Non-streaming within loop | Need complete response to extract tool calls |
| Note storage | PostgreSQL (Prisma) | Serverless on Vercel — no filesystem persistence |
| Model strategy | Opus for generation, Sonnet for fixes | Cost optimization: fixes are simpler tasks |
| Max iterations | 3 fix attempts | Diminishing returns: 92-95% success by iteration 3 |
| Note token budget | 300-800 tokens max | Prevents attention dilution (from blog: irrelevant context degrades softmax) |
| Cache strategy | Stable system prompt prefix + dynamic notes suffix | KV cache hit on prefix (10x cheaper per blog article) |

---

## Phase 1: Core Agent Loop (Priority: P0)

### 1.1 New File: `src/lib/create/agent-loop.ts`

The heart of the system — an async generator that yields SSE events while orchestrating the agent.

```typescript
// State machine for the agent loop
type AgentState = 'PLANNING' | 'GENERATING' | 'TRANSPILING' | 'VERIFYING' | 'FIXING' | 'LEARNING' | 'PUBLISHED' | 'FAILED';

interface AgentContext {
  slug: string;
  path: string[];
  codespaceId: string;
  codespaceUrl: string;
  state: AgentState;
  iteration: number;
  maxIterations: number; // default: 3
  currentCode: string | null;
  errors: TranspileError[];
  notesApplied: string[]; // IDs of notes used in this generation
  startTime: number;
}

async function* agentGenerateApp(slug, path, userId): AsyncGenerator<ExtendedStreamEvent> {
  const ctx: AgentContext = { /* init */ };
  const notes = await retrieveRelevantNotes(path, slug); // Phase 2

  // PLANNING: Assemble context-engineered prompt
  yield { type: 'phase', phase: 'PLANNING', message: 'Assembling context...' };
  const systemPrompt = buildAgentSystemPrompt(notes); // Cached prefix
  const userPrompt = buildAgentUserPrompt(path, slug); // Dynamic suffix

  // GENERATING: Call Claude Opus 4.6
  yield { type: 'phase', phase: 'GENERATING', message: 'Generating app...' };
  ctx.currentCode = await callClaude(systemPrompt, userPrompt, 'opus');

  while (ctx.iteration < ctx.maxIterations) {
    // TRANSPILING: Push to codespace
    yield { type: 'phase', phase: 'TRANSPILING', message: `Transpiling (attempt ${ctx.iteration + 1})...` };
    const result = await updateCodespace(ctx.codespaceId, ctx.currentCode);

    if (result.success) {
      // VERIFYING: Check for runtime errors (Phase 3 enhancement)
      yield { type: 'phase', phase: 'PUBLISHED', message: 'App published!' };

      // Record success for note effectiveness tracking
      await recordSuccess(ctx.notesApplied);

      return yield { type: 'complete', slug, url: ctx.codespaceUrl, /* ... */ };
    }

    // FIXING: Ask Claude to fix the error
    yield { type: 'phase', phase: 'FIXING', message: `Fixing: ${result.error?.slice(0, 100)}...` };
    ctx.errors.push({ code: ctx.currentCode, error: result.error!, iteration: ctx.iteration });

    const fixedCode = await callClaude(
      systemPrompt,
      buildFixPrompt(ctx.currentCode, result.error!, ctx.errors),
      'sonnet' // Use cheaper model for fixes
    );

    if (fixedCode) {
      ctx.currentCode = fixedCode;
    }

    ctx.iteration++;

    // LEARNING: Extract lesson from this error
    yield { type: 'phase', phase: 'LEARNING', message: 'Recording lesson learned...' };
    await extractAndSaveNote(ctx.currentCode, result.error!, fixedCode, path);
  }

  // Exhausted iterations — publish best attempt, mark as degraded
  yield { type: 'error', message: 'Max fix attempts reached', codespaceUrl: ctx.codespaceUrl };
}
```

### 1.2 New File: `src/lib/create/agent-client.ts`

Thin wrapper around Anthropic SDK with KV cache optimization.

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Cache-optimized call structure (per blog article):
// - system prompt = stable prefix → gets KV cached (10x cheaper)
// - notes + user request = dynamic suffix → computed fresh each call
async function callClaude(
  systemPrompt: string,    // Cached prefix
  userPrompt: string,      // Dynamic suffix
  model: 'opus' | 'sonnet' = 'opus'
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: model === 'opus' ? 'claude-opus-4-6' : 'claude-sonnet-4-5-20250929',
    max_tokens: 32768,
    system: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract code from response (between ```tsx fences or raw)
  return extractCodeFromResponse(response);
}
```

### 1.3 New File: `src/lib/create/agent-prompts.ts`

Context-engineered prompt assembly following the 5-layer stack from the blog.

```typescript
// Layer 1: IDENTITY — Who the agent is
// Layer 2: KNOWLEDGE — Learning notes (dynamic, retrieved per-request)
// Layer 3: EXAMPLES — Best-practice code patterns
// Layer 4: CONSTRAINTS — What NOT to do (from accumulated errors)
// Layer 5: TOOLS — Available actions (codespace API)

function buildAgentSystemPrompt(notes: LearningNote[]): string {
  // STABLE PREFIX (cacheable) — Layers 1, 3, 5
  const identity = AGENT_IDENTITY; // ~200 tokens, never changes
  const corePrompt = CORE_PROMPT;  // Reuse existing ~500 line React/Tailwind spec
  const toolSpec = TOOL_SPEC;      // Codespace API description

  // DYNAMIC SUFFIX — Layers 2, 4 (notes)
  const noteBlock = formatNotes(notes); // 300-800 tokens max

  return `${identity}\n\n${corePrompt}\n\n${toolSpec}\n\n${noteBlock}`;
}

function formatNotes(notes: LearningNote[]): string {
  if (notes.length === 0) return '';

  // Sort by confidence score (Bayesian), take top N that fit in token budget
  const sorted = notes.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const selected = fitWithinTokenBudget(sorted, 800); // max 800 tokens

  return `## Lessons Learned (from previous generations)\n\n${
    selected.map(n => `- **${n.trigger}**: ${n.lesson} (confidence: ${(n.confidenceScore * 100).toFixed(0)}%)`).join('\n')
  }`;
}
```

### 1.4 Modify: `src/app/api/create/stream/route.ts`

Replace `generateStream()` internals with the agent loop.

**Changes:**
- Import `agentGenerateApp` from `./agent-loop`
- Replace the body of `generateStream()` to delegate to `agentGenerateApp()`
- Increase `maxDuration` from 60 to 120 (agent loop needs more time)
- Keep all existing rate limiting, dedup, and SSE infrastructure

```typescript
// Before:
const { content, rawCode, error: genError } = await generateAppContent(path);

// After:
yield* agentGenerateApp(slug, path, userId);
```

### 1.5 Modify: `src/lib/create/types.ts`

Extend StreamEvent for richer agent feedback.

```typescript
export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "phase"; phase: string; message: string; iteration?: number }
  | { type: "code_generated"; codePreview: string } // first 200 chars
  | { type: "error_detected"; error: string; iteration: number }
  | { type: "error_fixed"; iteration: number }
  | { type: "learning"; notePreview: string } // "Learned: with framer-motion, always..."
  | { type: "complete"; slug: string; url: string; title: string; description: string; relatedApps: string[] }
  | { type: "error"; message: string; codespaceUrl?: string };
```

---

## Phase 2: Self-Improving Memory System (Priority: P0)

### 2.1 New Prisma Models

Add to `prisma/schema.prisma`:

```prisma
model AgentLearningNote {
  id              String   @id @default(cuid())

  // What triggers this note
  trigger         String   // e.g., "framer-motion AnimatePresence"
  triggerType     String   // "library" | "pattern" | "error_class" | "component_type"

  // The lesson
  lesson          String   // e.g., "Always wrap children in motion.div with exit prop"

  // Matching criteria (for retrieval)
  libraries       String[] // ["framer-motion", "react"]
  errorPatterns   String[] // ["Cannot read property 'exit'", "AnimatePresence requires"]
  tags            String[] // ["animation", "layout", "react"]

  // Effectiveness tracking (Bayesian)
  helpCount       Int      @default(0)  // Times this note prevented an error
  failCount       Int      @default(0)  // Times this note was applied but error still occurred
  confidenceScore Float    @default(0.5) // (helpCount + 1) / (helpCount + failCount + 2)

  // Lifecycle
  status          String   @default("CANDIDATE") // CANDIDATE → ACTIVE → DEPRECATED

  // Source
  sourceSlug      String?  // App that triggered creation
  sourceError     String?  // Original error message
  sourceFix       String?  // Code diff that fixed it

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
  @@index([tags], type: Gin)
  @@index([libraries], type: Gin)
  @@index([triggerType])
}

model GenerationAttempt {
  id              String   @id @default(cuid())
  slug            String

  // Outcome
  success         Boolean
  iterations      Int      // How many fix loops
  totalDurationMs Int

  // What notes were used
  notesApplied    String[] // AgentLearningNote IDs

  // Errors encountered
  errors          Json[]   // Array of { error, iteration, fixed }

  // Model used
  model           String   // "opus" | "sonnet"
  inputTokens     Int
  outputTokens    Int
  cachedTokens    Int      @default(0)

  createdAt       DateTime @default(now())

  @@index([slug])
  @@index([createdAt])
}
```

### 2.2 New File: `src/lib/create/agent-memory.ts`

Note CRUD, retrieval, and effectiveness tracking.

```typescript
// Retrieve relevant notes for a generation request
async function retrieveRelevantNotes(
  path: string[],
  slug: string
): Promise<LearningNote[]> {
  const keywords = extractKeywords(path); // Reuse existing keyword-utils.ts

  // Query notes matching libraries/tags from the request
  const notes = await prisma.agentLearningNote.findMany({
    where: {
      status: { in: ['ACTIVE', 'CANDIDATE'] },
      OR: [
        { libraries: { hasSome: keywords } },
        { tags: { hasSome: keywords } },
        { triggerType: 'universal' }, // Always-apply notes
      ],
    },
    orderBy: { confidenceScore: 'desc' },
    take: 20, // Retrieve more, then filter by token budget
  });

  return notes;
}

// Extract a learning note from an error → fix pair
async function extractAndSaveNote(
  failingCode: string,
  error: string,
  fixedCode: string | null,
  path: string[]
): Promise<void> {
  // Use Claude Haiku to extract structured lesson (cheap, fast)
  const lesson = await callClaude(
    NOTE_EXTRACTION_PROMPT,
    `Error: ${error}\n\nFailing code (excerpt): ${failingCode.slice(0, 2000)}\n\nFixed code (excerpt): ${fixedCode?.slice(0, 2000) || 'N/A'}`,
    'haiku'
  );

  // Parse and save
  const parsed = parseNoteFromAI(lesson);
  if (parsed) {
    // Check for duplicate/similar notes before creating
    const existing = await findSimilarNote(parsed.trigger, parsed.libraries);
    if (existing) {
      // Reinforce existing note
      await prisma.agentLearningNote.update({
        where: { id: existing.id },
        data: { helpCount: { increment: 1 }, updatedAt: new Date() },
      });
    } else {
      await prisma.agentLearningNote.create({ data: parsed });
    }
  }
}

// Update note effectiveness after generation completes
async function recordSuccess(noteIds: string[]): Promise<void> {
  await prisma.agentLearningNote.updateMany({
    where: { id: { in: noteIds } },
    data: { helpCount: { increment: 1 } },
  });
  // Recalculate confidence scores
  for (const id of noteIds) {
    await recalculateConfidence(id);
  }
}

async function recordFailure(noteIds: string[]): Promise<void> {
  await prisma.agentLearningNote.updateMany({
    where: { id: { in: noteIds } },
    data: { failCount: { increment: 1 } },
  });
  for (const id of noteIds) {
    await recalculateConfidence(id);
  }
}

// Bayesian confidence: Beta-binomial posterior
async function recalculateConfidence(noteId: string): Promise<void> {
  const note = await prisma.agentLearningNote.findUnique({ where: { id: noteId } });
  if (!note) return;

  const alpha = 1; // Prior
  const beta = 1;
  const score = (note.helpCount + alpha) / (note.helpCount + note.failCount + alpha + beta);

  let status = note.status;
  // Promote CANDIDATE → ACTIVE after 3+ helps with >0.6 confidence
  if (status === 'CANDIDATE' && note.helpCount >= 3 && score > 0.6) status = 'ACTIVE';
  // Demote to DEPRECATED if confidence drops below 0.3
  if (score < 0.3 && note.helpCount + note.failCount >= 5) status = 'DEPRECATED';

  await prisma.agentLearningNote.update({
    where: { id: noteId },
    data: { confidenceScore: score, status },
  });
}
```

---

## Phase 3: Enhanced Error Detection & Learning Pipeline (Priority: P1)

### 3.1 Structured Error Parsing

New file: `src/lib/create/error-parser.ts`

Parse transpilation errors into structured format for better note matching.

```typescript
interface StructuredError {
  type: 'transpile' | 'runtime' | 'type' | 'import';
  message: string;
  library?: string;      // Detected library causing the error
  component?: string;    // React component involved
  lineNumber?: number;
  suggestion?: string;   // If error message contains a suggestion
}

function parseTranspileError(rawError: string): StructuredError {
  // Pattern matching for common error types:
  // - Missing imports: "X is not defined"
  // - Type errors: "Type 'X' is not assignable to 'Y'"
  // - Module not found: "Could not resolve 'X'"
  // - JSX errors: "Unexpected token '<'"
  // Extract library name from import paths or error context
}
```

### 3.2 Runtime Verification (Future Enhancement)

After transpilation succeeds, optionally check for runtime errors by:
1. Fetching the codespace URL
2. Checking for console errors via the codespace API (if available)
3. Taking a screenshot via MCP `codespace_screenshot` to verify render

This is a Phase 3 enhancement — transpilation success is sufficient for MVP.

---

## Phase 4: Frontend Streaming UX (Priority: P1)

### 4.1 Update Client-Side Stream Consumer

Modify the existing create page to handle new event types:

```typescript
// New UI states based on extended StreamEvent:
// - "phase" events → Show current phase with iteration count
// - "error_detected" → Show error briefly (helps user understand the process)
// - "error_fixed" → Show "Fixed!" animation
// - "learning" → Show "Learned: ..." toast (builds trust in the system)
```

The existing SSE consumer in the create page just needs to handle the new event types — the `createSSEResponse()` function in `route.ts` already handles any JSON-serializable events.

---

## Phase 5: Observability & Monitoring (Priority: P2)

### 5.1 Metrics to Track

```typescript
// Key metrics (log via existing logger + Vercel analytics):
// - generation_success_rate: % of first-attempt successes
// - fix_iteration_distribution: histogram of iterations needed
// - note_hit_rate: % of generations that used ≥1 note
// - note_effectiveness: average confidence score of applied notes
// - time_to_publish: p50/p95/p99 latency
// - token_usage: input/output/cached per generation
// - cost_per_generation: calculated from token usage
```

### 5.2 Admin Dashboard (Future)

A `/admin/agent-learning` page showing:
- Note leaderboard (most effective notes)
- Generation success trend over time
- Error pattern distribution
- Token cost analysis

---

## Phase 6: Reliability & Safety (Priority: P1)

### 6.1 Circuit Breaker

If Claude API fails 3 times in 5 minutes, fall back to the existing Gemini generation path.

```typescript
// In agent-loop.ts:
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
  fallback: () => generateAppContent(path), // Existing Gemini path
});
```

### 6.2 Timeout Guards

- Overall generation timeout: 120s (Vercel function limit)
- Individual Claude call timeout: 45s
- Transpilation timeout: 10s
- If any timeout fires, save progress and yield error event

### 6.3 Content Security

- Keep existing slug-classifier.ts moderation (fix the fail-open bug)
- Add post-generation code scan for dangerous patterns (eval, document.cookie, fetch to external domains)
- Sanitize any user-influenced content before including in prompts

---

## Implementation Order

### Sprint 1 (Core — Must Ship Together)
1. **`src/lib/create/agent-client.ts`** — Anthropic SDK wrapper with cache optimization
2. **`src/lib/create/agent-prompts.ts`** — 5-layer prompt assembly
3. **`src/lib/create/agent-loop.ts`** — Core state machine
4. **Prisma migration** — `AgentLearningNote` + `GenerationAttempt` models
5. **`src/lib/create/agent-memory.ts`** — Note retrieval and storage
6. **Modify `src/lib/create/types.ts`** — Extended StreamEvent
7. **Modify `src/app/api/create/stream/route.ts`** — Wire in agent loop
8. **`src/lib/create/error-parser.ts`** — Structured error parsing

### Sprint 2 (Polish & Learn)
9. **Frontend streaming UX** — Handle new event types in create page
10. **Circuit breaker** — Fallback to Gemini on Claude failures
11. **Fix slug-classifier.ts** — Fail-closed on API error
12. **Note extraction prompt** — Tune the Haiku prompt for lesson quality
13. **Confidence recalculation cron** — Periodic batch update

### Sprint 3 (Optimize & Scale)
14. **Admin dashboard** — `/admin/agent-learning` page
15. **Runtime verification** — Screenshot-based render checking
16. **Token cost tracking** — Per-generation cost attribution
17. **A/B testing** — Compare agent vs Gemini quality metrics

---

## Environment Requirements

```bash
# New env vars needed:
ANTHROPIC_API_KEY=sk-ant-...  # Claude API key (already likely exists)
AGENT_MAX_ITERATIONS=3         # Default fix iterations
AGENT_NOTE_TOKEN_BUDGET=800    # Max tokens for notes in prompt
AGENT_FALLBACK_ENABLED=true    # Enable Gemini fallback circuit breaker
```

---

## Token Economics

| Metric | Gemini Flash (Current) | Claude Opus (Agent) | Notes |
|--------|----------------------|--------------------|----|
| Cost per generation | ~$0.003 | ~$0.14 (uncached) | 46x more expensive |
| With KV caching | N/A | ~$0.05 | 3x reduction from cache hits on system prompt |
| With Sonnet fixes | N/A | ~$0.07 avg | Opus for gen, Sonnet for 0-3 fixes |
| Quality | Good (zero-shot) | Excellent (iterative) | Agent can self-correct |
| Learning | None | Compounding | Gets cheaper/better over time as notes prevent errors |

**Break-even estimate**: After ~500 generations with accumulated notes, first-attempt success rate should be high enough that most generations need 0 fix iterations, bringing effective cost to ~$0.05/generation with significantly higher quality.

---

## Success Metrics

1. **First-attempt transpilation success rate**: Target 70% → 90% over 1000 generations
2. **Average fix iterations**: Target <1.2 per generation
3. **Note catalog size**: Target 50+ active notes within first month
4. **User-visible error rate**: Target <5% (apps that fail to publish)
5. **Time to publish**: Target p95 < 45s (vs current ~15s — acceptable tradeoff for quality)

---

## What We're NOT Doing

- No MCP transport (REST to codespace is simpler)
- No human-in-the-loop for notes (fully autonomous)
- No multi-file generation (single React component only)
- No real-time collaboration on generated code
- No model fine-tuning (notes + prompts are sufficient)
- No separate learning service (everything in the Next.js app)
- No vector embeddings for note retrieval (GIN indexes on arrays are sufficient for MVP)
