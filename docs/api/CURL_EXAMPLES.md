# Spike Land API - cURL Examples

Quick reference for testing API endpoints using cURL.

## Environment Setup

```bash
# Set base URL for easier commands
export API_BASE="https://spike.land/api"        # Production
export API_BASE="http://localhost:3000/api"     # Development

# Set your session token (from NextAuth.js)
export SESSION_TOKEN="your_session_token_here"
```

## Authentication

### Using Session Cookie (Automatic for Web)

```bash
# No additional setup needed - cookies are included automatically
curl -X GET $API_BASE/tokens/balance
```

### Using Bearer Token

```bash
# Include token in Authorization header
curl -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Health & Status

### Health Check

```bash
curl -X GET $API_BASE/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-12T15:45:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Admin Dashboard (Requires Admin Role)

```bash
curl -X GET $API_BASE/admin/dashboard \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Token Management

### Get Token Balance

```bash
curl -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

Response:

```json
{
  "balance": 45,
  "lastRegeneration": "2025-12-12T15:00:00Z",
  "timeUntilNextRegenMs": 900000,
  "tokensAddedThisRequest": 1,
  "stats": {
    "totalSpent": 150,
    "totalEarned": 500,
    "totalRefunded": 10,
    "transactionCount": 42
  }
}
```

### Validate Voucher

```bash
curl -X POST $API_BASE/vouchers/validate \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME50"
  }'
```

### Redeem Voucher

```bash
curl -X POST $API_BASE/vouchers/redeem \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME50"
  }'
```

## Image Management

### Upload Image

```bash
curl -X POST $API_BASE/images/upload \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

Response:

```json
{
  "id": "cuid123456789",
  "userId": "cuid987654321",
  "originalUrl": "https://storage.example.com/image.jpg",
  "name": "image.jpg",
  "mimeType": "image/jpeg",
  "createdAt": "2025-12-12T14:30:00Z"
}
```

### Get Image Details

```bash
curl -X GET $API_BASE/images/{imageId} \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Delete Image

```bash
curl -X DELETE $API_BASE/images/{imageId} \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Get Image Versions

```bash
curl -X GET $API_BASE/images/{imageId}/versions \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Image Enhancement

### Enhance Single Image

```bash
curl -X POST $API_BASE/images/enhance \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "cuid123456789",
    "tier": "TIER_2K"
  }'
```

Response:

```json
{
  "id": "job_abc123",
  "userId": "cuid987654321",
  "imageId": "cuid123456789",
  "tier": "TIER_2K",
  "status": "PENDING",
  "tokensCost": 5,
  "createdAt": "2025-12-12T14:30:00Z"
}
```

### Batch Enhancement

```bash
curl -X POST $API_BASE/images/batch-enhance \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageIds": ["cuid123", "cuid456", "cuid789"],
    "tier": "TIER_2K"
  }'
```

Response:

```json
{
  "jobIds": ["job_1", "job_2", "job_3"],
  "totalTokensCost": 15
}
```

### Batch Upload and Enhance

```bash
curl -X POST $API_BASE/images/batch-upload \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "tier=TIER_2K"
```

### Export Enhanced Image

```bash
curl -X POST $API_BASE/images/export \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "cuid123456789",
    "format": "PNG"
  }'
```

## Jobs

### Get Job Status

```bash
curl -X GET $API_BASE/jobs/{jobId} \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

Response:

```json
{
  "id": "job_abc123",
  "userId": "cuid987654321",
  "status": "PROCESSING",
  "progress": 75,
  "tokensCost": 5,
  "updatedAt": "2025-12-12T14:35:00Z"
}
```

### Get Batch Job Status

```bash
curl -X POST $API_BASE/jobs/batch-status \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": ["job_1", "job_2", "job_3"]
  }'
```

### Stream Job Progress

```bash
# Uses Server-Sent Events (SSE)
curl -X GET $API_BASE/jobs/{jobId}/stream \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Cancel Job

