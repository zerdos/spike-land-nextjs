# CEO Decisions - Spike Land Platform

> **Purpose**: This document records strategic decisions made by the CEO (Zoltan
> Erdos) for the Spike Land platform. These decisions guide development
> priorities, technology choices, and business direction.

---

## Decision Log

### January 2026

#### DEC-003: No Sharp Dependency - Client-Side Image Optimization

**Decision Date**: January 29, 2026 **Decision Maker**: Zoltan Erdos (CEO)
**Status**: ACTIVE

**Decision**: Sharp shall NOT be used as a direct dependency for image
processing. All image optimization happens client-side, and server-side
dimension extraction uses lightweight header parsing instead.

**Rationale**:

- Sharp is a native Node.js module (~50MB+) with platform-specific binaries
- Causes issues with Yarn PnP's zero-install approach
- Complicates CI/CD builds with native compilation requirements
- Lightweight header parsing is sufficient for dimension extraction
- Client-side processing already exists for resize/convert operations

**Technical Details**:

- Dimension extraction: `src/lib/images/image-dimensions.ts` (reads PNG/JPEG/WebP/GIF headers)
- Client-side processing: `src/lib/images/browser-image-processor.ts`
- Sharp remains as a transitive dependency of Next.js but is not directly used

**Impact**:

- Eliminates ~50MB+ native dependency from direct usage
- Simpler deployments (no native binary concerns)
- Better Yarn PnP compatibility
- Faster CI/CD builds
- No platform-specific build issues

**Update (February 2026)**: Extended to cover image enhancement comparison.
When the slider shows original vs enhanced, both images must be at matching
standard ARs. Rather than adding sharp for server-side cropping, the browser
upload now resizes originals to exact standard 1K dimensions (e.g., 1376x768
for 16:9). This ensures Gemini receives and returns standard dimensions,
eliminating AR mismatches in the comparison slider.

**Related Files Updated**:

- `src/app/api/orbit/assets/upload/route.ts` - replaced sharp with header parser
- `package.json` - removed sharp from dependenciesMeta
- `next.config.ts` - removed sharp from serverExternalPackages
- `src/lib/ai/aspect-ratio.ts` - added STANDARD_1K_DIMENSIONS map
- `src/lib/images/browser-image-processor.ts` - uses exact standard 1K dims
- `src/components/enhance/ImageComparisonSlider.tsx` - simplified to object-cover

---

### December 2025

#### DEC-001: No Sentry in Tech Stack

**Decision Date**: December 11, 2025 **Decision Maker**: Zoltan Erdos (CEO)
**Status**: SUPERSEDED (February 2026)

**Decision**: Sentry shall NOT be included in the Spike Land tech stack for
error tracking and monitoring.

**Rationale**:

- Alternative monitoring solutions are preferred
- Vercel Analytics and built-in logging provide sufficient observability
- Cost optimization consideration
- Reduced external dependencies

**Superseded Note**: Sentry is now approved and integrated into the platform.
The SDK is disabled in development (`enabled: process.env.NODE_ENV === "production"`)
and trace sampling is set to 10% by default. See `sentry.server.config.ts`,
`sentry.edge.config.ts`, and `instrumentation-client.ts`.

**Impact**:

- Error tracking to use alternative approaches (Vercel Analytics, structured
  logging)
- Remove all Sentry references from documentation and code
- Update environment variable examples to exclude SENTRY_DSN

**Related Files Updated**:

- `docs/LAUNCH_CHECKLIST.md`
- `docs/LAUNCH_PLAN.md`
- `docs/best-practices/logging-monitoring.md`
- `docs/best-practices/error-handling.md`
- `.env.example`
- `src/lib/error-logger.ts`

---

#### DEC-002: Gemini Model for Image Enhancement

**Decision Date**: December 11, 2025 **Decision Maker**: Zoltan Erdos (CEO)
**Status**: ACTIVE

**Decision**: The official AI model for image enhancement in Pixel is
`gemini-3-pro-image-preview`. This model name is confirmed correct and exists in
the Google Gemini API.

**Rationale**:

- Model provides excellent image enhancement capabilities
- Supports multiple resolution tiers (1K, 2K, 4K)
- Reliable API performance with appropriate timeout handling (5 minutes)
- Cost-effective for the enhancement quality delivered

**Technical Details**:

- Model ID: `gemini-3-pro-image-preview`
- Location: `src/lib/ai/gemini-client.ts`
- Timeout: 5 minutes (300 seconds) - sufficient for 4K image processing
- API: Google Generative AI (@google/genai)

**Related Configuration**:

```typescript
// src/lib/ai/gemini-client.ts
export const DEFAULT_MODEL = "gemini-3-pro-image-preview";
export const GEMINI_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```

---

## Decision Categories

### Technology Decisions

- DEC-001: ~~No Sentry in tech stack~~ SUPERSEDED — Sentry now approved
- DEC-002: Gemini model for image enhancement
- DEC-003: No Sharp dependency - client-side image optimization

### Business Decisions

_(None recorded yet)_

### Product Decisions

_(None recorded yet)_

---

## How to Use This Document

1. **New Decisions**: Add new entries under the current month with incrementing
   IDs
2. **Format**: Use the template structure (Decision Date, Decision Maker,
   Status, Rationale, Impact)
3. **Updates**: If a decision is superseded, change status to SUPERSEDED and
   reference new decision
4. **Review**: Decisions should be reviewed quarterly for relevance

---

## Decision Template

```markdown
#### DEC-XXX: [Decision Title]

**Decision Date**: [Date] **Decision Maker**: [Name] ([Role]) **Status**: ACTIVE
| SUPERSEDED | UNDER_REVIEW

**Decision**: [Clear statement of what was decided]

**Rationale**:

- [Reason 1]
- [Reason 2]

**Impact**:

- [Impact 1]
- [Impact 2]

**Related Files Updated**:

- [File 1]
- [File 2]
```

---

## Agent Notes Registry

This section tracks agent-specific documentation and productivity notes. Each agent maintains their own notes file with health scores and experiences.

| Agent    | Notes Location                            | Last Updated | Health Score | Status |
| -------- | ----------------------------------------- | ------------ | ------------ | ------ |
| @copilot | [.copilot/notes.md](../.copilot/notes.md) | 2026-02-06   | 7/9          | Active |
| @jules   | [.jules/bolt.md](../.jules/bolt.md)       | 2024-05-22   | -            | Active |
| @claude  | _Not yet registered_                      | -            | -            | -      |

### Guidelines for Agent Notes

1. **Only the agent can modify their own notes**
2. **Health Score [1-9]**:
   - 1-3: Significant productivity issues (document blockers)
   - 4-6: Working but with friction points
   - 7-8: Productive with minor issues
   - 9: Optimal productivity (we'll investigate why you're delulu 😄)
3. **Update frequency**: After significant work or when productivity changes
4. **Content**: Experiences, learnings, challenges, recommendations for improvement

---

## Related Documentation

| Document                                         | Description                             |
| ------------------------------------------------ | --------------------------------------- |
| [ZOLTAN_ERDOS.md](./ZOLTAN_ERDOS.md)             | Founder profile, background, and vision |
| [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md) | Company legal structure                 |

---

**Document Owner**: [Zoltan Erdos](./ZOLTAN_ERDOS.md) (CEO) | **Last Updated**:
February 6, 2026 | **Version**: 1.2
