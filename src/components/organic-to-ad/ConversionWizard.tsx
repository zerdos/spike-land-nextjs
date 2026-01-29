/**
 * Organic-to-Ad Conversion Wizard Component
 * Issue: #567 (ORB-063)
 */

"use client";

import { useState } from "react";

interface ConversionWizardProps {
  postId: string;
  onComplete?: (conversionId: string) => void;
}

export function ConversionWizard({ postId, onComplete }: ConversionWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleLaunch = async () => {
    setLoading(true);
    // TODO: Implement full conversion flow
    // 1. Fetch engagement
    // 2. Analyze audience
    // 3. Adapt creative
    // 4. Recommend budget
    // 5. Create campaign

    setTimeout(() => {
      setLoading(false);
      onComplete?.("mock-conversion-id");
    }, 1000);
  };

  return (
    <div className="conversion-wizard" data-testid="conversion-wizard">
      <div className="wizard-progress">
        <span>Step {step} of 6</span>
      </div>

      {step === 1 && (
        <div className="wizard-step" data-testid="step-1">
          <h2>Select Post</h2>
          <p>Post ID: {postId}</p>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step" data-testid="step-2">
          <h2>Review Engagement</h2>
          <p>Loading engagement data...</p>
          <button onClick={handlePrevious}>Back</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-step" data-testid="step-3">
          <h2>Configure Targeting</h2>
          <p>AI-generated targeting suggestions</p>
          <button onClick={handlePrevious}>Back</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {step === 4 && (
        <div className="wizard-step" data-testid="step-4">
          <h2>Adapt Creatives</h2>
          <p>Format-specific creative variants</p>
          <button onClick={handlePrevious}>Back</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {step === 5 && (
        <div className="wizard-step" data-testid="step-5">
          <h2>Set Budget</h2>
          <p>Budget recommendations based on goals</p>
          <button onClick={handlePrevious}>Back</button>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {step === 6 && (
        <div className="wizard-step" data-testid="step-6">
          <h2>Confirm & Launch</h2>
          <p>Review your campaign settings</p>
          <button onClick={handlePrevious}>Back</button>
          <button onClick={handleLaunch} disabled={loading}>
            {loading ? "Launching..." : "Launch Campaign"}
          </button>
        </div>
      )}
    </div>
  );
}
