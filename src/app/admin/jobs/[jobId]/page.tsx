/**
 * Admin Job Direct Link Page
 *
 * Redirects to the main jobs page with the specific job selected.
 * Allows direct linking to specific jobs via /admin/jobs/[jobId]
 */

import { redirect } from "next/navigation";

interface PageParams {
  params: Promise<{ jobId: string; }>;
}

export default async function AdminJobPage({ params }: PageParams) {
  const { jobId } = await params;

  // Redirect to main jobs page with job ID as query param
  redirect(`/admin/jobs?jobId=${encodeURIComponent(jobId)}`);
}