```bash
curl -X POST $API_BASE/jobs/{jobId}/cancel \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Albums

### List User Albums

```bash
curl -X GET $API_BASE/albums \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

Response:

```json
[
  {
    "id": "cuid123456789",
    "userId": "cuid987654321",
    "name": "Summer Photos 2025",
    "description": "Vacation photos",
    "privacy": "UNLISTED",
    "imageCount": 42,
    "createdAt": "2025-12-10T10:30:00Z"
  }
]
```

### Create Album

```bash
curl -X POST $API_BASE/albums \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Vacation",
    "description": "Greece trip 2025",
    "privacy": "UNLISTED"
  }'
```

### Update Album

```bash
curl -X PUT $API_BASE/albums/{albumId} \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Vacation 2025",
    "description": "Greece and Italy",
    "privacy": "PUBLIC"
  }'
```

### Delete Album

```bash
curl -X DELETE $API_BASE/albums/{albumId} \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Add Images to Album

```bash
curl -X POST $API_BASE/albums/{albumId}/images \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageIds": ["cuid123", "cuid456", "cuid789"]
  }'
```

### Get Album Images

```bash
curl -X GET "$API_BASE/albums/{albumId}/images?page=1&limit=20" \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Enhance All Album Images

```bash
curl -X POST $API_BASE/albums/{albumId}/enhance \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "TIER_2K"
  }'
```

## Gallery

### Get Public Gallery

```bash
curl -X GET "$API_BASE/gallery/public-albums?page=1&limit=20"
```

### Get Featured Gallery

```bash
curl -X GET "$API_BASE/gallery?page=1&limit=12"
```

### Browse Admin Gallery (Admin Only)

```bash
curl -X GET $API_BASE/admin/gallery/browse \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Referral Program

### Get Referral Link

```bash
curl -X GET $API_BASE/referral/link \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

Response:

```json
{
  "code": "JOHN123",
  "url": "https://spike.land?ref=JOHN123"
}
```

### Get Referral Stats

```bash
curl -X GET $API_BASE/referral/stats \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

Response:

```json
{
  "referralCode": "JOHN123",
  "successfulReferrals": 5,
  "tokensEarned": 250,
  "referrals": [
    {
      "userId": "cuid...",
      "userName": "Jane Smith",
      "email": "jane@example.com",
      "tokensEarned": 50,
      "referredAt": "2025-12-05T10:00:00Z"
    }
  ]
}
```

## Apps (Future Feature)

### List User Apps

```bash
curl -X GET $API_BASE/apps \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Create New App

```bash
curl -X POST $API_BASE/apps \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Image Tool",
    "description": "Custom image enhancement app"
  }'
```

### Fork Existing App

```bash
curl -X POST $API_BASE/apps \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Image Tool (Fork)",
    "forkedFrom": "cuid_original_app_123"
  }'
```

### Get App Details

```bash
curl -X GET $API_BASE/apps/{appId} \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Stripe Payments

### Create Checkout Session

```bash
curl -X POST $API_BASE/stripe/checkout \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": 100,
    "successUrl": "https://spike.land/dashboard?session_id={CHECKOUT_SESSION_ID}",
    "cancelUrl": "https://spike.land/dashboard"
  }'
```

Response:

```json
{
  "sessionId": "cs_live_...",
  "url": "https://checkout.stripe.com/..."
}
```

## Error Examples

### Unauthorized (401)

```bash
curl -X GET $API_BASE/tokens/balance
# Response: 401 Unauthorized
# {"error": "Unauthorized", "code": "UNAUTHORIZED"}
```

### Rate Limited (429)

```bash
curl -X GET $API_BASE/images/enhance -H "Authorization: Bearer $SESSION_TOKEN" \
  -w "\nHeaders:\nRetry-After: %{http_header Retry-After}\n"
# Response: 429 Too Many Requests
# Retry-After: 60
```

### Validation Error (400)

```bash
curl -X POST $API_BASE/albums \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "privacy": "INVALID"
  }'
