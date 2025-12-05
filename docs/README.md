# Spike Land Documentation

Welcome to the comprehensive documentation for Spike Land, an AI-powered app platform.

---

## Quick Start

### For Users

**Getting Started**:

1. Read [Platform Overview](#platform-overview) below
2. Check [IMAGE_ENHANCEMENT.md](IMAGE_ENHANCEMENT.md) to learn image features
3. Review [TOKEN_SYSTEM.md](TOKEN_SYSTEM.md) for token acquisition
4. See [VOUCHER_SYSTEM_UPDATED.md](VOUCHER_SYSTEM_UPDATED.md) for promotional codes

**Common Tasks**:

- **Upload an image**: See [IMAGE_ENHANCEMENT.md - How It Works](IMAGE_ENHANCEMENT.md#how-it-works)
- **Get tokens**: See [TOKEN_SYSTEM.md - Token Acquisition](TOKEN_SYSTEM.md#token-acquisition)
- **Redeem voucher**: See [VOUCHER_SYSTEM_UPDATED.md - How to Redeem](VOUCHER_SYSTEM_UPDATED.md#how-to-redeem)

### For Developers

**Integration Guide**:

1. Start with [API_REFERENCE.md](API_REFERENCE.md) for endpoint documentation
2. Review [IMAGE_ENHANCEMENT.md - API Reference](IMAGE_ENHANCEMENT.md#api-reference)
3. Implement error handling from [API_REFERENCE.md - Error Handling](API_REFERENCE.md#error-handling)
4. Follow rate limiting from [API_REFERENCE.md - Rate Limiting](API_REFERENCE.md#rate-limiting)

**Implementation Examples**:

- Complete enhancement workflow in [API_REFERENCE.md](API_REFERENCE.md#complete-enhancement-workflow)
- Token balance checking in [TOKEN_SYSTEM.md](TOKEN_SYSTEM.md#balance-query)
- Voucher validation flow in [VOUCHER_SYSTEM_UPDATED.md](VOUCHER_SYSTEM_UPDATED.md#validation-endpoint)

### For Product & Marketing

**Feature Overview**:

1. Read [FEATURES.md](FEATURES.md) for platform capabilities
2. Check [TOKEN_SYSTEM.md - Pricing Model](TOKEN_SYSTEM.md#token-pricing) for pricing tiers
3. Review [VOUCHER_SYSTEM_UPDATED.md - Management](VOUCHER_SYSTEM_UPDATED.md#management) for campaign planning
4. See [IMAGE_ENHANCEMENT.md - Feature Overview](IMAGE_ENHANCEMENT.md#feature-overview) for benefits

---

## Platform Overview

**Spike Land** is an innovative platform that democratizes AI-powered image enhancement through:

- **AI Image Enhancement**: Google Gemini-powered upscaling and quality improvement
- **Flexible Pricing**: Token-based system with multiple acquisition methods
- **Promotional Campaigns**: Voucher system for user acquisition and engagement
- **Scalable Architecture**: Built on Next.js with PostgreSQL backend

### Core Features

1. **Image Enhancement**
   - Upload images (JPEG, PNG, WebP, GIF, BMP)
   - Choose from 3 quality tiers (1K, 2K, 4K)
   - AI-powered upscaling with aspect ratio preservation
   - Side-by-side before/after comparison
   - Download enhanced images

2. **Token System**
   - Free tokens: 1 per 15 minutes (max 100)
   - Purchase tokens: 50-2000 token packages (£2.99-£59.99)
   - Subscriptions: 20-500 tokens/month (£2.99-£29.99)
   - Vouchers: Promotional codes (LAUNCH100, WELCOME50, BETA25)

3. **Monetization**
   - Token-based pricing for features
   - One-time purchases via Stripe
   - Monthly subscriptions with rollover
   - Promotional voucher campaigns

---

## Documentation Index

### MVP Feature Documentation (NEW)

| Document                                                         | Lines | Focus                                             | Audience                   |
| ---------------------------------------------------------------- | ----- | ------------------------------------------------- | -------------------------- |
| **[IMAGE_ENHANCEMENT.md](IMAGE_ENHANCEMENT.md)**                 | 577   | Image upload, enhancement workflow, API endpoints | Users, Developers          |
| **[TOKEN_SYSTEM.md](TOKEN_SYSTEM.md)**                           | 664   | Token economy, acquisition methods, pricing       | Users, Product, Developers |
| **[VOUCHER_SYSTEM_UPDATED.md](VOUCHER_SYSTEM_UPDATED.md)**       | 672   | Voucher types, redemption, campaign management    | Product, Developers        |
| **[API_REFERENCE.md](API_REFERENCE.md)**                         | 892   | Complete API documentation with examples          | Developers                 |
| **[MVP_DOCUMENTATION_SUMMARY.md](MVP_DOCUMENTATION_SUMMARY.md)** | 465   | Overview of all new documentation                 | Everyone                   |

### Platform Documentation

| Document                                                     | Purpose                                 |
| ------------------------------------------------------------ | --------------------------------------- |
| **[FEATURES.md](FEATURES.md)**                               | Complete feature list and status        |
| **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**                 | Database design and models              |
| **[DATABASE_SETUP.md](DATABASE_SETUP.md)**                   | Database installation and configuration |
| **[DATABASE_QUICK_START.md](DATABASE_QUICK_START.md)**       | Quick database setup guide              |
| **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**                 | Database migration procedures           |
| **[STRIPE_INTEGRATION_PLAN.md](STRIPE_INTEGRATION_PLAN.md)** | Payment processing setup                |
| **[PRODUCTION_FIXES_NEEDED.md](PRODUCTION_FIXES_NEEDED.md)** | Known issues and fixes                  |
| **[AUTOMATED_SETUP.md](AUTOMATED_SETUP.md)**                 | Automated deployment setup              |

---

## API Endpoints

### Quick Reference

**Image Management**:

- `POST /api/images/upload` - Upload image
- `GET /api/images/{id}` - Get image details
- `DELETE /api/images/{id}` - Delete image

**Image Enhancement**:

- `POST /api/images/enhance` - Request enhancement
- `GET /api/jobs/{id}` - Track enhancement job

**Token Management**:

- `GET /api/tokens/balance` - Get token balance

**Voucher Management**:

- `POST /api/vouchers/validate` - Validate voucher code
- `POST /api/vouchers/redeem` - Redeem voucher

**Payment**:

- `POST /api/stripe/checkout` - Create payment/subscription session

See [API_REFERENCE.md](API_REFERENCE.md) for complete documentation.

---

## Token System Overview

### Token Acquisition Methods

```
Free Regeneration     1 token per 15 minutes (max 100)
Voucher Codes        50-100 tokens (LAUNCH100, WELCOME50, BETA25)
One-Time Purchase    50-2000 tokens (£2.99-£59.99)
Monthly Subscription 20-500 tokens/month (£2.99-£29.99)
```

### Enhancement Costs

```
TIER_1K (1024px)  =  2 tokens  (quick preview)
TIER_2K (2048px)  =  5 tokens  (professional)
TIER_4K (4096px)  = 10 tokens  (high resolution)
```

### Subscription Plans

```
Starter      20 tokens/month   £2.99   (rollover: 20)
Professional 100 tokens/month  £9.99   (rollover: 100)
Enterprise   500 tokens/month  £29.99  (rollover: 250)
```

See [TOKEN_SYSTEM.md](TOKEN_SYSTEM.md) for detailed information.

---

## Enhancement Workflow

1. **Upload Image** → `POST /api/images/upload`
2. **Check Balance** → `GET /api/tokens/balance`
3. **Request Enhancement** → `POST /api/images/enhance`
4. **Track Progress** → Poll `GET /api/jobs/{jobId}`
5. **Download Result** → Get enhanced URL from job response

See [IMAGE_ENHANCEMENT.md](IMAGE_ENHANCEMENT.md) for complete workflow details.

---

## Voucher Codes

### Active Vouchers

| Code      | Tokens | Max Uses  | Status |
| --------- | ------ | --------- | ------ |
| LAUNCH100 | 100    | 1000      | ACTIVE |
| WELCOME50 | 50     | Unlimited | ACTIVE |
| BETA25    | 25     | 500       | ACTIVE |

**Redemption Rules**:

- One code per user (cannot redeem same code twice)
- Can combine different codes (LAUNCH100 AND WELCOME50)
- Tokens granted instantly
- No expiration on active vouchers

See [VOUCHER_SYSTEM_UPDATED.md](VOUCHER_SYSTEM_UPDATED.md) for management details.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Human-readable error message",
  "status": 400
}
```

### Common HTTP Status Codes

| Code | Meaning          | Example                      |
| ---- | ---------------- | ---------------------------- |
| 200  | Success          | Enhancement request accepted |
| 400  | Bad Request      | Invalid parameters           |
| 401  | Unauthorized     | Not logged in                |
| 402  | Payment Required | Insufficient tokens          |
| 403  | Forbidden        | Not image owner              |
| 404  | Not Found        | Image doesn't exist          |
| 429  | Rate Limited     | Too many requests            |
| 500  | Server Error     | Internal error               |

See [API_REFERENCE.md - Error Handling](API_REFERENCE.md#error-handling) for complete codes.

---

## Rate Limiting

| Resource           | Limit        | Window   |
| ------------------ | ------------ | -------- |
| Image Upload       | 20 files     | 1 hour   |
| Image Enhancement  | 10 requests  | 1 minute |
| Token Balance      | 100 requests | 1 hour   |
| Voucher Validation | 50 requests  | 1 hour   |

All responses include rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1701516600
```

See [API_REFERENCE.md - Rate Limiting](API_REFERENCE.md#rate-limiting) for details.

---

## Code Examples

### Upload and Enhance an Image (JavaScript)

```javascript
// 1. Upload image
const uploadFormData = new FormData();
uploadFormData.append("file", fileInput.files[0]);

const uploadRes = await fetch("/api/images/upload", {
  method: "POST",
  body: uploadFormData,
});

const uploadedImage = await uploadRes.json();
console.log(`Image uploaded: ${uploadedImage.image.id}`);

// 2. Check token balance
const balanceRes = await fetch("/api/tokens/balance");
const balance = await balanceRes.json();
console.log(`Balance: ${balance.balance} tokens`);

// 3. Request enhancement
const enhanceRes = await fetch("/api/images/enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageId: uploadedImage.image.id,
    tier: "TIER_2K",
  }),
});

const job = await enhanceRes.json();
console.log(`Enhancement started: ${job.jobId}`);

// 4. Track progress
let completed = false;
while (!completed) {
  await new Promise(r => setTimeout(r, 1000));

  const statusRes = await fetch(`/api/jobs/${job.jobId}`);
  const status = await statusRes.json();

  if (status.job.status === "COMPLETED") {
    console.log(`Done! ${status.job.enhancedUrl}`);
    completed = true;
  }
}
```

See [API_REFERENCE.md](API_REFERENCE.md#complete-enhancement-workflow) for more examples.

---

## Getting Help

### Documentation by Topic

**I want to...**

- **Upload images** → [IMAGE_ENHANCEMENT.md - Upload Image](IMAGE_ENHANCEMENT.md#upload-image)
- **Enhance images** → [IMAGE_ENHANCEMENT.md - Enhance Image](IMAGE_ENHANCEMENT.md#enhance-image)
- **Buy tokens** → [TOKEN_SYSTEM.md - Token Packages](TOKEN_SYSTEM.md#token-packages)
- **Subscribe to plan** → [TOKEN_SYSTEM.md - Subscription Plans](TOKEN_SYSTEM.md#subscription-plans)
- **Redeem voucher** → [VOUCHER_SYSTEM_UPDATED.md - How to Redeem](VOUCHER_SYSTEM_UPDATED.md#how-to-redeem)
- **Integrate API** → [API_REFERENCE.md](API_REFERENCE.md)
- **Handle errors** → [API_REFERENCE.md - Error Handling](API_REFERENCE.md#error-handling)
- **Manage rate limits** → [API_REFERENCE.md - Rate Limiting](API_REFERENCE.md#rate-limiting)
- **Plan campaigns** → [VOUCHER_SYSTEM_UPDATED.md - Management](VOUCHER_SYSTEM_UPDATED.md#management)

### Documentation Statistics

**Total Documentation**: 3,300+ lines across 9 comprehensive files

**Coverage**:

- ✅ 10 API endpoints fully documented
- ✅ 35+ error codes with solutions
- ✅ 4 token acquisition methods
- ✅ 3 enhancement tiers
- ✅ 3 active voucher codes
- ✅ Real code examples in multiple languages

---

## Version Information

**Documentation Version**: 1.0 MVP Release

**Last Updated**: December 2, 2025

**Status**: Production Ready

**Platform**:

- Framework: Next.js 15
- Database: PostgreSQL
- Payment: Stripe
- AI: Google Gemini API
- Storage: Cloudflare R2

---

## Contributing to Documentation

To update or improve documentation:

1. Edit relevant `.md` file in `/docs/` directory
2. Keep consistent formatting with existing files
3. Include code examples for new features
4. Update this README if adding new files
5. Keep line counts and file sizes reasonable
6. Cross-reference related documents

---

## Archive

Historical documentation in `/docs/archive/`:

- Implementation summaries
- Previous design decisions
- Setup guides for past versions
- Historical deployment notes

---

## Support

For questions or issues:

1. Check relevant documentation file (use index above)
2. Review [API_REFERENCE.md - Error Handling](API_REFERENCE.md#error-handling)
3. Check [PRODUCTION_FIXES_NEEDED.md](PRODUCTION_FIXES_NEEDED.md) for known issues
4. Contact development team

---

**Happy using Spike Land!**
