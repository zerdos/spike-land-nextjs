"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type BrandProfileFormData,
  brandProfileSchema,
  DEFAULT_BRAND_PROFILE_FORM,
} from "@/lib/validations/brand-brain";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  BrandBasicsStep,
  GuardrailsStep,
  ReviewStep,
  VisualIdentityStep,
  VoiceToneStep,
} from "./steps";

const STORAGE_KEY_PREFIX = "brand-brain-setup-";

const STEPS = [
  { title: "Brand Basics", description: "Name, mission, and values" },
  { title: "Voice & Tone", description: "Define your brand voice" },
  { title: "Visual Identity", description: "Logo and colors" },
  { title: "Guardrails", description: "Content rules and vocabulary" },
  { title: "Review", description: "Confirm your settings" },
] as const;

interface BrandBrainWizardProps {
  workspaceId: string;
  workspaceSlug: string;
  existingProfile?: BrandProfileFormData | null;
}

export function BrandBrainWizard({
  workspaceId,
  workspaceSlug,
  existingProfile,
}: BrandBrainWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${workspaceSlug}`;
  const isEditMode = !!existingProfile;

  const form = useForm<BrandProfileFormData>({
    resolver: zodResolver(brandProfileSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: existingProfile || DEFAULT_BRAND_PROFILE_FORM,
  });

  // Load draft from localStorage on mount (only for new profiles)
  useEffect(() => {
    setIsClient(true);

    if (typeof window === "undefined" || isEditMode) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        form.reset(data);
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, [form, storageKey, isEditMode]);

  // Save draft to localStorage on form changes (only for new profiles)
  useEffect(() => {
    if (!isClient || isEditMode) return;
    if (typeof window === "undefined") return;

    const subscription = form.watch((data) => {
      localStorage.setItem(storageKey, JSON.stringify(data));
    });

    return () => subscription.unsubscribe();
  }, [form, storageKey, isClient, isEditMode]);

  // Validate current step
  const validateCurrentStep = useCallback(async () => {
    const stepFields: (keyof BrandProfileFormData)[][] = [
      ["name", "mission", "values"], // Step 0
      ["toneDescriptors"], // Step 1
      ["logoUrl", "logoR2Key", "colorPalette"], // Step 2
      ["guardrails", "vocabulary"], // Step 3
      [], // Step 4 - Review
    ];

    const fields = stepFields[currentStep];
    if (!fields || fields.length === 0) return true;

    const result = await form.trigger(fields);
    return result;
  }, [currentStep, form]);

  // Handle next step
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, validateCurrentStep]);

  // Handle previous step
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Handle step click
  const handleStepClick = useCallback(
    async (step: number) => {
      if (step < currentStep) {
        setCurrentStep(step);
      } else if (step > currentStep) {
        // Validate all steps up to the target
        for (let i = currentStep; i < step; i++) {
          setCurrentStep(i);
          const isValid = await validateCurrentStep();
          if (!isValid) return;
        }
        setCurrentStep(step);
      }
    },
    [currentStep, validateCurrentStep],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: BrandProfileFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const method = isEditMode ? "PATCH" : "POST";
        const response = await fetch(
          `/api/workspaces/${workspaceId}/brand-profile`,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save brand profile");
        }

        // Clear localStorage draft
        if (typeof window !== "undefined") {
          localStorage.removeItem(storageKey);
        }

        setSubmitSuccess(true);

        // Redirect to brand brain overview after short delay
        setTimeout(() => {
          router.push(`/orbit/${workspaceSlug}/brand-brain`);
        }, 1500);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditMode, workspaceId, workspaceSlug, storageKey, router],
  );

  // Calculate progress
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BrandBasicsStep disabled={isSubmitting} />;
      case 1:
        return <VoiceToneStep disabled={isSubmitting} />;
      case 2:
        return (
          <VisualIdentityStep
            disabled={isSubmitting}
            workspaceId={workspaceId}
          />
        );
      case 3:
        return <GuardrailsStep disabled={isSubmitting} />;
      case 4:
        return (
          <ReviewStep
            disabled={isSubmitting}
            onEditStep={(step) => setCurrentStep(step)}
          />
        );
      default:
        return null;
    }
  };

  if (!isClient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "Edit Brand Profile" : "Brand Brain Setup"}
          </h1>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Step Indicators */}
        <div className="flex justify-between">
          {STEPS.map((step, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleStepClick(index)}
              disabled={isSubmitting}
              className={cn(
                "flex flex-col items-center gap-1 text-xs transition-colors",
                index <= currentStep
                  ? "text-foreground"
                  : "text-muted-foreground",
                index < currentStep && "cursor-pointer hover:text-primary",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  index < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-primary bg-background text-primary"
                    : "border-muted bg-background text-muted-foreground",
                )}
              >
                {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : (
                  index + 1
                )}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Success!</AlertTitle>
          <AlertDescription>
            Your brand profile has been saved. Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Step Content */}
          <div className="rounded-lg border bg-card p-6">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || isSubmitting}
            >
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {currentStep === STEPS.length - 1
                ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || submitSuccess}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? "Update Profile" : "Create Profile"}
                  </Button>
                )
                : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    Next
                  </Button>
                )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
