/**
 * Boost Analytics Dashboard - Issue #570
 *
 * Main dashboard for viewing boost campaign effectiveness,
 * organic vs paid comparisons, and ML-generated recommendations.
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boost Analytics | Spike Land Orbit',
  description: 'Measure the effectiveness of boosting organic content to paid ads',
};

export default function BoostAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Boost Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Measure the effectiveness of boosting organic content to paid ads.
          Compare organic vs paid performance and get AI-powered recommendations.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Boosts</div>
          <div className="text-2xl font-bold mt-2">0</div>
          <div className="text-xs text-muted-foreground mt-1">No boosts yet</div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Average ROI</div>
          <div className="text-2xl font-bold mt-2">--</div>
          <div className="text-xs text-muted-foreground mt-1">N/A</div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Spend</div>
          <div className="text-2xl font-bold mt-2">$0.00</div>
          <div className="text-xs text-muted-foreground mt-1">Across all boosts</div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Incremental Conversions</div>
          <div className="text-2xl font-bold mt-2">0</div>
          <div className="text-xs text-muted-foreground mt-1">From paid boosts</div>
        </div>
      </div>

      {/* Getting Started Message */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Get Started with Boost Analytics</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Start boosting your best-performing organic content to paid ads.
          Track effectiveness, compare organic vs paid performance, and get
          AI-powered recommendations for future boosts.
        </p>

        <div className="space-y-4 max-w-2xl mx-auto text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">1. Create a Boost Campaign</h3>
              <p className="text-sm text-muted-foreground">
                Select an organic post that's performing well and boost it to paid ads
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">2. Track Performance</h3>
              <p className="text-sm text-muted-foreground">
                Monitor organic vs paid performance with detailed attribution analysis
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 mt-1">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">3. Get AI Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Receive data-driven insights and recommendations for future boosts
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
            disabled
          >
            Create First Boost Campaign (Coming Soon)
          </button>
        </div>
      </div>

      {/* Implementation Note */}
      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
        <strong>Implementation Status:</strong> This is a foundational implementation of Issue #570.
        The database schema, TypeScript types, core services (BoostCampaignService, AttributionService),
        and API endpoints have been created. The full UI dashboard with charts, insights panel, and
        recommendations list will be implemented in subsequent phases.
      </div>
    </div>
  );
}
