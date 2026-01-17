"use client";

import { useBriefStore } from "@/lib/store/brief";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BriefPreview() {
  const { targetAudience, campaignObjectives } = useBriefStore();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Campaign Brief Preview</CardTitle>
        <CardDescription>
          This is a real-time preview of your campaign brief.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(targetAudience).length > 0 && (
          <div>
            <h3 className="font-semibold">Target Audience</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>
                <strong>Age Range:</strong> {targetAudience.demographics?.ageRange}
              </p>
              <p>
                <strong>Gender:</strong> {targetAudience.demographics?.gender}
              </p>
              <p>
                <strong>Location:</strong> {targetAudience.demographics?.location}
              </p>
              <p>
                <strong>Interests:</strong> {targetAudience.interests?.join(", ")}
              </p>
              <p>
                <strong>Behaviors:</strong> {targetAudience.behaviors?.join(", ")}
              </p>
            </div>
          </div>
        )}
        {Object.keys(campaignObjectives).length > 0 && (
          <div>
            <h3 className="font-semibold">Campaign Objectives</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>
                <strong>Objective:</strong> {campaignObjectives.objective}
              </p>
              <p>
                <strong>KPIs:</strong> {campaignObjectives.kpis?.join(", ")}
              </p>
              <p>
                <strong>Success Metrics:</strong>{" "}
                {campaignObjectives.successMetrics}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
