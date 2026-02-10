"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface GenerateButtonProps {
  path: string[];
  topicName: string;
}

export function GenerateButton({ path, topicName }: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learnit/generate", {
        method: "POST",
        body: JSON.stringify({ path }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Rate limit reached. Please try again later or sign in for more.");
          return;
        }
        throw new Error("Generation failed");
      }

      toast.success("Content generated! Loading...");
      router.refresh(); // Refresh to show the new content
    } catch (error) {
      toast.error("Failed to generate content. Please try again.");
      console.error(error);
    } finally {
      // keep loading true until refresh happens mostly, or reset
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/30">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Topic Not Found</h3>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        We haven't generated a tutorial for "{topicName}" yet. Would you like our AI to create one
        for you?
      </p>
      <Button size="lg" onClick={handleGenerate} disabled={loading} className="gap-2">
        {loading
          ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          )
          : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Tutorial
            </>
          )}
      </Button>
    </div>
  );
}
