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

**Related Files Updated**:

- `src/app/api/orbit/assets/upload/route.ts` - replaced sharp with header parser
- `package.json` - removed sharp from dependenciesMeta
- `next.config.ts` - removed sharp from serverExternalPackages

---

### December 2025

#### DEC-001: No Sentry in Tech Stack

**Decision Date**: December 11, 2025 **Decision Maker**: Zoltan Erdos (CEO)
**Status**: ACTIVE

**Decision**: Sentry shall NOT be included in the Spike Land tech stack for
error tracking and monitoring.

**Rationale**:

- Alternative monitoring solutions are preferred
- Vercel Analytics and built-in logging provide sufficient observability
- Cost optimization consideration
- Reduced external dependencies

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

- DEC-001: No Sentry in tech stack
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

## Related Documentation

| Document                                         | Description                             |
| ------------------------------------------------ | --------------------------------------- |
| [ZOLTAN_ERDOS.md](./ZOLTAN_ERDOS.md)             | Founder profile, background, and vision |
| [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md) | Company legal structure                 |

---

**Document Owner**: [Zoltan Erdos](./ZOLTAN_ERDOS.md) (CEO) | **Last Updated**:
January 29, 2026 | **Version**: 1.1
