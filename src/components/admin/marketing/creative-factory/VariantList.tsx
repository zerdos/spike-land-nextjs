"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CreativeSet, type CreativeVariant } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VariantListProps {
  jobId: string;
}

type JobData = CreativeSet & {
  variants: CreativeVariant[];
};

export function VariantList({ jobId }: VariantListProps) {
  const [data, setData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 150;

  useEffect(() => {
    const fetchData = async () => {
      pollCountRef.current++;
      if (pollCountRef.current >= MAX_POLLS) {
        setError("Job timed out - please refresh to check status");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch(`/api/creative-factory/jobs/${jobId}`);
        if (!response.ok) throw new Error("Failed to fetch job");
        const json = await response.json();
        setData(json);

        if (json.jobStatus === "COMPLETED" || json.jobStatus === "FAILED") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load variants");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    fetchData();
    intervalRef.current = setInterval(fetchData, 2000); // Poll every 2s

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobId]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generation Status: {data.jobStatus}</h3>
        {data.jobStatus === "PROCESSING" && <Loader2 className="animate-spin" />}
      </div>

      {data.errorMessage && (
        <div className="p-4 bg-red-50 text-red-600 rounded">{data.errorMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.variants.map((variant) => (
          <Card key={variant.id} className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Variant {variant.variantNumber}
              </CardTitle>
              <div className="flex gap-2">
                {variant.tone && <Badge variant="outline">{variant.tone}</Badge>}
                {variant.length && <Badge variant="secondary">{variant.length}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Headline
                </span>
                <p className="font-medium">{variant.headline}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Body</span>
                <p className="text-sm whitespace-pre-wrap">{variant.bodyText}</p>
              </div>
              {variant.callToAction && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">CTA</span>
                  <p className="text-sm font-medium text-primary">{variant.callToAction}</p>
                </div>
              )}
              {variant.aiPrompt && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Image Prompt
                  </span>
                  <p className="text-xs text-muted-foreground italic">{variant.aiPrompt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
