"use client";

import AbTestResults from "@/components/admin/marketing/ab-tests/AbTestResults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateChiSquared, chiSquaredToPValue } from "@/lib/ab-testing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

interface VariantResult {
  converted: boolean;
}

interface Variant {
  id: string;
  name: string;
  results: VariantResult[];
}

interface AbTest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  significanceLevel: number;
  winnerVariantId: string | null;
  variants: Variant[];
}

interface UpdateTestData {
  status?: string;
  winnerVariantId?: string;
}

export default function AbTestDetailsPage() {
  const params = useParams();
  const id = params["id"] as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ test: AbTest; }>({
    queryKey: ["ab-test", id],
    queryFn: () => fetch(`/api/ab-tests/${id}`).then((res) => res.json()),
  });

  const updateTestMutation = useMutation<unknown, Error, UpdateTestData>({
    mutationFn: (updateData) =>
      fetch(`/api/ab-tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-test", id] });
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast.success("A/B Test updated successfully");
    },
    onError: () => {
      toast.error("Failed to update A/B Test");
    },
  });

  const checkAndUpdateWinner = useCallback(
    (test: AbTest) => {
      if (test.status === "RUNNING") {
        const variantsWithStats = test.variants.map((variant) => {
          const visitors = variant.results.length;
          const conversions = variant.results.filter((r) => r.converted).length;
          const conversionRate = visitors > 0 ? conversions / visitors : 0;
          return { ...variant, visitors, conversions, conversionRate };
        });

        const chiSquared = calculateChiSquared(variantsWithStats);
        const pValue = chiSquaredToPValue(chiSquared);
        const significance = 1 - pValue;

        if (significance >= test.significanceLevel) {
          const winner = variantsWithStats.reduce((prev, current) =>
            prev.conversionRate > current.conversionRate ? prev : current
          );
          updateTestMutation.mutate({
            status: "COMPLETED",
            winnerVariantId: winner.id,
          });
        }
      }
    },
    [updateTestMutation],
  );

  useEffect(() => {
    if (data?.test) {
      checkAndUpdateWinner(data.test);
    }
  }, [data, checkAndUpdateWinner]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const test = data?.test;

  if (!test) {
    return <p>Test not found</p>;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "default";
      case "COMPLETED":
        return "secondary";
      case "ARCHIVED":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">{test.name}</h2>
            <Badge variant={getStatusVariant(test.status)} data-testid="test-status">
              {test.status}
            </Badge>
          </div>
          <p className="text-gray-500">{test.description}</p>
        </div>
        <div className="flex gap-2">
          {test.status === "DRAFT" && (
            <Button
              onClick={() => updateTestMutation.mutate({ status: "RUNNING" })}
            >
              Start Test
            </Button>
          )}
          {test.status === "RUNNING" && (
            <Button
              onClick={() => updateTestMutation.mutate({ status: "COMPLETED" })}
            >
              End Test
            </Button>
          )}
          {test.status === "COMPLETED" && (
            <Button
              onClick={() => updateTestMutation.mutate({ status: "ARCHIVED" })}
            >
              Archive Test
            </Button>
          )}
        </div>
      </div>
      <AbTestResults test={test} />
    </div>
  );
}
