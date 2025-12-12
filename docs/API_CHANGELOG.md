# API Changelog

> **Last Updated**: December 2025
> **Current API Version**: Unversioned (v1 implicit)
> **Status**: MVP Release

All notable changes to the Spike Land API are documented in this file.

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/) format with sections:

- **Breaking** - Changes requiring code updates
- **Added** - New functionality
- **Changed** - Modified behavior
- **Deprecated** - Soon-to-be-removed features
- **Removed** - Deleted functionality
- **Fixed** - Bug fixes
- **Security** - Security-related changes

---

## [Unreleased]

### Added

- **Batch Enhancement** - POST `/api/albums/{id}/enhance` for processing multiple images
  - Processes up to 50 images per request
  - Returns job ID for async tracking
  - Supports progress notifications via webhook

- **Image Versions API** - GET `/api/images/{id}/versions`
  - Retrieve enhancement history for single image
  - Download previous versions
  - Compare before/after metadata

- **Album Export** - POST `/api/albums/{id}/export`
  - Export images as ZIP file
  - Supports multiple formats (JPEG, PNG, WebP)
  - Includes metadata in export

- **Webhook Support** - POST `/api/webhooks`
  - Register webhooks for batch operation events
  - Supported events: `batch.completed`, `batch.failed`
  - Manual retry capability

### Changed

- **Token Consumption Tracking** - Token transactions now include `context` field
  - Allows tracking which operation consumed tokens
  - Example: `context: "pixel_image_enhancement"`
  - Non-breaking: field is optional in v1, required in v2

- **Rate Limiting Headers** - Enhanced response headers
  - Added `X-RateLimit-Remaining` header
  - Added `X-RateLimit-Reset` header
  - Added `X-RateLimit-Limit` header

### Fixed

- **Album Deletion** - Fixed issue where albums with 100+ images failed to delete
- **Token Balance Race Condition** - Concurrent enhancement requests no longer cause balance inconsistency
- **Image Upload** - EXIF orientation now correctly applied during upload

### Security

- **API Key Rotation** - Implemented automatic API key rotation (30-day cycle)
- **Rate Limiting** - Enhanced bot protection on public endpoints
- **CORS** - Restricted to registered domains only

---

## [1.0.0] - 2025-12-10

### Release Summary

Initial public release of Spike Land API for Pixel image enhancement app.

### Added

- **Authentication**
  - Session-based authentication via NextAuth.js
  - Support for GitHub, Google OAuth providers
  - Phone verification via Twilio
  - Bearer token support for API clients

- **Image Management**
  - POST `/api/images/upload` - Upload image
  - GET `/api/images` - List user images
  - GET `/api/images/{id}` - Get image details
  - DELETE `/api/images/{id}` - Delete image
  - POST `/api/images/{id}/enhance` - Enhance single image

- **Enhancement Tiers**
  - TIER_1K - Basic enhancement (2 tokens)
  - TIER_2K - Standard enhancement (5 tokens)
  - TIER_4K - Premium enhancement (10 tokens)

- **Albums**
  - POST `/api/albums` - Create album
  - GET `/api/albums` - List user albums
  - GET `/api/albums/{id}` - Get album details
  - PATCH `/api/albums/{id}` - Update album
  - DELETE `/api/albums/{id}` - Delete album

- **Token Economy**
  - GET `/api/tokens/balance` - Check token balance
  - POST `/api/tokens/consume` - Consume tokens
  - GET `/api/tokens/history` - Transaction history
  - Auto-regeneration: 1 token per 15 minutes (max 100)

- **Token Purchases**
  - Integration with Stripe for payments
  - Support for USD, EUR, GBP currencies
  - Receipt generation and emailing

- **Vouchers**
  - POST `/api/vouchers/apply` - Apply voucher code
  - POST `/api/vouchers/validate` - Check voucher validity
  - Admin creation via `/api/admin/vouchers`

- **Referral Program**
  - GET `/api/referral/link` - Generate referral link
  - GET `/api/referral/stats` - Referral statistics
  - Token rewards: 50 tokens to referrer + referee on signup

