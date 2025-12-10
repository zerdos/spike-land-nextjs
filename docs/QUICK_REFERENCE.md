# Quick Reference Guide

> Image Enhancement App - API & Feature Quick Reference
> Last Updated: December 2025

---

## Authentication Required Endpoints

All endpoints except `/api/vouchers/validate` require authentication.

---

## Image Management

### Single Image Operations

| Method | Endpoint                | Purpose                     | Auth |
| ------ | ----------------------- | --------------------------- | ---- |
| POST   | `/api/images/upload`    | Upload single image         | Yes  |
| GET    | `/api/images/{imageId}` | Get image details & history | Yes  |
| DELETE | `/api/images/{imageId}` | Delete image                | Yes  |

### Batch Operations

| Method | Endpoint                         | Purpose                    | Auth |
| ------ | -------------------------------- | -------------------------- | ---- |
| POST   | `/api/images/batch-upload`       | Upload multiple images     | Yes  |
| POST   | `/api/images/batch-enhance`      | Enhance multiple images    | Yes  |
| POST   | `/api/images/export`             | Export in multiple formats | Yes  |
| GET    | `/api/images/{imageId}/versions` | View enhancement versions  | Yes  |

---

## Enhancement

| Method | Endpoint              | Purpose                  | Auth | Cost        |
| ------ | --------------------- | ------------------------ | ---- | ----------- |
| POST   | `/api/images/enhance` | Start enhancement        | Yes  | 2-10 tokens |
| GET    | `/api/jobs/{jobId}`   | Check enhancement status | Yes  | Free        |

---

## Albums

| Method | Endpoint                       | Purpose             | Auth |
| ------ | ------------------------------ | ------------------- | ---- |
| POST   | `/api/albums`                  | Create album        | Yes  |
| GET    | `/api/albums/{albumId}`        | Get album & images  | Yes  |
| POST   | `/api/albums/{albumId}/images` | Add images to album | Yes  |
| PATCH  | `/api/albums/{albumId}`        | Update album        | Yes  |
| DELETE | `/api/albums/{albumId}`        | Delete album        | Yes  |

---

## Tokens

| Method | Endpoint              | Purpose               | Auth | Rate     |
| ------ | --------------------- | --------------------- | ---- | -------- |
| GET    | `/api/tokens/balance` | Check balance & stats | Yes  | 100/hour |

---

## Vouchers

| Method | Endpoint                 | Purpose                | Auth | Rate    |
| ------ | ------------------------ | ---------------------- | ---- | ------- |
| POST   | `/api/vouchers/validate` | Check voucher validity | No   | 50/hour |
| POST   | `/api/vouchers/redeem`   | Redeem voucher code    | Yes  | 5/hour  |

---

## Referral

| Method | Endpoint              | Purpose             | Auth |
| ------ | --------------------- | ------------------- | ---- |
| GET    | `/api/referral/link`  | Get referral link   | Yes  |
| GET    | `/api/referral/stats` | View referral stats | Yes  |

---

## Payment

| Method | Endpoint               | Purpose                 | Auth |
| ------ | ---------------------- | ----------------------- | ---- |
| POST   | `/api/stripe/checkout` | Create checkout session | Yes  |

---

## Admin (Requires Admin Role)

| Method | Endpoint                      | Purpose               | Auth |
| ------ | ----------------------------- | --------------------- | ---- |
| GET    | `/api/admin/analytics/users`  | User metrics          | Yes  |
| GET    | `/api/admin/analytics/tokens` | Token economy metrics | Yes  |
| GET    | `/api/admin/system/health`    | System health status  | Yes  |
| GET    | `/api/admin/users`            | Search users          | Yes  |
| POST   | `/api/admin/vouchers`         | Create voucher        | Yes  |

---

## Token Costs

| Feature             | Cost      |
| ------------------- | --------- |
| TIER_1K Enhancement | 2 tokens  |
| TIER_2K Enhancement | 5 tokens  |
| TIER_4K Enhancement | 10 tokens |

---

## Token Packages (Stripe)

| Package      | Tokens | Price  | Value       |
| ------------ | ------ | ------ | ----------- |
| Starter      | 50     | £2.99  | 0.06p/token |
| Essential    | 150    | £7.99  | 0.05p/token |
| Professional | 500    | £19.99 | 0.04p/token |
| Enterprise   | 2000   | £59.99 | 0.03p/token |

---

## Subscription Plans

| Plan         | Tokens/Month | Price/Month | Rollover |
| ------------ | ------------ | ----------- | -------- |
| Starter      | 20           | £2.99       | 20       |
| Professional | 100          | £9.99       | 100      |
| Enterprise   | 500          | £29.99      | 250      |

---

## Promotional Vouchers

| Code      | Tokens | Max Uses  | Status |
| --------- | ------ | --------- | ------ |
| WELCOME50 | 50     | Unlimited | Active |
| LAUNCH100 | 100    | 1000      | Active |
| BETA25    | 25     | 500       | Active |

---

## Free Token Regeneration

- **Rate**: 1 token per 15 minutes
- **Maximum**: 100 tokens
- **Expiration**: 30 days of inactivity
- **Cost**: Free

---

## Rate Limits

