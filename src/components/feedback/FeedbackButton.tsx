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
import { cn } from "@/lib/utils";
import { Bug, FileText, Lightbulb, Loader2, MessageSquare, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type FeedbackType = "BUG" | "IDEA" | "OTHER";

interface FeedbackButtonProps {
  className?: string;
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated" && session?.user;

  const resetForm = () => {
    setFeedbackType("BUG");
    setMessage("");
    setEmail("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => resetForm(), 300); // Reset after animation
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
          email: !isAuthenticated ? email.trim() || undefined : undefined,
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

  const FeedbackTypeButton = ({
    type,
    icon: Icon,
    label,
    activeColorClass,
    borderColorClass,
  }: {
    type: FeedbackType;
    icon: React.ElementType;
    label: string;
    activeColorClass: string;
    borderColorClass: string;
  }) => {
    const isSelected = feedbackType === type;
    return (
      <button
        type="button"
        onClick={() => setFeedbackType(type)}
        className={cn(
          "group flex flex-1 items-center justify-center gap-2 rounded-xl border p-4 transition-all duration-200",
          isSelected
            ? cn(
              "bg-secondary/50 shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
              borderColorClass,
              "border-opacity-100",
            )
            : "border-border bg-card/50 hover:border-primary/50 hover:bg-secondary/30",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            isSelected
              ? cn("border-transparent", activeColorClass, "bg-opacity-10")
              : "border-border bg-background text-muted-foreground group-hover:text-foreground",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              isSelected ? activeColorClass : "text-inherit",
            )}
          />
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-border bg-background/95 p-0 text-foreground backdrop-blur-xl sm:max-w-[425px]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Send Feedback
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share your thoughts, report bugs, or suggest new ideas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 p-6 pt-2">
            <div className="flex gap-3">
              <FeedbackTypeButton
                type="BUG"
                icon={Bug}
                label="Bug"
                activeColorClass="text-red-500"
                borderColorClass="border-red-500/50"
              />
              <FeedbackTypeButton
                type="IDEA"
                icon={Lightbulb}
                label="Idea"
                activeColorClass="text-yellow-500"
                borderColorClass="border-yellow-500/50"
              />
              <FeedbackTypeButton
                type="OTHER"
                icon={FileText}
                label="Other"
                activeColorClass="text-blue-500"
                borderColorClass="border-blue-500/50"
              />
            </div>

            <div className="space-y-3">
              <Textarea
                id="message"
                placeholder="Describe your feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
              />
            </div>

            {!isAuthenticated && (
              <div className="space-y-3">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border bg-secondary/20 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                />
              </div>
            )}
          </div>

          <DialogFooter className="bg-secondary/30 p-6 pt-4">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Submit
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
