# Spike Land API Versioning Strategy

> **Last Updated**: December 2025 **Status**: MVP Release - No explicit
> versioning yet **Document Version**: 1.0

## Table of Contents

1. [Current Status](#current-status)
2. [When Versioning Becomes Necessary](#when-versioning-becomes-necessary)
3. [Versioning Approach](#versioning-approach)
4. [What Constitutes Breaking Changes](#what-constitutes-breaking-changes)
5. [Deprecation Policy](#deprecation-policy)
6. [Migration Guidelines](#migration-guidelines)
7. [Version Management](#version-management)
8. [Current API Endpoints](#current-api-endpoints)

---

## Current Status

**The Spike Land API currently operates without explicit version numbers.**

### Current API Structure

All endpoints are accessed at `/api/*` without a version prefix:

```
GET    /api/images
POST   /api/images/upload
POST   /api/images/{id}/enhance
GET    /api/albums
POST   /api/albums
GET    /api/tokens/balance
POST   /api/vouchers/apply
```

### Why No Explicit Versioning Currently?

1. **Early Stage Platform** - Pixel app is MVP with evolving requirements
2. **Internal-First Development** - Built for controlled rollout
3. **Flexibility** - Can ship improvements without version bumps
4. **Simplicity** - Reduces complexity during rapid iteration

---

## When Versioning Becomes Necessary

Explicit API versioning will be implemented when:

1. **External API Availability** - Third-party developers integrate with Spike
   Land API
2. **Enterprise Customers** - B2B customers require stability guarantees
3. **Breaking Changes Required** - Fundamental API redesigns needed
4. **Multiple Product Versions** - Spike Land platform has multiple deployed
   versions

### Triggers for Versioning

```
If (breaking_change_required AND external_consumers > 0) {
  implement_versioning();
  announce_deprecation_timeline();
}
```

---

## Versioning Approach

### URL-Based Versioning (Adopted Strategy)

When versioning becomes necessary, we will adopt **URL-based versioning**:

```
/api/v1/images
/api/v1/albums
/api/v1/tokens

/api/v2/images     (new version with breaking changes)
/api/v2/albums
```

### Why URL-Based Versioning?

| Aspect        | URL-Based                       | Header-Based               | Query Param        |
| ------------- | ------------------------------- | -------------------------- | ------------------ |
| Clarity       | Clear API version in URL        | Not obvious to users       | Easy to miss       |
| CDN Caching   | Excellent (different URLs)      | Requires Vary headers      | Complex            |
| Documentation | Straightforward (separate docs) | Mixed documentation        | Confusing          |
| Debugging     | Easy to see in logs             | Requires header inspection | Not visible in URL |
| Adoption      | Common in REST APIs             | Less common                | Rare               |

**Decision**: URL-based versioning is the industry standard and easiest for
developers to understand and adopt.

### Version Numbering

- **Major versions**: `/api/v1`, `/api/v2` (breaking changes)
- **Minor versions**: No minor versioning in URL (shipped as improvements to
  major version)
- **Patch updates**: No patch versioning in URL (transparent fixes)

### Backward Compatibility Strategy

```
Release Timeline for Version Change:

Month 0: v1 stable, all new features target v1
         (No v2 yet)

Month 1: Breaking change identified → design v2
         Planning phase, no code changes to v1

Month 2: Pre-announcement
         Public notice: "v2 coming in 3 months"

Month 3: v2 release
         /api/v2/* endpoints available
         /api/v1/* continues to work (deprecated)

Month 4-8: Migration period (6 months)
         Both v1 and v2 available
         Deprecation headers on v1 responses
         Support for migration questions

Month 9: v1 sunset
         Endpoints removed
         Consumers must have migrated
```

---

## What Constitutes Breaking Changes

### Breaking Changes (Require Version Bump)

Changes that break client integrations:

#### 1. Removing Endpoints

```
BREAKING: DELETE /api/v1/images/{id} endpoint removed
SOLUTION: Migrate to /api/v2/images/{id} (returns 204 No Content)
```

#### 2. Removing Required Response Fields

```
// v1 response
{
  "id": "123",
  "url": "https://...",
  "status": "processing"  // Required field clients depend on
}

// v2 removes status field
{
  "id": "123",
  "url": "https://..."
}

BREAKING: Clients checking response.status will fail
```

#### 3. Changing Response Structure

```
// v1
POST /api/images/enhance
{
  "result": { "url": "..." }
}

// v2 flattens structure
{
  "url": "..."
}

BREAKING: Clients using response.result.url will fail
```

#### 4. Changing Required Parameters

```
// v1 - optional photo_type parameter
POST /api/images/enhance
{
  "imageId": "123",
  "tier": "TIER_1K",
  "photo_type": "landscape"  // optional
}

// v2 - photo_type becomes required
POST /api/images/enhance
{
  "imageId": "123",
  "tier": "TIER_1K",
  "photo_type": "landscape"  // REQUIRED
}

BREAKING: Existing requests without photo_type will fail
```

#### 5. Changing Authentication Requirements

```
// v1 - optional authentication
GET /api/albums/shared/abc123
(Works with or without Authorization header)

// v2 - authentication required
GET /api/albums/shared/abc123
(Returns 401 Unauthorized without Authorization header)

BREAKING: Public consumers need authentication
```

#### 6. Significant Rate Limit Changes

```
// v1
Rate limit: 10 requests/minute per user

// v2
Rate limit: 1 request/minute per user

BREAKING: Existing batch operations fail due to stricter limits
```

### Non-Breaking Changes (No Version Bump)

Changes that don't break existing integrations:

#### 1. Adding New Endpoints

```
// v1 - no batch endpoint
// v2 adds batch endpoint (v1 unaffected)
POST /api/v1/images/batch-enhance (NEW)
```

#### 2. Adding Optional Response Fields

```
// v1 response
{
  "id": "123",
  "url": "https://..."
}

// v2 adds new field (v1 still works)
{
  "id": "123",
  "url": "https://...",
  "processing_time_ms": 1234  // NEW FIELD
}

NOT BREAKING: Existing clients ignore new field
```

#### 3. Adding Optional Parameters

```
// v1 endpoint
POST /api/images/enhance

// Enhanced with optional parameter (v1 still works)
POST /api/images/enhance?include_metadata=true
POST /api/images/enhance?prefer_format=webp
```

#### 4. Improving Error Messages

```
// v1
{
  "error": "Invalid request"
}

// v2 provides more detail
{
  "error": "Invalid request",
  "details": "imageId is required",
  "error_code": "MISSING_IMAGE_ID"
}

NOT BREAKING: Error structure unchanged, just more detail
```

#### 5. Performance Improvements

```
// v1 - takes 2 seconds to enhance image
// v2 - takes 0.5 seconds (optimized)

NOT BREAKING: Response format identical, just faster
```

#### 6. Adding New Optional Error Fields

```
// v1 error
{
  "error": "Token limit exceeded"
}

// v2 adds helpful info
{
  "error": "Token limit exceeded",
  "current_balance": 0,
  "required_tokens": 5,
  "can_purchase": true
}

NOT BREAKING: Clients can ignore new fields
```

---

## Deprecation Policy

### Deprecation Timeline

When a breaking change is necessary, follow this timeline:

| Phase                | Duration   | Action                                  |
| -------------------- | ---------- | --------------------------------------- |
| **Announcement**     | 0-4 weeks  | Public notice of breaking change        |
| **Development**      | 4-12 weeks | Build v2, test thoroughly               |
| **Release**          | Day 1      | v2 endpoints available alongside v1     |
| **Migration Window** | 6 months   | Both versions active, support migration |
| **Sunset**           | Month 6-7  | v1 removed from production              |
| **Archive**          | Ongoing    | Legacy documentation in archive         |

### Deprecation Headers

Deprecated endpoints include these HTTP headers:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jun 2026 00:00:00 GMT
Link: </api/v2/images>; rel="successor-version"
Warning: 299 - "API v1 is deprecated, use v2 instead"
Content-Type: application/json

{
  "id": "123",
  "url": "https://...",
  ...
}
```

### Email Notification

Developers with active integrations receive emails:

```
Subject: Spike Land API v1 Deprecation Notice

Dear Developer,

Spike Land API v1 will be sunset on June 1, 2026.

What's changing:
- [List breaking changes]

What to do:
1. Review migration guide: docs/migrations/v1-to-v2.md
2. Test integration against v2
3. Deploy updated code by May 31, 2026

Questions? Support: api-support@spike.land
```

### Support During Migration

- **Documentation**: Migration guides for each breaking change
- **Support Channel**: `api-support@spike.land` for questions
- **Example Code**: SDKs and code samples for v2
- **Discussion Forum**: GitHub Discussions for peer support

---

## Migration Guidelines

### For API Consumers

#### Step 1: Monitor Deprecation Headers

```bash
# Check response headers for deprecation notice
curl -i https://spike.land/api/v1/images

# Look for:
# Deprecation: true
# Sunset: <date>
# Link: <v2 endpoint>
```

#### Step 2: Review Migration Guide

When deprecation is announced:

```bash
# Read the migration guide for your use case
cat docs/migrations/v1-to-v2.md

# Check for breaking changes affecting your integration
grep "my_endpoint" docs/migrations/v1-to-v2.md
```

#### Step 3: Test Against v2

```bash
# Update base URL in non-production environment
BASE_URL="https://spike.land/api/v2"

# Run integration tests
npm test -- --integration

# Verify all endpoints return expected responses
```

#### Step 4: Deploy Updated Code

```bash
# Commit migration changes
git commit -m "chore: migrate API from v1 to v2"

# Deploy to staging first
npm run deploy:staging

# Monitor for issues
npm run logs:staging | grep "api.*error"

# Deploy to production
npm run deploy:production
```

#### Step 5: Verify Migration Complete

```bash
# Confirm all v1 calls replaced with v2
grep -r "api/v1" src/

# Update monitoring/alerts to v2 endpoints
# Verify no errors in production logs
```

### Migration Examples

#### Example 1: Image Enhancement Response Change

**v1 Response Structure**:

```json
{
  "data": {
    "imageId": "123",
    "enhanced": { "url": "https://..." },
    "status": "completed"
  }
}
```

**v2 Response Structure** (flattened):

```json
{
  "id": "123",
  "url": "https://...",
  "status": "completed"
}
```

**Migration Code**:

```javascript
// Before (v1)
const enhancedUrl = response.data.enhanced.url;

// After (v2)
const enhancedUrl = response.url;
```

#### Example 2: Token API Parameter Change

**v1 Request**:

```bash
POST /api/tokens/consume
{
  "amount": 5
}
```

**v2 Request** (requires context):

```bash
POST /api/tokens/consume
{
  "amount": 5,
  "context": "pixel_image_enhancement"  # Required in v2
}
```

**Migration Code**:

```javascript
// Before (v1)
await fetch("/api/tokens/consume", {
  method: "POST",
  body: JSON.stringify({ amount: 5 }),
});

// After (v2)
await fetch("/api/tokens/consume", {
  method: "POST",
  body: JSON.stringify({
    amount: 5,
    context: "pixel_image_enhancement",
  }),
});
```

---

## Version Management

### Changelog Locations

API changes are documented in multiple places for discoverability:

| Location                      | Purpose                       | Audience          |
| ----------------------------- | ----------------------------- | ----------------- |
| `docs/API_CHANGELOG.md`       | Detailed technical changes    | Developers        |
| `docs/migrations/v*-to-v*.md` | Step-by-step migration guides | Integrators       |
| GitHub Releases               | High-level summaries          | All users         |
| Email notifications           | Deprecation announcements     | Active developers |
| In-app notifications          | UI warnings for web consumers | Platform users    |

### API_CHANGELOG.md Format

```markdown
# API Changelog

## [2.0.0] - 2026-06-01

### Breaking Changes

- **Image Enhancement Response**: Response structure flattened
  - Old: `{ data: { enhanced: { url } } }`
  - New: `{ url, ... }`
  - Migration: See `docs/migrations/v1-to-v2.md`

### New Features

- Album batch enhancement: `POST /api/v2/albums/{id}/enhance`
- Image metadata: New `metadata` field in image responses

### Fixed

- Rate limiting now applies consistently across endpoints
```

### Versioning Principles

1. **One Major Version Active** - Only one major version receives new features
2. **Deprecation Clear** - Minimum 6 months notice before removal
3. **Migration Guided** - Detailed guides for each breaking change
4. **Support Available** - Help for developers migrating
5. **Documentation Complete** - Both old and new versions documented
6. **Example Code** - SDK updates and code samples provided

---

## Current API Endpoints

### Endpoint Status Matrix

| Resource     | Endpoint                    | Method | Status   | Notes                   |
| ------------ | --------------------------- | ------ | -------- | ----------------------- |
| **Images**   |                             |        |          |                         |
|              | `/api/images`               | GET    | Stable   | List user images        |
|              | `/api/images/upload`        | POST   | Stable   | Upload new image        |
|              | `/api/images/{id}`          | GET    | Stable   | Get image details       |
|              | `/api/images/{id}`          | DELETE | Stable   | Delete image            |
|              | `/api/images/{id}/enhance`  | POST   | Stable   | Single enhancement      |
|              | `/api/images/{id}/versions` | GET    | Stable   | Get enhancement history |
| **Albums**   |                             |        |          |                         |
|              | `/api/albums`               | GET    | Stable   | List user albums        |
|              | `/api/albums`               | POST   | Stable   | Create album            |
|              | `/api/albums/{id}`          | GET    | Stable   | Get album details       |
|              | `/api/albums/{id}`          | PATCH  | Stable   | Update album            |
|              | `/api/albums/{id}`          | DELETE | Stable   | Delete album            |
|              | `/api/albums/{id}/enhance`  | POST   | Stable   | Batch enhance           |
|              | `/api/albums/{id}/export`   | POST   | Stable   | Export images           |
| **Tokens**   |                             |        |          |                         |
|              | `/api/tokens/balance`       | GET    | Stable   | Get token balance       |
|              | `/api/tokens/consume`       | POST   | Stable   | Consume tokens          |
|              | `/api/tokens/history`       | GET    | Stable   | Transaction history     |
| **Vouchers** |                             |        |          |                         |
|              | `/api/vouchers/apply`       | POST   | Stable   | Apply voucher code      |
|              | `/api/vouchers/validate`    | POST   | Stable   | Check voucher validity  |
| **Referral** |                             |        |          |                         |
|              | `/api/referral/link`        | GET    | Stable   | Get referral link       |
|              | `/api/referral/stats`       | GET    | Stable   | Referral statistics     |
| **Admin**    |                             |        |          |                         |
|              | `/api/admin/*`              | *      | Internal | Admin-only, may change  |
|              | `/api/admin/users`          | GET    | Internal | User management         |
|              | `/api/admin/analytics`      | GET    | Internal | System analytics        |

### Stability Guarantees

**Stable** - Endpoints follow semantic versioning:

- Adding optional parameters: OK
- Adding response fields: OK
- Removing required fields: Requires v2

**Internal** - Admin endpoints not guaranteed:

- May change without notice
- No deprecation period
- Use only for internal tooling

---

## Future Considerations

### API Maturity Indicators

The following signals indicate the API is ready for external release:

- [ ] All endpoints documented in OpenAPI/Swagger
- [ ] SDK libraries published (JavaScript, Python, Go)
- [ ] Authentication standardized (API keys / OAuth)
- [ ] Rate limiting well-defined and enforced
- [ ] Error handling standardized with error codes
- [ ] Support contact established (api-support@spike.land)
- [ ] SLA established (uptime, response time targets)
- [ ] Version roadmap published

### Versioning Complexity Matrix

```
If (external_developers = 0) {
  strategy = "implicit_versioning" // Current approach
  max_changes_per_release = "unlimited"
  notification_required = false
}

If (external_developers > 0) {
  strategy = "explicit_versioning" // Future approach
  max_changes_per_release = "2-3 breaking changes"
  notification_required = true
  support_email = "api-support@spike.land"
}
```

---

## Document History

| Version | Date     | Author          | Changes                     |
| ------- | -------- | --------------- | --------------------------- |
| 1.0     | Dec 2025 | Spike Land Team | Initial versioning strategy |

---

## Related Documents

- [API Reference](./API_REFERENCE.md) - Complete endpoint documentation
- [API Changelog](./API_CHANGELOG.md) - Historical changes (when created)
- [Authentication Guide](./API_REFERENCE.md#authentication) - Auth mechanisms
- [Error Handling](./API_REFERENCE.md#error-handling) - Error codes and
  responses
