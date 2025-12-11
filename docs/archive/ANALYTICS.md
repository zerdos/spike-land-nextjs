# Analytics and Monitoring Integration

This document describes the analytics and monitoring setup for Spike Land.

## Overview

Spike Land uses Vercel Analytics and Speed Insights to track user behavior, monitor application performance, and make data-informed decisions. The implementation follows GDPR compliance requirements with cookie consent management.

## Features

### Phase 1 (MVP) - Implemented ✅

- **Vercel Analytics** - Built-in analytics for tracking page views and user interactions
- **Vercel Speed Insights** - Performance monitoring for Core Web Vitals
- **Cookie Consent Banner** - GDPR-compliant consent management
- **Event Tracking Utilities** - Structured event tracking system

### Phase 2 (Future)

- PostHog for advanced analytics with A/B testing
- Feature flags

### Phase 3 (Future)

- Custom analytics dashboard
- Data warehouse integration
- Advanced funnel analysis

## Installation

The following packages are installed:

```bash
npm install @vercel/analytics @vercel/speed-insights
```

## Components

### Root Layout Integration

Analytics components are automatically loaded in the root layout (`src/app/layout.tsx`):

- **Analytics** - Tracks page views and custom events
- **SpeedInsights** - Monitors performance metrics
- **CookieConsent** - Manages user consent for analytics

### Cookie Consent Banner

Located at `src/components/analytics/cookie-consent.tsx`

**Features:**

- Displays on first visit
- Stores user preference in localStorage
- Shows accept/decline options
- Links to privacy policy
- GDPR compliant

**User Preferences:**

- `accepted` - Analytics enabled
- `declined` - Analytics disabled
- `null` - No preference (banner shown)

### Event Tracking Utilities

Located at `src/lib/analytics.ts`

**Core Function:**

```typescript
trackEvent(event: AnalyticsEvent, properties?: AnalyticsEventProperties): void
```

**Helper Methods:**

```typescript
// Wizard events
analytics.wizard.started({ source: "homepage" });
analytics.wizard.stepCompleted(2, { stepName: "configuration" });
analytics.wizard.abandoned(3, { reason: "timeout" });
analytics.wizard.completed({ duration: 120 });

// Authentication events
analytics.auth.loginStarted("github");
analytics.auth.loginCompleted("google");
analytics.auth.logout();

// App management events
analytics.app.viewed("app-123");
analytics.app.created("app-456");
analytics.app.edited("app-789");
analytics.app.deleted("app-000");
analytics.app.forked("app-original", "app-fork");

// Error events
analytics.error.occurred("Network error", "api-call");
analytics.error.validationFailed("email", "Invalid format");
```

## Usage

### Tracking Custom Events

```typescript
import { analytics } from "@/lib/analytics";

// Track wizard start
analytics.wizard.started({ source: "landing-page" });

// Track authentication
analytics.auth.loginStarted("github");

// Track app creation
analytics.app.created("new-app-id");

// Track errors
analytics.error.occurred("API Error", "fetchUserData");
```

### Privacy-First Design

- All tracking respects user consent
- Events are only sent if consent is accepted
- Server-side rendering safe (no tracking on SSR)
- localStorage-based consent storage
- Easy opt-out mechanism

## Event Types

### Wizard Events

- `wizard_started` - User starts app creation wizard
- `wizard_step_completed` - User completes a wizard step
- `wizard_abandoned` - User leaves wizard before completion
- `wizard_completed` - User successfully completes wizard

### Authentication Events

- `login_started` - User initiates login
- `login_completed` - User successfully logs in
- `logout` - User logs out

### App Management Events

- `app_viewed` - User views an app
- `app_created` - User creates new app
- `app_edited` - User edits an app
- `app_deleted` - User deletes an app
- `app_forked` - User forks an existing app

### Error Events

- `error_occurred` - Application error
- `validation_failed` - Form validation failure

## GDPR Compliance

### Cookie Consent

Users must explicitly consent before analytics tracking begins:

1. Banner displays on first visit
2. User can accept or decline
3. Preference stored in localStorage
4. Analytics only run with explicit consent

### Privacy Controls

- **Opt-out**: Users can decline analytics
- **Data Minimization**: Only essential data collected
- **Transparency**: Clear privacy policy link
- **User Control**: Easy to change preferences

### Privacy Policy

A privacy policy page should be created at `/privacy` that explains:

- What data is collected
- How data is used
- User rights under GDPR
- How to opt-out
- Contact information

## Configuration

### Vercel Dashboard

To view analytics:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to "Analytics" tab
4. View metrics and events

### Environment Variables

No environment variables required for basic functionality. Vercel Analytics works automatically when deployed to Vercel.

## Testing

All analytics components and utilities have 100% test coverage:

- `src/components/analytics/cookie-consent.test.tsx`
- `src/lib/analytics.test.ts`

Run tests:

```bash
npm run test:coverage
```

## Cost

- **Vercel Analytics**: Free tier available, paid plans start at $10/month
- **Vercel Speed Insights**: Included with Vercel Analytics

## Best Practices

1. **Track meaningful events** - Focus on key user actions
2. **Include context** - Add relevant properties to events
3. **Respect privacy** - Always check consent before tracking
4. **Test tracking** - Verify events in Vercel dashboard
5. **Monitor performance** - Use Speed Insights to identify bottlenecks

## Future Enhancements

### Phase 2: Advanced Analytics

- **PostHog Integration** - Advanced analytics and feature flags
- **Conversion Funnels** - Track user journey through app creation
- **Cohort Analysis** - Understand user retention

### Phase 3: Custom Dashboard

- **Custom Reports** - Build internal analytics dashboard
- **Data Export** - Export analytics to data warehouse
- **Advanced Visualizations** - Create custom charts and graphs

## Troubleshooting

### Analytics Not Showing

1. Verify consent is accepted: Check localStorage `cookie-consent`
2. Check Vercel deployment: Analytics requires Vercel hosting
3. Wait for data: Analytics may take 24 hours to appear

### Events Not Tracking

1. Verify consent: `localStorage.getItem('cookie-consent') === 'accepted'`
2. Check browser console for errors
3. Verify event name matches `AnalyticsEvent` type

### Cookie Banner Not Appearing

1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Check browser console for errors

## Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Web Analytics Best Practices](https://web.dev/analytics/)

## Support

For issues or questions:

- GitHub Issues: [spike-land-nextjs/issues](https://github.com/zerdos/spike-land-nextjs/issues)
- Related Issue: #29
