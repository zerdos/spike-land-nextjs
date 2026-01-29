"use client";

import { useBriefStore } from "@/lib/store/brief";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { BriefNameStep } from "./steps/brief-name-step";
import { TargetAudienceStep } from "./steps/target-audience-step";
import { CampaignObjectivesStep } from "./steps/campaign-objectives-step";
import { CreativeRequirementsStep } from "./steps/creative-requirements-step";
import { ReviewSubmitStep } from "./steps/review-submit-step";

const steps = [
  { id: 1, name: "Brief Name", component: BriefNameStep },
  { id: 2, name: "Target Audience", component: TargetAudienceStep },
  { id: 3, name: "Campaign Objectives", component: CampaignObjectivesStep },
  { id: 4, name: "Creative Requirements", component: CreativeRequirementsStep },
  { id: 5, name: "Review & Submit", component: ReviewSubmitStep },
];

export function BriefWizard() {
  const { step, setStep, reset } = useBriefStore();
  const [isValid, setIsValid] = useState(false);

  const currentStep = steps.find((s) => s.id === step) || steps[0]!;
  const progress = (step / steps.length) * 100;

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
      setIsValid(false);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      setIsValid(true);
    }
  };

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    setIsValid(false);
  };

  const CurrentStepComponent = currentStep.component;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Step {step} of {steps.length}</span>
          <span className="text-muted-foreground">{currentStep.name}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => handleStepChange(s.id)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                step === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {step > s.id ? <Check className="h-5 w-5" /> : s.id}
            </button>
            {index < steps.length - 1 && (
              <div
                className={`h-[2px] w-12 mx-2 ${
                  step > s.id ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStep.name}</CardTitle>
          <CardDescription>
            {step === 1 && "Give your campaign brief a descriptive name"}
            {step === 2 && "Define who you want to reach with this campaign"}
            {step === 3 && "Set your campaign goals and success metrics"}
            {step === 4 && "Specify your creative requirements and brand guidelines"}
            {step === 5 && "Review your brief and submit"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent onValidChange={setIsValid} />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              window.location.href = "/orbit";
            }}
          >
            Cancel
          </Button>

          {step < steps.length ? (
            <Button onClick={handleNext} disabled={!isValid}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