# Response: 400 Bad Request
# {"error": "Invalid input", "code": "INVALID_INPUT"}
```

### Insufficient Tokens (400)

```bash
curl -X POST $API_BASE/images/enhance \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "cuid123",
    "tier": "TIER_4K"
  }'
# Response: 400 Bad Request
# {"error": "Insufficient tokens", "code": "INSUFFICIENT_TOKENS", "needed": 10, "balance": 3}
```

## Useful Tips

### Check Response Headers

```bash
# Show all headers
curl -i -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN"

# Show specific header
curl -I -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN" | grep "X-RateLimit"
```

### Pretty Print JSON Responses

```bash
# Using jq
curl -s -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN" | jq

# Using python
curl -s -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN" | python -m json.tool
```

### Follow Redirects

```bash
curl -L -X GET $API_BASE/some-endpoint
```

### Save Response to File

```bash
curl -X POST $API_BASE/images/export \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageId": "cuid123", "format": "PNG"}' \
  -o enhanced_image.png
```

### Measure Performance

```bash
curl -w "Total time: %{time_total}s\n" \
  -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Automation Examples

### Monitor Job Until Completion

```bash
#!/bin/bash

JOB_ID=$1
API_BASE="http://localhost:3000/api"
TOKEN=$SESSION_TOKEN

while true; do
  STATUS=$(curl -s -X GET "$API_BASE/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')

  echo "Job status: $STATUS"

  case $STATUS in
    COMPLETED)
      echo "Job completed!"
      break
      ;;
    FAILED)
      echo "Job failed!"
      exit 1
      ;;
    CANCELLED)
      echo "Job cancelled!"
      exit 1
      ;;
    *)
      echo "Waiting..."
      sleep 2
      ;;
  esac
done
```

### Batch Enhancement with Progress

```bash
#!/bin/bash

IMAGE_IDS=("cuid123" "cuid456" "cuid789")
API_BASE="http://localhost:3000/api"
TOKEN=$SESSION_TOKEN

# Start batch enhancement
RESPONSE=$(curl -s -X POST "$API_BASE/images/batch-enhance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"imageIds\": [$(printf '"%s",' "${IMAGE_IDS[@]}" | sed 's/,$//')]}, \"tier\": \"TIER_2K\"}")

JOB_IDS=$(echo $RESPONSE | jq -r '.jobIds[]')

# Monitor all jobs
for JOB_ID in $JOB_IDS; do
  echo "Monitoring job $JOB_ID..."
  while true; do
    STATUS=$(curl -s -X GET "$API_BASE/jobs/$JOB_ID" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.status')
    if [ "$STATUS" = "COMPLETED" ]; then
      echo "Job $JOB_ID completed!"
      break
    fi
    sleep 1
  done
done

echo "All jobs completed!"
```

## Troubleshooting

### Connection Refused

```bash
# Check if API is running
curl http://localhost:3000/api/health

# Check for CORS issues (in browser console, not cURL)
curl -i -X OPTIONS http://localhost:3000/api/images/enhance
```

### Invalid Token

```bash
# Check token format
echo $SESSION_TOKEN  # Should start with valid session identifier

# Test with valid token
curl -X GET http://localhost:3000/api/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN" -v
```

### Rate Limited Responses

```bash
# Check rate limit headers
curl -i -X GET $API_BASE/images/enhance \
  -H "Authorization: Bearer $SESSION_TOKEN" | grep "X-RateLimit"

# Wait specified time before retry
WAIT=$(curl -i -X GET $API_BASE/tokens/balance \
  -H "Authorization: Bearer $SESSION_TOKEN" 2>/dev/null | grep "Retry-After" | cut -d' ' -f2)
echo "Waiting $WAIT seconds..."
sleep $WAIT
```

---

For more information, see [API Reference](../API_REFERENCE.md) and [Integration Guide](./INTEGRATION_GUIDE.md)
