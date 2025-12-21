/**
 * Admin Try-Catch Stats Page
 *
 * View try-catch statistics per user with real-time updates.
 */

import { TryCatchStatsClient } from "./TryCatchStatsClient";

export default function AdminTryCatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Try-Catch Observability</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Real-time tracking of try-catch operations across the application
        </p>
      </div>

      <TryCatchStatsClient />
    </div>
  );
}
