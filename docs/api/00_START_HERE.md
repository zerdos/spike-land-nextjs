# Spike Land API Documentation - Start Here

Welcome to the Spike Land API documentation. This file will guide you to the
right resources for your needs.

## What is Spike Land API?

Spike Land is an AI-powered platform for creating, managing, and monetizing
applications. The Pixel app demonstrates image enhancement capabilities using
tokens and a referral system.

**Key Features**:

- Multi-provider authentication (GitHub, Google, Phone)
- Token-based economy for API operations
- Image enhancement with AI (multiple resolution tiers)
- Album and gallery management
- Referral program for user acquisition
- Payment processing via Stripe
- Admin dashboard and analytics

## Quick Start (5 minutes)

1. **First time here?** Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (5 min)
2. **Want to integrate?** Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
   (30 min)
3. **Need to test?** Use [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) (15 min)
4. **Looking for details?** Check [openapi.yaml](./openapi.yaml) (reference)

## Choose Your Path

### I'm a Frontend Developer

Building a web app that uses the Spike Land API:

1. Read: [README.md](./README.md) - Understand the API (5 min)
2. Read: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Essential info (5 min)
3. Read: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Implementation
   patterns (25 min)
4. Copy code examples and start building!

**Total time to start**: 35 minutes

### I'm a Backend/API Developer

Building an SDK or integrating server-to-server:

1. Read: [README.md](./README.md) - API overview (5 min)
2. Read: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Implementation details
   (30 min)
3. Reference: [ALBUM_ENDPOINTS.md](./ALBUM_ENDPOINTS.md) &
   [IMAGE_ENDPOINTS.md](./IMAGE_ENDPOINTS.md) (20 min)
4. Validate: [openapi.yaml](./openapi.yaml) - Complete specification
5. Generate: TypeScript/Python/Go SDKs using the spec

**Total time to understand**: 50 minutes

### I'm a QA / Test Engineer

Testing the API endpoints:

1. Read: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Essential info (5 min)
2. Read: [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) - Testing with cURL (25 min)
3. Reference: [ALBUM_ENDPOINTS.md](./ALBUM_ENDPOINTS.md) &
   [IMAGE_ENDPOINTS.md](./IMAGE_ENDPOINTS.md) - Endpoint details
4. Copy cURL commands and start testing!

**Total time to start testing**: 30 minutes

### I'm a DevOps / Infrastructure

Deploying or monitoring the API:

1. Read: [README.md](./README.md) - Architecture overview (5 min)
2. Read: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference (5 min)
3. Reference: [openapi.yaml](./openapi.yaml) - Complete specification
4. Deploy: Use standard OpenAPI tools for monitoring

### I'm a Project Manager / Architect

Understanding the API design:

1. Read: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Project
   summary (15 min)
2. Read: [README.md](./README.md) - Architecture (10 min)
3. Reference: [openapi.yaml](./openapi.yaml) - Complete specification

## File Guide

| File                                                         | Purpose                    | Read Time | When to Use                               |
| ------------------------------------------------------------ | -------------------------- | --------- | ----------------------------------------- |
| **[openapi.yaml](./openapi.yaml)**                           | Complete API specification | 20 min    | Reference, SDK generation, Postman import |
| **[README.md](./README.md)**                                 | Getting started guide      | 10 min    | First introduction to the API             |
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**               | Essential cheat sheet      | 5 min     | Quick lookup during development           |
| **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**           | Implementation patterns    | 30 min    | Building API integration                  |
| **[CURL_EXAMPLES.md](./CURL_EXAMPLES.md)**                   | Testing with cURL          | 20 min    | Testing endpoints, automation             |
| **[ALBUM_ENDPOINTS.md](./ALBUM_ENDPOINTS.md)**               | Album API details          | 15 min    | Understanding album operations            |
| **[IMAGE_ENDPOINTS.md](./IMAGE_ENDPOINTS.md)**               | Image API details          | 15 min    | Understanding image operations            |
| **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** | Project overview           | 15 min    | Architecture and planning                 |
| **[INDEX.md](./INDEX.md)**                                   | Documentation navigation   | 10 min    | Finding what you need                     |

## Common Questions

### How do I authenticate?

See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#authentication) - Takes 2 minutes

### What are tokens?

See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#tokens) - Takes 3 minutes

### How do I enhance an image?

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#image-upload--enhancement) -
Includes working code

### What's the rate limit?

See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#rate-limits) - Quick reference
table

### How do I test with cURL?

See [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) - 40+ working examples

### How do I handle errors?

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#error-handling) - Error
handler class included

### How do I generate an SDK?

See [README.md](./README.md#generate-api-client-sdks) - Step-by-step
instructions

### Where's my API reference?

See [openapi.yaml](./openapi.yaml) - Complete specification

## API Features at a Glance

### Authentication

- Session cookies (NextAuth.js)
- Bearer tokens
- Multi-provider OAuth (GitHub, Google)
- Phone verification (Twilio)

### Token Economy

- 1 token per 15 minutes (regeneration)
- Max 100 tokens
- Image enhancement: 2-10 tokens
- Referral bonuses: 50 tokens
- Voucher redemption available

### Image Operations

- Upload (multipart/form-data)
- Enhance (3 resolution tiers)
- Batch enhancement
- Streaming progress
- Export (JPEG, PNG, WebP)
- Version history

### Album Management

- Create/edit albums
- Privacy levels (private, unlisted, public)
- Batch image uploads
- Image organization
- Album sharing

### Additional Features

- Referral program (50 token reward)
- Voucher system
- Payment via Stripe
- Admin dashboard
- Public gallery
- Feedback collection

## Getting Help

### Documentation Links

- **API Reference**: [API_REFERENCE.md](../API_REFERENCE.md)
- **Token System**: [TOKEN_SYSTEM.md](../TOKEN_SYSTEM.md)
- **Image Enhancement**: [IMAGE_ENHANCEMENT.md](../IMAGE_ENHANCEMENT.md)
- **Database Schema**: [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)
- **Security**: [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md)

### External Tools

- **Swagger UI**: https://swagger.io/tools/swagger-ui/ (paste openapi.yaml)
- **Postman**: https://www.postman.com/ (import openapi.yaml)
- **ReDoc**: https://redoc.ly/ (build docs from openapi.yaml)

### Contact

- Email: support@spike.land
- Website: https://spike.land
- GitHub: https://github.com/zerdos/spike-land-nextjs

## API Status

- **Version**: 1.0.0
- **Status**: Production Ready
- **Base URLs**:
  - Production: https://spike.land/api
  - Development: http://localhost:3000/api
- **Last Updated**: December 12, 2025

## What's Documented

- 25+ data schemas
- 5 enumerations
- 48+ API routes
- 6 error response types
- 2 security schemes
- 40+ code examples
- Full token economy
- Complete error handling
- Rate limiting rules
- Authentication methods

## What's NOT Documented (Yet)

- Specific endpoint definitions in OpenAPI paths (coming soon)
- UI component library
- Advanced monetization (future)
- Custom domain hosting (future)
- Admin operations API (in progress)

## Next Steps

Choose your role above and start reading the appropriate guide. Most developers
can get started in 30-45 minutes.

If you get stuck, check [INDEX.md](./INDEX.md) for detailed navigation or
contact support@spike.land.

---

**Happy building!**

This API documentation is designed for developer experience. If something is
unclear, it's a documentation bug. Please report it.

---

_Last Updated: December 12, 2025_ _Part of Spike Land - AI-Powered App Platform_
