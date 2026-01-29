"use client";

/**
 * Individual A/B test card displaying variants and statistics
 *
 * Shows test metadata, variants, and performance metrics.
 * Resolves #840
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AbTest } from "@/types/ab-test";
import { AbTestStatistics } from "./AbTestStatistics";
import { AbTestVariantCard } from "./AbTestVariantCard";

interface AbTestCardProps {
  test: AbTest;
  workspaceSlug: string;
}

export function AbTestCard({ test, workspaceSlug }: AbTestCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "default";
      case "COMPLETED":
        return "secondary";
      case "DRAFT":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{test.name}</CardTitle>
            <CardDescription>
              Created {new Date(test.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(test.status)}>{test.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variants */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {test.variants.map((variant) => (
              <AbTestVariantCard
                key={variant.id}
                variant={variant}
                isWinner={test.winnerVariantId === variant.id}
              />
            ))}
          </div>
        </div>

        {/* Statistics (only for running/completed tests) */}
        {test.status !== "DRAFT" && (
          <AbTestStatistics
            testId={test.id}
            workspaceSlug={workspaceSlug}
            status={test.status}
          />
        )}
      </CardContent>
    </Card>
  );
}
