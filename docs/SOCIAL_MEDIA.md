# Social Media Integration Guide

This document covers spike.land's social media presence, API integrations, and admin dashboard usage.

## Table of Contents

- [Platform Handles](#platform-handles)
- [API Integrations Overview](#api-integrations-overview)
- [Setting Up Developer Accounts](#setting-up-developer-accounts)
- [Admin Dashboard Guide](#admin-dashboard-guide)
- [Connecting Accounts](#connecting-accounts)
- [Posting Content](#posting-content)
- [Reading Analytics](#reading-analytics)
- [Content Guidelines](#content-guidelines)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

---

## Platform Handles

| Platform  | Handle         | URL                                         |
| --------- | -------------- | ------------------------------------------- |
| X/Twitter | @spike_land    | https://x.com/spike_land                    |
| LinkedIn  | SPIKE LAND LTD | https://linkedin.com/company/spike-land     |
| Facebook  | spike.land     | https://facebook.com/spike.land             |
| Instagram | @spike_land    | https://instagram.com/spike_land            |
| YouTube   | spike.land     | https://youtube.com/@spike_land             |
| Discord   | spike.land     | https://discord.gg/spike-land               |
| GitHub    | zerdos         | https://github.com/zerdos/spike-land-nextjs |

---

## API Integrations Overview

spike.land integrates with six social media platforms through their official APIs:

| Platform  | API Version     | Auth Method        | Features                        |
| --------- | --------------- | ------------------ | ------------------------------- |
| Twitter/X | v2              | OAuth 2.0 + PKCE   | Read/Post tweets, Metrics       |
| Facebook  | Graph API v21.0 | OAuth 2.0          | Page posts, Insights            |
| Instagram | Graph API v21.0 | via Facebook OAuth | Posts, Insights                 |
| LinkedIn  | v2              | OAuth 2.0          | Organization posts, Statistics  |
| YouTube   | Data API v3     | Google OAuth 2.0   | Channel info, Videos, Analytics |
| Discord   | v10             | Bot Token          | Announcements, Server metrics   |

### Architecture

```
src/lib/social/
├── types.ts              # Shared interfaces (ISocialClient, etc.)
├── index.ts              # Factory function & exports
└── clients/
    ├── twitter.ts        # Twitter API v2 client
    ├── facebook.ts       # Facebook Graph API client
    ├── instagram.ts      # Instagram Graph API client
    ├── linkedin.ts       # LinkedIn API client
    ├── youtube.ts        # YouTube Data API client
    └── discord.ts        # Discord Bot client

src/app/api/social/
├── twitter/
│   ├── connect/route.ts   # OAuth initiation
│   ├── callback/route.ts  # OAuth callback
│   ├── posts/route.ts     # GET/POST tweets
│   └── metrics/route.ts   # Engagement metrics
├── facebook/
│   ├── connect/route.ts
│   ├── callback/route.ts
│   ├── posts/route.ts
│   └── metrics/route.ts
├── instagram/
│   ├── posts/route.ts
│   └── metrics/route.ts
├── linkedin/
│   ├── connect/route.ts
│   ├── callback/route.ts
│   ├── posts/route.ts
│   └── metrics/route.ts
├── youtube/
│   ├── connect/route.ts
│   ├── callback/route.ts
│   ├── videos/route.ts
│   └── metrics/route.ts
└── discord/
    ├── announce/route.ts
    └── metrics/route.ts
```

---

## Setting Up Developer Accounts

### Twitter/X Developer Account

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Sign up for a developer account (Free tier available)
3. Create a Project and App
4. Enable **OAuth 2.0** with:
   - Type: Web App
   - Callback URL: `https://spike.land/api/social/twitter/callback`
   - For local dev: `http://localhost:3000/api/social/twitter/callback`
5. Copy **Client ID** and **Client Secret**
6. Required scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

### Facebook/Instagram Developer Account

1. Go to https://developers.facebook.com/
2. Create a new App (Type: Business)
3. Add products: **Facebook Login**, **Instagram Graph API**
4. Configure OAuth:
   - Valid OAuth Redirect URIs: `https://spike.land/api/social/facebook/callback`
5. Request permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
   - `instagram_basic`
   - `instagram_content_publish`
6. Copy **App ID** and **App Secret**

Note: Instagram Business accounts are automatically discovered when connecting Facebook pages.

### LinkedIn Developer Account

1. Go to https://www.linkedin.com/developers/apps
2. Create a new app (requires LinkedIn Page association)
3. Request access to **Marketing Developer Platform**
4. Add OAuth 2.0 redirect URL: `https://spike.land/api/social/linkedin/callback`
5. Required scopes:
   - `r_organization_social`
   - `w_organization_social`
   - `rw_organization_admin`
6. Copy **Client ID** and **Client Secret**

### YouTube Data API

YouTube uses Google OAuth with additional YouTube scopes:

1. Go to https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. Enable **YouTube Data API v3**
3. Use your existing Google OAuth credentials (GOOGLE_ID/GOOGLE_SECRET)
4. Add callback URL: `https://spike.land/api/social/youtube/callback`
5. Required scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.force-ssl`

### Discord Bot

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to **Bot** section and create a bot
4. Copy the **Bot Token**
5. Under **OAuth2 > URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Read Message History`, `Embed Links`
6. Use the generated URL to invite the bot to your server
7. Get Server ID: Enable Developer Mode in Discord, right-click server → Copy ID
8. Get Channel ID: Right-click announcement channel → Copy ID

---

## Admin Dashboard Guide

The social media admin dashboard is located at `/admin/social-media`.

### Dashboard Tabs

| Tab            | Description                      |
| -------------- | -------------------------------- |
| **Overview**   | Cross-platform metrics summary   |
| **Accounts**   | Manage connected social accounts |
| **Analytics**  | Detailed platform analytics      |
| **Posts**      | Post management and scheduling   |
| **Engagement** | Track mentions and interactions  |

### Accessing the Dashboard

1. Log in to spike.land with an admin account
2. Navigate to `/admin/social-media`
3. The dashboard shows aggregated metrics from all connected platforms

---

## Connecting Accounts

### Connect Twitter/X

1. Go to `/admin/social-media/accounts`
2. Click **Connect Twitter**
3. You'll be redirected to Twitter for authorization
4. Grant permissions for reading and posting
5. On success, you'll be redirected back with the account connected

### Connect Facebook Pages

1. Go to `/admin/social-media/accounts`
2. Click **Connect Facebook**
3. Log in with your Facebook account
4. Select the Pages you want to connect
5. Grant all requested permissions
6. Instagram Business accounts linked to those Pages are automatically discovered

### Connect LinkedIn

1. Go to `/admin/social-media/accounts`
2. Click **Connect LinkedIn**
3. Log in with your LinkedIn account
4. Select the Organization Pages you want to connect
5. Grant posting and analytics permissions

### Connect YouTube

1. Go to `/admin/social-media/accounts`
2. Click **Connect YouTube**
3. Log in with your Google account
4. Grant YouTube channel access
5. Your channel will be connected for metrics viewing

### Connect Discord

Discord uses a bot token and doesn't require OAuth connection through the dashboard:

1. Set up the bot following the [Discord Bot](#discord-bot) instructions above
2. Add environment variables to your deployment
3. The bot will automatically be available for announcements

---

## Posting Content

### Twitter Posts

**API Endpoint**: `POST /api/social/twitter/posts`

```typescript
// Request body
{
  "accountId": "string",  // SocialAccount ID
  "content": "string",    // Tweet text (max 280 chars)
  "replyToId": "string",  // Optional: Tweet ID to reply to
  "mediaIds": ["string"]  // Optional: Media IDs to attach
}

// Response
{
  "success": true,
  "post": {
    "platformPostId": "1234567890",
    "url": "https://x.com/spike_land/status/1234567890",
    "publishedAt": "2025-01-04T12:00:00Z"
  }
}
```

### Facebook Page Posts

**API Endpoint**: `POST /api/social/facebook/posts`

```typescript
// Request body
{
  "accountId": "string",     // SocialAccount ID
  "content": "string",       // Post message
  "link": "string",          // Optional: URL to share
  "scheduledAt": "string"    // Optional: ISO date for scheduling
}
```

### Instagram Posts

**API Endpoint**: `POST /api/social/instagram/posts`

```typescript
// Request body
{
  "accountId": "string",   // SocialAccount ID
  "imageUrl": "string",    // Required: Public HTTPS image URL
  "caption": "string"      // Optional: Post caption
}
```

Note: Instagram requires an image - text-only posts are not supported.

### LinkedIn Organization Posts

**API Endpoint**: `POST /api/social/linkedin/posts`

```typescript
// Request body
{
  "accountId": "string",  // SocialAccount ID
  "content": "string",    // Post text
  "link": "string"        // Optional: URL to share
}
```

### Discord Announcements

**API Endpoint**: `POST /api/social/discord/announce`

```typescript
// Request body
{
  "content": "string",    // Message text (max 2000 chars)
  "embeds": [{            // Optional: Rich embeds
    "title": "string",
    "description": "string",
    "color": 5814783,     // Decimal color
    "fields": [{
      "name": "string",
      "value": "string",
      "inline": true
    }],
    "thumbnail": { "url": "string" },
    "image": { "url": "string" }
  }]
}
```

---

## Reading Analytics

### Twitter Metrics

**API Endpoint**: `GET /api/social/twitter/metrics?accountId={id}`

Returns:

- Followers count
- Following count
- Tweet count
- Engagement metrics (likes, retweets, replies)

### Facebook Page Insights

**API Endpoint**: `GET /api/social/facebook/metrics?accountId={id}`

Returns:

- Page fans (followers)
- Page impressions
- Page reach
- Engaged users

### Instagram Insights

**API Endpoint**: `GET /api/social/instagram/metrics?accountId={id}`

Returns:

- Followers count
- Following count
- Impressions
- Reach

### LinkedIn Statistics

**API Endpoint**: `GET /api/social/linkedin/metrics?accountId={id}`

Returns:

- Follower count
- Share statistics
- Engagement rate

### YouTube Channel Metrics

**API Endpoint**: `GET /api/social/youtube/metrics?accessToken={token}&channelId={id}`

Returns:

- Subscriber count
- Total views
- Video count
- Recent video performance

### Discord Server Metrics

**API Endpoint**: `GET /api/social/discord/metrics`

Returns:

- Member count
- Online count
- Server name
- Boost tier and count

---

## Content Guidelines

### Brand Voice

- **Professional but approachable**: Balance technical expertise with friendly communication
- **Helpful and educational**: Share tips, tutorials, and insights about photo enhancement
- **Authentic**: Share genuine updates about product development and company news

### Posting Frequency

| Platform  | Recommended Frequency       |
| --------- | --------------------------- |
| Twitter/X | 1-3 times daily             |
| LinkedIn  | 2-3 times weekly            |
| Facebook  | 1-2 times daily             |
| Instagram | 1 time daily                |
| YouTube   | 1-2 times weekly            |
| Discord   | As needed for announcements |

### Content Types

1. **Product Updates**: New features, improvements, bug fixes
2. **Tutorials**: How-to guides for photo enhancement
3. **Before/After**: Showcase enhancement results (with permission)
4. **Behind the Scenes**: Development updates, team insights
5. **User Stories**: Customer success stories and testimonials
6. **Industry News**: Relevant photography and AI news

### Hashtags

Recommended hashtags for discoverability:

- `#PhotoEnhancement`
- `#AIPhotography`
- `#4KUpscaling`
- `#PhotoRestoration`
- `#spike_land`

---

## Troubleshooting

### OAuth Errors

#### "Invalid redirect URI"

- Verify the callback URL matches exactly in the platform's developer console
- Check for trailing slashes
- Ensure HTTPS in production

#### "Token expired"

- Refresh tokens are used automatically when available
- If refresh fails, the account status is set to `EXPIRED`
- Reconnect the account through the dashboard

#### "Insufficient permissions"

- Verify all required scopes are approved in the platform's developer console
- Some permissions require app review (especially Facebook/Instagram)

### API Rate Limits

| Platform  | Rate Limit                     |
| --------- | ------------------------------ |
| Twitter   | 300 tweets/3 hours (user auth) |
| Facebook  | 200 calls/hour per user        |
| Instagram | 25 posts/24 hours              |
| LinkedIn  | 100 requests/day per member    |
| YouTube   | 10,000 units/day               |
| Discord   | 50 requests/second             |

### Common Issues

#### Twitter PKCE Errors

- Ensure code_verifier is stored in cookies before redirect
- Code verifier must match the one used to generate code_challenge

#### Instagram Container Errors

- Image URL must be publicly accessible HTTPS
- Container creation is async - allow time for processing
- Check container status before publishing

#### Discord Bot Offline

- Verify bot token is correct
- Check bot is invited to the server with proper permissions
- Ensure the announcement channel ID is correct

---

## Environment Variables

Add these to your `.env.local` file:

```bash
# Twitter/X API v2
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_CALLBACK_URL=https://spike.land/api/social/twitter/callback

# Facebook/Instagram Graph API
FACEBOOK_SOCIAL_APP_ID=your-facebook-app-id
FACEBOOK_SOCIAL_APP_SECRET=your-facebook-app-secret
FACEBOOK_SOCIAL_CALLBACK_URL=https://spike.land/api/social/facebook/callback

# LinkedIn API
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=https://spike.land/api/social/linkedin/callback

# YouTube Data API (uses Google OAuth)
YOUTUBE_CALLBACK_URL=https://spike.land/api/social/youtube/callback

# Discord Bot
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_SERVER_ID=your-discord-server-id
DISCORD_ANNOUNCEMENT_CHANNEL_ID=your-announcement-channel-id

# Token Encryption (required for production)
TOKEN_ENCRYPTION_KEY=your-64-character-hex-key
```

---

## Database Schema

Social media data is stored in these Prisma models:

### SocialAccount

Stores connected social media accounts:

```prisma
model SocialAccount {
  id                    String   @id @default(cuid())
  platform              SocialPlatform
  accountId             String   // Platform-specific ID
  accountName           String   // Display name
  accessTokenEncrypted  String   // AES-256-GCM encrypted
  refreshTokenEncrypted String?
  tokenExpiresAt        DateTime?
  connectedAt           DateTime @default(now())
  status                SocialAccountStatus
  metadata              Json?    // Platform-specific data
  userId                String
  user                  User     @relation(...)
}
```

### SocialPost

Stores posts created through the platform:

```prisma
model SocialPost {
  id          String   @id @default(cuid())
  content     String
  scheduledAt DateTime?
  publishedAt DateTime?
  status      SocialPostStatus
  metadata    Json?
  createdById String
}
```

### SocialMetrics

Stores historical metrics:

```prisma
model SocialMetrics {
  id             String   @id @default(cuid())
  accountId      String
  date           DateTime @default(now())
  followers      Int
  following      Int
  postsCount     Int
  engagementRate Float?
  impressions    Int?
  reach          Int?
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Full database documentation
- [Token System](./TOKEN_SYSTEM.md) - Understanding the token economy
