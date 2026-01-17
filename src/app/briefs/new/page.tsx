"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
"use client";

import { useBriefStore } from "@/lib/store/brief";
import { TargetAudienceForm } from "@/components/briefs/target-audience-form";
import { CampaignObjectivesForm } from "@/components/briefs/campaign-objectives-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  targetAudienceSchema,
  campaignObjectivesSchema,
} from "@/lib/validation/brief";
import { z } from "zod";

type TargetAudienceFormValues = z.infer<typeof targetAudienceSchema>;
type CampaignObjectivesFormValues = z.infer<typeof campaignObjectivesSchema>;

export default function NewBriefPage() {
  const {
    step,
    setStep,
    setTargetAudience,
    setCampaignObjectives,
  } = useBriefStore();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onTargetAudienceSubmit = (data: TargetAudienceFormValues) => {
    setTargetAudience(data);
    handleNext();
  };

  const onCampaignObjectivesSubmit = (data: CampaignObjectivesFormValues) => {
    setCampaignObjectives(data);
    handleNext();
  };

import { BriefPreview } from "@/components/briefs/brief-preview";

...

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Create a new campaign brief</CardTitle>
          <CardDescription>
            Step {step} of 3: Define your campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <TargetAudienceForm onSubmit={onTargetAudienceSubmit} />
          )}
          {step === 2 && (
            <CampaignObjectivesForm onSubmit={onCampaignObjectivesSubmit} />
          )}
          {step === 3 && <div>Step 3: Review and Export</div>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
          >
            Previous
          </Button>
          <button
            form={
              step === 1
                ? "target-audience-form"
                : "campaign-objectives-form"
            }
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
            disabled={step === 3}
          >
            Next
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
