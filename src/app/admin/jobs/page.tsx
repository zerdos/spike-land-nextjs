/**
 * Admin Jobs Page
 *
 * Server component that renders the job management dashboard.
 * Supports direct linking via ?jobId=xxx query parameter.
 */

import { JobsAdminClient } from "./JobsAdminClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ jobId?: string; }>;
}

export default async function AdminJobsPage({ searchParams }: PageProps) {
  const { jobId } = await searchParams;
  return <JobsAdminClient initialJobId={jobId} />;
}
