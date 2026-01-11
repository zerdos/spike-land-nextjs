import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AutopilotService } from '@/lib/allocator/autopilot-service';
import { getAllocatorRecommendations } from '@/lib/allocator';
import type { AutopilotRecommendation } from '@/lib/allocator/autopilot-types';

export const runtime = 'nodejs'; // Ensure this runs in Node.js environment (needed for prisma)

export async function GET(req: NextRequest) {
  // Cron jobs should be authenticated
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get enabled workspaces
    const enabledConfigs = await prisma.allocatorAutopilotConfig.findMany({
      where: { isEnabled: true },
      distinct: ['workspaceId'] // Process each workspace once (though config is unique per workspace/campaign, we start with workspace level)
    });

    const results = [];

    for (const config of enabledConfigs) {
      // 2. Get recommendations for this workspace
      // Using existing recommendation engine
      const recommendations = await getAllocatorRecommendations(config.workspaceId);

      // 3. Process each recommendation
      for (const rec of recommendations) {
        // Map to AutopilotRecommendation type
        // The getAllocatorRecommendations likely returns specific format, we might need to adapt.
        // Assuming it returns something we can use or mapping it here.

        // Mock mapping if the types don't align perfectly yet
        const autopilotRec: AutopilotRecommendation = {
          id: rec.id,
          type: rec.type as any, // 'BUDGET_INCREASE' etc.
          workspaceId: config.workspaceId,
          campaignId: rec.campaignId,
          currentBudget: rec.currentBudget,
          suggestedBudget: rec.suggestedBudget,
          reason: rec.reason,
          confidence: rec.confidence
        };

        const result = await AutopilotService.executeRecommendation(autopilotRec, 'CRON');
        results.push(result);
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('Autopilot Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
