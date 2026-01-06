"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import Link from "next/link";

interface ContentRewriterCardProps {
  workspaceSlug: string;
}

export function ContentRewriterCard({ workspaceSlug }: ContentRewriterCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Content Rewriter</CardTitle>
        </div>
        <CardDescription>
          Transform draft content to align with your brand guidelines
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Our AI-powered rewriter adjusts your content&apos;s tone, vocabulary, and style to match
          your brand voice while preserving meaning.
        </p>
        <Button asChild className="w-full">
          <Link href={`/orbit/${workspaceSlug}/brand-brain/rewriter`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Open Rewriter
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
