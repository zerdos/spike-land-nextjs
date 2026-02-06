"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Bug, ExternalLink, Lightbulb, Loader2, MessageCircle } from "lucide-react";
import { useState } from "react";

const FEEDBACK_TYPES = [
  { value: "BUG", label: "Bug Report", icon: Bug },
  { value: "IDEA", label: "Feature Idea", icon: Lightbulb },
  { value: "OTHER", label: "Other", icon: MessageCircle },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

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

  const handleSubmit = async () => {
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
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStatus("idle");
      setResult(null);
      setMessage("");
      setEmail("");
      setErrorMessage("");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {status === "success" && result
          ? (
            <>
              <DialogHeader>
                <DialogTitle>Thanks for your feedback!</DialogTitle>
                <DialogDescription>
                  Your {type === "BUG" ? "bug report" : "feedback"} has been submitted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <a
                  href={result.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View issue #{result.issueNumber}
                </a>
                {result.hasJulesSession && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    <Bot className="w-4 h-4 shrink-0" />
                    <span>An AI agent will investigate this bug automatically.</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </>
          )
          : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {appTitle ? `Feedback on "${appTitle}"` : "Send Feedback"}
                </DialogTitle>
                <DialogDescription>
                  Help us improve by sharing your thoughts.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Type selector */}
                <div className="flex gap-2">
                  {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={type === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setType(value)}
                      className="flex-1"
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="feedback-message">
                    {type === "BUG" ? "What went wrong?" : "Your feedback"}
                  </Label>
                  <Textarea
                    id="feedback-message"
                    placeholder={type === "BUG"
                      ? "Describe the bug, steps to reproduce, and expected behavior..."
                      : "Share your idea or feedback..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="feedback-email">Email (optional)</Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === "submitting"}
                >
                  {status === "submitting" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit
                </Button>
              </DialogFooter>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
