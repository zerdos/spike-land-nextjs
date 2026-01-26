"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Check, MessageSquare, RefreshCw, Sliders, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ThemeCard } from "../../landing-sections/shared/ThemeCard";

interface ToneValue {
  name: string;
  value: number;
  color: string;
}

const defaultTones: ToneValue[] = [
  { name: "Professional", value: 65, color: "from-blue-500 to-blue-600" },
  { name: "Friendly", value: 80, color: "from-green-500 to-green-600" },
  { name: "Witty", value: 45, color: "from-purple-500 to-purple-600" },
  { name: "Bold", value: 70, color: "from-orange-500 to-orange-600" },
];

const sampleTexts = [
  {
    original: "Check out our new product launch!",
    branded:
      "Ready to level up? Our latest innovation just dropped - and trust us, you don't want to miss this one.",
  },
  {
    original: "We're excited to announce our partnership.",
    branded:
      "Big news, friends! We've teamed up with some amazing partners to bring you something special.",
  },
  {
    original: "Thank you for your feedback.",
    branded:
      "Your thoughts matter to us! Thanks for keeping it real - it helps us get better every day.",
  },
];

function ToneSlider({
  tone,
  onChange,
  isAnimating,
}: {
  tone: ToneValue;
  onChange: (value: number) => void;
  isAnimating: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{tone.name}</span>
        <span className="text-sm text-[var(--landing-muted-fg)]">{tone.value}%</span>
      </div>
      <div className="relative h-2 bg-[var(--landing-muted)]/30 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", tone.color)}
          animate={{ width: `${tone.value}%` }}
          transition={{ duration: isAnimating ? 0.5 : 0.2 }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={tone.value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Adjust ${tone.name} tone`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={tone.value}
        aria-valuetext={`${tone.value}%`}
        className="w-full h-2 appearance-none bg-transparent cursor-pointer absolute top-0 opacity-0"
        style={{ marginTop: "-8px" }}
      />
    </div>
  );
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number; }) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-[var(--landing-primary)] ml-1 align-middle"
        />
      )}
    </span>
  );
}

export function BrandBrainDemo() {
  const [tones, setTones] = useState(defaultTones);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTransforming, setIsTransforming] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const currentText = sampleTexts[currentTextIndex]!;

  const handleToneChange = useCallback((index: number, value: number) => {
    setTones((prev) => prev.map((t, i) => (i === index ? { ...t, value } : t)));
  }, []);

  const handleTransform = useCallback(() => {
    setIsTransforming(true);
    setShowResult(false);
    setTimeout(() => {
      setShowResult(true);
      setIsTransforming(false);
    }, 1500);
  }, []);

  const handleNextExample = useCallback(() => {
    setShowResult(false);
    setCurrentTextIndex((prev) => (prev + 1) % sampleTexts.length);
  }, []);

  const handleTrain = useCallback(() => {
    setIsTraining(true);
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsTraining(false);
            setTrainingProgress(0);
          }, 1000);
          return 100;
        }
        return p + 5;
      });
    }, 100);
  }, []);

  // Auto-transform on load
  useEffect(() => {
    const timer = setTimeout(handleTransform, 1500);
    return () => clearTimeout(timer);
  }, [handleTransform]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <ThemeCard glass className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Brand Brain</h3>
              <p className="text-sm text-[var(--landing-muted-fg)]">
                AI that speaks your brand's language
              </p>
            </div>
          </div>

          <button
            onClick={handleTrain}
            disabled={isTraining}
            aria-label={isTraining
              ? `Training brand voice: ${trainingProgress}% complete`
              : "Train AI on your brand content"}
            aria-busy={isTraining}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              isTraining
                ? "bg-[var(--landing-muted)] text-[var(--landing-muted-fg)]"
                : "bg-[var(--landing-secondary)] text-[var(--landing-fg)] hover:bg-[var(--landing-muted)]",
            )}
          >
            {isTraining
              ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Training... {trainingProgress}%
                </>
              )
              : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Train on Content
                </>
              )}
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Tone Controls */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-[var(--landing-muted-fg)]" />
              <span className="text-sm font-medium">Voice Parameters</span>
            </div>

            <div className="space-y-6">
              {tones.map((tone, index) => (
                <ToneSlider
                  key={tone.name}
                  tone={tone}
                  onChange={(value) => handleToneChange(index, value)}
                  isAnimating={isTraining}
                />
              ))}
            </div>

            {/* Brand Traits */}
            <div className="pt-4 border-t border-[var(--landing-border)]">
              <span className="text-sm font-medium text-[var(--landing-muted-fg)]">
                Detected Brand Traits
              </span>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Approachable", "Innovative", "Trustworthy", "Dynamic"].map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--landing-primary)]/10 text-[var(--landing-primary)] border border-[var(--landing-primary)]/20"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Text Transformation */}
          <div className="space-y-4">
            {/* Original Text */}
            <div className="p-4 rounded-xl bg-[var(--landing-muted)]/20 border border-[var(--landing-border)]">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[var(--landing-muted-fg)]" />
                <span className="text-xs font-medium text-[var(--landing-muted-fg)]">
                  ORIGINAL
                </span>
              </div>
              <p className="text-[var(--landing-fg)]">{currentText.original}</p>
            </div>

            {/* Transform Button */}
            <div className="flex justify-center">
              <button
                onClick={handleTransform}
                disabled={isTransforming}
                aria-label={isTransforming
                  ? "Transforming text to brand voice"
                  : "Apply brand voice to text"}
                aria-busy={isTransforming}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                  isTransforming
                    ? "bg-[var(--landing-muted)] text-[var(--landing-muted-fg)]"
                    : "bg-gradient-to-r from-[var(--landing-primary)] to-[var(--landing-accent)] text-white hover:opacity-90",
                )}
              >
                {isTransforming
                  ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Transforming...
                    </>
                  )
                  : (
                    <>
                      <Wand2 className="w-5 h-5" aria-hidden="true" />
                      Apply Brand Voice
                    </>
                  )}
              </button>
            </div>

            {/* Branded Text */}
            <AnimatePresence mode="wait">
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-[var(--landing-primary)]/10 to-[var(--landing-accent)]/10 border border-[var(--landing-primary)]/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[var(--landing-primary)]" />
                    <span className="text-xs font-medium text-[var(--landing-primary)]">
                      BRAND VOICE
                    </span>
                    <div className="flex items-center gap-1 ml-auto text-green-400">
                      <Check className="w-3 h-3" />
                      <span className="text-xs">On-brand</span>
                    </div>
                  </div>
                  <p className="text-[var(--landing-fg)]">
                    <TypewriterText text={currentText.branded} />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Try Another */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex justify-center"
              >
                <button
                  onClick={handleNextExample}
                  aria-label="Try another text transformation example"
                  className="text-sm text-[var(--landing-muted-fg)] hover:text-[var(--landing-fg)] transition-colors"
                >
                  Try another example
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </ThemeCard>
    </div>
  );
}
