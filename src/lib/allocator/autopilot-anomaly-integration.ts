import prisma from '@/lib/prisma';
import type { AutopilotAnomaly } from './autopilot-types';

export class AutopilotAnomalyIntegration {
  /**
   * Check for anomalies that should pause the autopilot.
   * This integrates with existing monitoring systems or simple heuristics.
   */
  static async checkForAnomalies(workspaceId: string): Promise<AutopilotAnomaly[]> {
    const anomalies: AutopilotAnomaly[] = [];

    // 1. Check for Social Metric Anomalies (Pulse integration)
    // Resolves #647 integration
    const recentAnomalies = await prisma.socialMetricAnomaly.findMany({
      where: {
        account: { workspaceId },
        severity: 'critical',
        detectedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
    });

    if (recentAnomalies.length > 0) {
      anomalies.push({
        workspaceId,
        type: 'SOCIAL_METRIC_SPIKE',
        severity: 'critical',
        detectedAt: recentAnomalies[0].detectedAt,
        description: `Critical social metric anomaly detected: ${recentAnomalies[0].direction} in ${recentAnomalies[0].metricType}`,
      });
    }

    // 2. Check for unexpected spending spikes (Allocator internal check)
    // Logic: If spend in last hour > 3x average hourly spend
    // Implementation skipped for MVP, placeholder

    return anomalies;
  }
}
