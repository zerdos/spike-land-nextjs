# Cloudflare R2 and Google Gemini Setup Guide

This guide will help you configure Cloudflare R2 storage and Google Gemini AI for the Image Enhancement feature.

## Prerequisites

- Cloudflare account (free tier available)
- Google account for Gemini API access

---

## Part 1: Cloudflare R2 Setup

### Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `spike-land-images`)
5. Choose a location (automatic is fine)
6. Click **Create bucket**

### Step 2: Get R2 API Credentials

1. In the R2 section, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Configure the token:
   - **Token name**: `spike-land-app`
   - **Permissions**: Select "Admin Read & Write"
   - **TTL**: Leave as "Forever" or set your preference
   - **Specify bucket** (optional): Select your bucket for security
4. Click **Create API Token**
5. **IMPORTANT**: Copy and save these values immediately (they won't be shown again):
   - Access Key ID
   - Secret Access Key
   - Jurisdiction-specific endpoint (e.g., `https://1234567890.r2.cloudflarestorage.com`)

### Step 3: Get Account ID

1. Still in the Cloudflare Dashboard
2. Your Account ID is shown in the R2 overview page
3. Or find it in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/r2`

---

## Part 2: Google Gemini API Setup

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Get API Key**
4. Click **Create API key in new project** (or select existing project)
5. Copy the generated API key

### Step 2: Important Notes

- Gemini has a **free tier** with generous limits
- For production, consider upgrading to paid tier
- API keys are region-specific

---

## Part 3: Enable R2 Public Access

Before configuring environment variables, you need to enable public access for your R2 bucket:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → Select your bucket
3. Click on the **Settings** tab
4. Find **Public Development URL** section
5. Click **Enable**
6. Type `allow` to confirm
7. **Copy the generated R2.dev URL** (e.g., `https://pub-xxxxx.r2.dev`)

**Important**: The R2.dev URL is for development. For production, set up a custom domain.

## Part 4: Configure Environment Variables

1. Open `/Users/z/Developer/spike-land-nextjs/.env.local`
2. Replace the placeholder values with your actual credentials:

```bash
# Cloudflare R2 Storage Configuration
CLOUDFLARE_ACCOUNT_ID=your_actual_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_actual_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_actual_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=spike-land-images
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Google Gemini AI API
GEMINI_API_KEY=your_actual_gemini_api_key
```

3. **Restart your development server** after updating:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

---

## Part 5: Verify Configuration

### Test Image Upload

1. Navigate to http://localhost:3000/apps/images
2. Click **Choose Image** and upload a test image
3. If successful:
   - Image should appear in your images grid
   - No error messages about "R2 credentials not configured"
   - Image should be visible (not broken)

### Test Image Enhancement

1. Click on an uploaded image
2. Select a quality tier (1K, 2K, or 4K)
3. Click **Enhance Image**
4. Monitor the enhancement process:
   - Job should move from PENDING → PROCESSING → COMPLETED
   - Enhanced image should appear in the comparison slider

### Troubleshooting

#### "Cloudflare R2 credentials are not configured"
- Verify all R2 environment variables are set
- Check for typos in variable names
- Restart dev server after changing .env.local

#### "Failed to upload image"
- Verify R2 bucket exists
- Check API token has write permissions
- Verify endpoint URL format is correct

#### "Enhancement failed"
- Verify Gemini API key is correct
- Check you haven't exceeded API quotas
- Look at server logs for detailed error messages

#### Images not loading (404)
- Verify R2 Public Development URL is enabled in bucket settings
- Check CLOUDFLARE_R2_PUBLIC_URL is set in .env.local
- Verify Next.js image configuration in `next.config.ts` includes `*.r2.dev` hostname
- Check R2 bucket is accessible
- Verify image URLs in database use R2.dev domain (not .r2.cloudflarestorage.com)

---

## Cost Estimates

### Cloudflare R2
- **Storage**: $0.015 per GB/month
- **Class A operations** (write): $4.50 per million
- **Class B operations** (read): $0.36 per million
- **Free tier**: 10 GB storage, 1 million Class A, 10 million Class B per month

### Google Gemini
- **Free tier**: 60 requests per minute
- **Paid tier**: Pricing varies by model and usage
- Image generation with Imagen has separate pricing

---

## Security Best Practices

1. **Never commit .env.local to git** (already in .gitignore)
2. **Rotate API keys regularly** (every 3-6 months)
3. **Use bucket-specific API tokens** when possible
4. **Enable CORS only for your domain** in production
5. **Monitor API usage** to detect unauthorized access
6. **Use environment-specific buckets** (dev, staging, production)

---

## Production Deployment

When deploying to Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add all the variables from .env.local
4. Set them for **Production**, **Preview**, and **Development** environments
5. Redeploy your application

---

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