- **Admin Dashboard**
  - User analytics and search
  - Token economy monitoring
  - Job queue visualization
  - System health checks
  - Voucher management
  - Feedback collection

- **Error Handling**
  - Standardized error response format
  - Error codes: `INVALID_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`
  - Detailed error messages with guidance

- **Rate Limiting**
  - 10 requests/minute per user per endpoint
  - Burst capacity: 20 requests per 10 seconds
  - Returns `429 Too Many Requests` when exceeded
  - Includes `Retry-After` header

### Documentation

- Comprehensive API Reference documentation
- Authentication guide
- Error handling guide
- Rate limiting policy
- cURL and JavaScript code examples
- Postman collection

---

## Deprecated Features

### NextAuth.js Email Provider

> **Deprecated**: December 2025
> **Removed**: Expected June 2026

The email-based authentication provider will be removed in favor of passwordless authentication via magic links.

**Timeline**:

- Dec 2025: Deprecated, still functional
- Mar 2026: New magic link auth available alongside email
- Jun 2026: Email auth removed

**Migration**:

```javascript
// Before (email provider)
import EmailProvider from "next-auth/providers/email";

// After (magic link provider)
import MagicLink from "next-auth/providers/magic-link";
```

---

## Version Comparison Table

| Feature                  | v1.0.0 | Unreleased | Notes        |
| ------------------------ | ------ | ---------- | ------------ |
| Single Image Enhancement | Yes    | Yes        | Core feature |
| Batch Enhancement        | No     | Yes        | New          |
| Album Support            | Yes    | Yes        | Stable       |
| Token Auto-Regeneration  | Yes    | Yes        | Stable       |
| Stripe Integration       | Yes    | Yes        | Stable       |
| Referral Program         | Yes    | Yes        | Stable       |
| Webhooks                 | No     | Yes        | New          |
| Image Versions           | No     | Yes        | New          |
| Album Export             | No     | Yes        | New          |
| Admin Dashboard          | Yes    | Yes        | Stable       |

---

## Breaking Changes History

### When v2 is Released

This section will document breaking changes from v1 to v2.

#### Response Structure Changes

**Expected Change** (not yet implemented):

```
v1 Response:
{
  "data": {
    "imageId": "123",
    "enhanced": {
      "url": "https://...",
      "size": 1024000
    }
  }
}

v2 Response (hypothetical flattening):
{
  "id": "123",
  "url": "https://...",
  "size": 1024000
}
```

---

## Upgrade Guide

### From v1.0.0 to Unreleased

**No breaking changes** - All changes are backward compatible.

**Recommended Updates**:

1. Monitor `X-RateLimit-*` headers for better rate limit handling
2. Include `context` field in token consumption requests for better tracking
3. Implement webhook handlers for batch operation notifications

---

## Planned Releases

### Q1 2026 Roadmap

- [ ] v1.1.0 - Webhook support and image versioning
- [ ] v1.2.0 - Album export and batch operations
- [ ] API key authentication (alternative to OAuth)
- [ ] GraphQL API (alongside REST)

### Q2 2026 Roadmap

- [ ] v2.0.0 - API redesign (if breaking changes needed)
- [ ] SDK releases (Python, Go, Ruby)
- [ ] OpenAPI 3.1 specification
- [ ] Sandbox environment with test data

---

## How to Report Issues

Found a bug or inconsistency in the API?

1. **Check existing issues** - https://github.com/zerdos/spike-land-nextjs/issues
2. **Report new issues** - Create issue with:
   - API endpoint affected
   - Request and response examples
   - Steps to reproduce
   - Expected vs. actual behavior
3. **Email support** - api-support@spike.land (for sensitive issues)

---

## Related Documents

- [API Versioning Strategy](./API_VERSIONING.md) - Long-term versioning approach
- [API Reference](./API_REFERENCE.md) - Complete endpoint documentation
- [Authentication Guide](./API_REFERENCE.md#authentication) - Auth setup
- [Error Handling](./API_REFERENCE.md#error-handling) - Error codes

---

## Document History

| Version | Date     | Changes                      |
| ------- | -------- | ---------------------------- |
| 1.0     | Dec 2025 | Initial changelog for v1.0.0 |
