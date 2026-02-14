# Vercel Analytics Setup Guide

This document explains how to configure Vercel Analytics and Speed Insights for
spike.land.

## Overview

The project uses:

- `@vercel/analytics` for tracking page views and custom events
- `@vercel/speed-insights` for monitoring Core Web Vitals

## Current Implementation

### Package Installation

Both packages are installed and configured:

```json
{
  "@vercel/analytics": "1.6.1",
  "@vercel/speed-insights": "1.3.1"
}
```

### Integration in Layout

The Analytics and SpeedInsights components are properly integrated in the root
layout:

```tsx
// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* ... */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Event Tracking

The project includes a custom analytics wrapper in `src/lib/analytics.ts` that:

- Respects user cookie consent preferences
- Provides typed event tracking for wizard, auth, app management, and error
  events
- Filters out undefined values to match Vercel Analytics requirements

## Content Security Policy Configuration

The CSP has been updated to allow Vercel Analytics and Speed Insights:

```typescript
// next.config.ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
"connect-src 'self' ... https://va.vercel-analytics.com https://vitals.vercel-insights.com",
```

## Required Vercel Dashboard Configuration

### Enabling Analytics

The 404 error for `/_vercel/insights/script.js` occurs when Analytics is not
enabled in the Vercel dashboard. To fix this:

1. Go to your project on Vercel dashboard:
   https://vercel.com/your-team/spike-land-nextjs
2. Navigate to **Settings** → **Analytics**
3. Enable **Analytics** if not already enabled
4. Enable **Audiences** if you want visitor segmentation
5. Save the settings
6. Trigger a new deployment (or push a commit)

### Enabling Speed Insights

Similarly, ensure Speed Insights is enabled:

1. Go to **Settings** → **Speed Insights**
2. Enable **Speed Insights**
3. Save and redeploy

### Important Notes

- Analytics and Speed Insights are **production-only features** by default
- Preview deployments may have limited analytics tracking
- After enabling in the dashboard, you must redeploy for changes to take effect
- The `/_vercel/insights/script.js` endpoint is automatically injected by
  Vercel's platform during deployment

## Troubleshooting

### 404 Error on `/_vercel/insights/script.js`

If you see this error:

```
[ERROR] Failed to load resource: the server responded with a status of 404 () @ https://spike.land/_vercel/insights/script.js
```

**Causes:**

1. Analytics not enabled in Vercel dashboard (most common)
2. Recent deployment hasn't propagated yet
3. CSP blocking the script (now fixed)
4. Using Cloudflare proxy that needs configuration

**Solutions:**

1. Enable Analytics in Vercel dashboard (see above)
2. Trigger a new deployment
3. Wait 5-10 minutes for changes to propagate
4. Check browser console for CSP violations
5. If using Cloudflare, ensure it's not blocking Vercel's scripts

### Verifying Analytics is Working

1. Deploy the application
2. Visit your production site: https://spike.land
3. Navigate between pages
4. Wait 5-10 minutes for data to appear
5. Check Vercel dashboard → Analytics tab

### Testing Custom Events

Custom events are tracked using the wrapper in `src/lib/analytics.ts`:

```typescript
import { analytics } from "@/lib/analytics";

// Track wizard events
analytics.wizard.started();
analytics.wizard.stepCompleted(2);

// Track auth events
analytics.auth.loginStarted("github");
analytics.auth.loginCompleted("github");

// Track app events
analytics.app.viewed("app-id");
analytics.app.created("app-id");
```

Events respect cookie consent and only fire when consent is "accepted".

## References

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)
- [Next.js Analytics Guide](https://nextjs.org/docs/app/guides/analytics)
- [GitHub Issue #49](https://github.com/vercel/analytics/issues/49) - Common 404
  error
- [GitHub Issue #83](https://github.com/vercel/analytics/issues/83) - HTTP 404
  for script.js

## Summary

The code implementation is correct. The 404 error is resolved by:

1. Updating CSP to allow Vercel's analytics domains (done)
2. Enabling Analytics in Vercel dashboard (requires manual action)
3. Redeploying the application (required after dashboard changes)
