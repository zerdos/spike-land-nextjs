"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Bug,
  CheckCircle,
  ExternalLink,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquare,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const TYPE_CONFIG = {
  BUG: {
    label: "What went wrong?",
    shortLabel: "Bug",
    icon: Bug,
    activeClass: "border-destructive bg-destructive text-destructive-foreground",
    placeholder: "What went wrong? Please describe the issue...",
  },
  IDEA: {
    label: "Your idea",
    shortLabel: "Idea",
    icon: Lightbulb,
    activeClass: "border-amber-600 bg-amber-600 text-white",
    placeholder: "What feature would you like to see?",
  },
  OTHER: {
    label: "Your feedback",
    shortLabel: "Other",
    icon: MessageSquare,
    activeClass: "border-primary bg-primary text-primary-foreground",
    placeholder: "Tell us what's on your mind...",
  },
} as const;

type FeedbackType = keyof typeof TYPE_CONFIG;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appSlug?: string;
  appTitle?: string;
  codespaceId?: string;
}

interface SubmitResult {
  issueUrl: string;
  issueNumber: number;
  julesSessionUrl?: string;
  hasJulesSession: boolean;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  appSlug,
  appTitle,
  codespaceId,
}: FeedbackDialogProps) {
  const [type, setType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const config = TYPE_CONFIG[type];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || undefined,
          page: window.location.href,
          userAgent: navigator.userAgent,
          appSlug,
          appTitle,
          codespaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setResult({
        issueUrl: data.issueUrl,
        issueNumber: data.issueNumber,
        julesSessionUrl: data.julesSessionUrl,
        hasJulesSession: !!data.julesSessionUrl,
      });
      setStatus("success");
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStatus("idle");
      setResult(null);
      setMessage("");
      setEmail("");
      setErrorMessage("");
    }, 300);
  };

  const success = status === "success" && result;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[425px]">
        <AnimatePresence mode="wait">
          {success
            ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center p-12 text-center"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">Thank You!</h2>
                <p className="mb-6 text-muted-foreground">
                  Your {type === "BUG" ? "bug report" : "feedback"} has been submitted.
                </p>
                <div className="mb-6 space-y-3">
                  <a
                    href={result.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View issue #{result.issueNumber}
                  </a>
                  {result.hasJulesSession && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      <Bot className="h-4 w-4 shrink-0" />
                      <span>An AI agent will investigate this bug automatically.</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </motion.div>
            )
            : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleSubmit} className="p-6">
                  <DialogHeader className="mb-6">
                    <DialogTitle>
                      {appTitle ? `Feedback on "${appTitle}"` : "Send Feedback"}
                    </DialogTitle>
                    <DialogDescription>
                      Help us improve by sharing your thoughts.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Category selector */}
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.entries(TYPE_CONFIG) as [
                        FeedbackType,
                        typeof TYPE_CONFIG[FeedbackType],
                      ][]).map(
                        ([value, cfg]) => {
                          const Icon = cfg.icon;
                          const isActive = type === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setType(value)}
                              className={cn(
                                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition-all",
                                isActive
                                  ? cfg.activeClass
                                  : "border-border bg-background text-muted-foreground hover:border-foreground/20",
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {cfg.shortLabel}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="feedback-message">{config.label}</Label>
                      <Textarea
                        id="feedback-message"
                        placeholder={config.placeholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="feedback-email" className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        Email <span className="text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="feedback-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

                    {/* Submit */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!message.trim() || status === "submitting"}
                    >
                      {status === "submitting"
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <ArrowRight className="mr-2 h-4 w-4" />}
                      Send Feedback
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
