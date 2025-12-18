"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bug, FileText, Lightbulb, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FeedbackType = "BUG" | "IDEA" | "OTHER";

// Animation duration in milliseconds - must match CSS transition duration-300
const ANIMATION_DURATION_MS = 300;

interface FeedbackButtonProps {
  className?: string;
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated" && session?.user;

  const resetForm = () => {
    setFeedbackType("BUG");
    setMessage("");
    setEmail("");
  };

  // Close when clicking outside - only attach listener when panel is open
  useEffect(() => {
    if (!open) return; // Early return when closed - no listener needed

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Reset form after close animation
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => resetForm(), ANIMATION_DURATION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

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
      setOpen(false);
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
          "group flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all duration-200",
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
            "text-xs font-medium",
            isSelected
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4",
        // Only allow pointer events on the container when the form is open
        // This prevents the hidden form from blocking clicks on underlying elements
        !open && "pointer-events-none",
        className,
      )}
    >
      {/* Expandable Feedback Form */}
      <div
        className={cn(
          "w-[350px] origin-bottom-right overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out",
          open
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-8 pointer-events-none invisible",
        )}
      >
        <div className="p-4 pb-2">
          <h3 className="text-lg font-semibold tracking-tight">Send Feedback</h3>
          <p className="text-sm text-muted-foreground">
            Share your thoughts, report bugs, or suggest ideas.
          </p>
        </div>

        <div className="flex flex-col gap-4 p-4 pt-2">
          <div className="flex gap-2">
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

          <Textarea
            id="message"
            placeholder="Describe your feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] resize-none border-border bg-secondary/20 text-sm focus-visible:ring-primary/50"
          />

          {!isAuthenticated && (
            <Input
              id="email"
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border bg-secondary/20 text-sm h-9 focus-visible:ring-primary/50"
            />
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary w-full"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Submit Feedback
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Trigger Button */}
      <Button
        variant="default"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 pointer-events-auto",
          open
            ? "bg-secondary text-foreground hover:bg-secondary/80 rotate-90"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary rotate-0",
        )}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close feedback" : "Send feedback"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </Button>
    </div>
  );
}
