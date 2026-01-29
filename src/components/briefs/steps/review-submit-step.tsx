"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBriefStore } from "@/lib/store/brief";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Check, Edit } from "lucide-react";
import { format } from "date-fns";

interface ReviewSubmitStepProps {
  onValidChange: (isValid: boolean) => void;
}

export function ReviewSubmitStep({ onValidChange }: ReviewSubmitStepProps) {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.["workspaceSlug"] as string;

  const {
    briefName,
    targetAudience,
    campaignObjectives,
    creativeRequirements,
    setStep,
    reset,
  } = useBriefStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always allow viewing the review
    onValidChange(true);
  }, [onValidChange]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orbit/briefs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: briefName,
          targetAudience,
          campaignObjectives,
          creativeRequirements,
          workspaceSlug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create brief");
      }

      const data = await response.json();

      // Reset the store and redirect
      reset();
      router.push(`/orbit/${workspaceSlug}/briefs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        {/* Brief Name */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Brief Name</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <p className="text-muted-foreground">{briefName}</p>
        </div>

        <Separator />

        {/* Target Audience */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Target Audience</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <strong>Age Range:</strong> {targetAudience.demographics?.ageRange}
            </div>
            <div>
              <strong>Gender:</strong> {targetAudience.demographics?.gender}
            </div>
            <div>
              <strong>Location:</strong> {targetAudience.demographics?.location}
            </div>
            <div>
              <strong>Interests:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {targetAudience.interests?.map((interest) => (
                  <Badge key={interest} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <strong>Behaviors:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {targetAudience.behaviors?.map((behavior) => (
                  <Badge key={behavior} variant="outline" className="text-xs">
                    {behavior}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Campaign Objectives */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Campaign Objectives</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <strong>Objective:</strong> {campaignObjectives.objective}
            </div>
            <div>
              <strong>KPIs:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {campaignObjectives.kpis?.map((kpi) => (
                  <Badge key={kpi} variant="outline" className="text-xs">
                    {kpi}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <strong>Success Metrics:</strong>
              <p className="mt-1">{campaignObjectives.successMetrics}</p>
            </div>
            {campaignObjectives.deadline && (
              <div>
                <strong>Deadline:</strong> {format(campaignObjectives.deadline, "PPP")}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Creative Requirements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Creative Requirements</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep(4)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <strong>Platforms:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {creativeRequirements.platforms?.map((platform) => (
                  <Badge key={platform} variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <strong>Formats:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {creativeRequirements.formats?.map((format) => (
                  <Badge key={format} variant="outline" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <strong>Tone of Voice:</strong> {creativeRequirements.toneOfVoice}
            </div>
            {creativeRequirements.brandGuidelines && (
              <div>
                <strong>Brand Guidelines:</strong>
                <p className="mt-1">{creativeRequirements.brandGuidelines}</p>
              </div>
            )}
            {creativeRequirements.colorPalette && creativeRequirements.colorPalette.length > 0 && (
              <div>
                <strong>Color Palette:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {creativeRequirements.colorPalette.map((color) => (
                    <Badge key={color} variant="outline" className="text-xs">
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {creativeRequirements.mustInclude && creativeRequirements.mustInclude.length > 0 && (
              <div>
                <strong>Must Include:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {creativeRequirements.mustInclude.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {creativeRequirements.mustAvoid && creativeRequirements.mustAvoid.length > 0 && (
              <div>
                <strong>Must Avoid:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {creativeRequirements.mustAvoid.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Brief...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Create Brief
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