| Resource         | Limit | Window   |
| ---------------- | ----- | -------- |
| Upload           | 20    | 1 hour   |
| Enhancement      | 10    | 1 minute |
| Token Balance    | 100   | 1 hour   |
| Voucher Validate | 50    | 1 hour   |
| Voucher Redeem   | 5     | 1 hour   |

---

## Error Response Format

```json
{
  "error": "Human-readable message",
  "status": 400,
  "timestamp": "2025-12-02T10:30:00Z"
}
```

---

## HTTP Status Codes

| Code | Meaning           | Common Cause           |
| ---- | ----------------- | ---------------------- |
| 200  | Success           | Request completed      |
| 400  | Bad Request       | Invalid parameters     |
| 401  | Unauthorized      | Not authenticated      |
| 402  | Payment Required  | Insufficient tokens    |
| 403  | Forbidden         | Not authorized         |
| 404  | Not Found         | Resource doesn't exist |
| 413  | Payload Too Large | File too large         |
| 429  | Too Many Requests | Rate limit exceeded    |
| 500  | Server Error      | Internal error         |

---

## Image Formats

| Format | Max Size | Best For          |
| ------ | -------- | ----------------- |
| JPEG   | 25 MB    | Photos, web       |
| PNG    | 25 MB    | Graphics, quality |
| WebP   | 25 MB    | Modern web        |
| GIF    | 25 MB    | Legacy support    |
| BMP    | 25 MB    | Legacy support    |

---

## Enhancement Tiers

| Tier    | Max Dimension | Cost      | Use Case     |
| ------- | ------------- | --------- | ------------ |
| TIER_1K | 1024px        | 2 tokens  | Social media |
| TIER_2K | 2048px        | 5 tokens  | Professional |
| TIER_4K | 4096px        | 10 tokens | Archival     |

---

## Export Formats

| Format | Best For        | Quality   |
| ------ | --------------- | --------- |
| JPEG   | Photos, web     | 95%       |
| PNG    | Graphics, print | Lossless  |
| WebP   | Modern web      | Excellent |

---

## Referral Rewards

- **Referrer Gets**: 50 tokens per successful referral
- **Referee Gets**: 50 tokens when they sign up
- **Requirements**: Email verification, unique user

---

## Account Limits

| Feature            | Limit     | Notes                            |
| ------------------ | --------- | -------------------------------- |
| Free Token Max     | 100       | Subscription/purchased unlimited |
| Album Count        | Unlimited | Organize as needed               |
| Image Count        | Unlimited | Storage limited by usage         |
| Versions per Image | Unlimited | All enhancements saved           |

---

## Common cURL Examples

### Enhance Image

```bash
curl -X POST https://spike.land/api/images/enhance \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"imageId": "img_123", "tier": "TIER_2K"}'
```

### Check Balance

```bash
curl https://spike.land/api/tokens/balance \
  -H "Authorization: Bearer {token}"
```

### Redeem Voucher

```bash
curl -X POST https://spike.land/api/vouchers/redeem \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"code": "WELCOME50"}'
```

### Create Album

```bash
curl -X POST https://spike.land/api/albums \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Album", "description": "Photos", "isPublic": false}'
```

### Get Referral Link

```bash
curl https://spike.land/api/referral/link \
  -H "Authorization: Bearer {token}"
```

---

## Common JavaScript Examples

### Enhance Image

```javascript
const response = await fetch("/api/images/enhance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageId: "img_123",
    tier: "TIER_2K",
  }),
});
const result = await response.json();
console.log(`Job: ${result.jobId}, Cost: ${result.tokenCost}`);
```

### Check Status

```javascript
const response = await fetch(`/api/jobs/${jobId}`);
const job = await response.json();
console.log(`Status: ${job.job.status}`);
```

### Check Balance

```javascript
const response = await fetch("/api/tokens/balance");
const data = await response.json();
console.log(`Balance: ${data.balance} tokens`);
```

---

## Key Endpoints by Use Case

### For New Users

- `POST /api/auth/signin` - Sign up
- `POST /api/vouchers/redeem` - Redeem welcome voucher
- `POST /api/images/upload` - Upload first image
- `POST /api/images/enhance` - Enhance first image

### For Photographers

- `POST /api/images/batch-upload` - Upload portfolio
- `POST /api/albums` - Create portfolio album
- `POST /api/albums/{id}/images` - Organize images
- `GET /api/albums/{id}` - Share portfolio

### For Token Management

- `GET /api/tokens/balance` - Check balance
- `POST /api/stripe/checkout` - Purchase tokens
- `POST /api/vouchers/redeem` - Redeem codes

### For Promotion

- `GET /api/referral/link` - Get share link
- `GET /api/referral/stats` - Track referrals

### For Administrators

- `GET /api/admin/analytics/users` - User metrics
- `GET /api/admin/analytics/tokens` - Revenue metrics
- `GET /api/admin/system/health` - System status
- `POST /api/admin/vouchers` - Create promotion codes

---

## Documentation Links

- [Full API Reference](./API_REFERENCE.md) - Complete endpoint documentation
- [User Guide](./USER_GUIDE.md) - Step-by-step feature guide
- [Token System](./TOKEN_SYSTEM.md) - Token economy details
- [Implementation Roadmap](./IMAGE_ENHANCEMENT_ROADMAP.md) - Feature timeline

---

Last Updated: December 2025
