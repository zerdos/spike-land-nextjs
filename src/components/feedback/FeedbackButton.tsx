"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bug, Lightbulb, List, Loader2, MessageSquare, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type FeedbackType = "BUG" | "IDEA" | "OTHER";

interface FeedbackButtonProps {
  className?: string;
}

const feedbackTypes = [
  { type: "BUG" as const, label: "Bug", icon: Bug, color: "text-red-400" },
  { type: "IDEA" as const, label: "Idea", icon: Lightbulb, color: "text-yellow-400" },
  { type: "OTHER" as const, label: "Other", icon: List, color: "text-blue-400" },
];

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pathname = usePathname();

  const resetForm = () => {
    setFeedbackType("BUG");
    setMessage("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          page: pathname,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Thank you for your feedback!");
      handleOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit feedback",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Send Feedback</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share your thoughts, report bugs, or suggest new ideas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Toggle Button Group */}
            <div className="flex gap-2">
              {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeedbackType(type)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                    feedbackType === type
                      ? "bg-secondary/80 border-border text-foreground"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", feedbackType === type && color)} />
                  {label}
                </button>
              ))}
            </div>

            {/* Message Textarea */}
            <Textarea
              placeholder="Describe your feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none bg-muted/30 border-transparent focus:border-border"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
            >
              {isSubmitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
