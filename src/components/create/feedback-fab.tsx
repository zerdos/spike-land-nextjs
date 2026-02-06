"use client";

import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { useFeedback } from "./feedback-provider";

export function FeedbackFAB() {
  const { openDialog } = useFeedback();

  return (
    <Button
      onClick={() => openDialog()}
      size="lg"
      className="fixed bottom-6 right-6 lg:right-[19.5rem] z-50 rounded-full shadow-lg h-12 px-4 gap-2"
    >
      <MessageSquarePlus className="w-5 h-5" />
      <span className="hidden sm:inline">Feedback</span>
    </Button>
  );
}
