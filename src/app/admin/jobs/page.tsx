/**
 * Admin Jobs Page
 *
 * Server component that renders the job management dashboard.
 */

import { JobsAdminClient } from "./JobsAdminClient";

export const dynamic = "force-dynamic";

export default function AdminJobsPage() {
  return <JobsAdminClient />;
}
