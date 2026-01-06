"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ContentRewriteResponse, getPlatformLimit } from "@/lib/validations/brand-rewrite";
import { AlertCircle, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RewriteDiffViewer } from "./components/RewriteDiffViewer";
import { RewriteForm } from "./components/RewriteForm";

export default function RewriterPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [rewriteResult, setRewriteResult] = useState<ContentRewriteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch workspace ID from slug
  useEffect(() => {
    async function fetchWorkspaceId() {
      try {
        const response = await fetch(`/api/workspaces/by-slug/${workspaceSlug}`);
        if (!response.ok) {
          throw new Error("Failed to fetch workspace");
        }
        const data = await response.json();
        setWorkspaceId(data.id);
      } catch {
        setError("Failed to load workspace");
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaceId();
  }, [workspaceSlug]);

  const handleRewriteComplete = useCallback((result: ContentRewriteResponse) => {
    setRewriteResult(result);
    setError(null);
    setSuccess(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  }, []);

  const handleAccept = useCallback((finalText: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(finalText);
    setSuccess("Content copied to clipboard!");
    setRewriteResult(null);
  }, []);

  const handleReject = useCallback(() => {
    setRewriteResult(null);
    setSuccess(null);
  }, []);

  const handleStartNew = useCallback(() => {
    setRewriteResult(null);
    setError(null);
    setSuccess(null);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Workspace not found. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/orbit/${workspaceSlug}/brand-brain`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Brand Brain
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Content Rewriter</h1>
            <p className="text-muted-foreground">
              Transform your content to align with brand guidelines
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {rewriteResult
        ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Review Changes</CardTitle>
                  <CardDescription>
                    Review the AI-suggested changes and select which ones to accept
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleStartNew}>
                  Start New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RewriteDiffViewer
                original={rewriteResult.original}
                rewritten={rewriteResult.rewritten}
                hunks={rewriteResult.changes}
                onAccept={handleAccept}
                onReject={handleReject}
                characterLimit={getPlatformLimit(rewriteResult.platform)}
              />
            </CardContent>
          </Card>
        )
        : (
          <Card>
            <CardHeader>
              <CardTitle>Enter Your Draft</CardTitle>
              <CardDescription>
                Paste your content below and select the target platform. Our AI will rewrite it to
                match your brand voice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RewriteForm
                workspaceId={workspaceId}
                onRewriteComplete={handleRewriteComplete}
                onError={handleError}
              />
            </CardContent>
          </Card>
        )}

      {/* Tips */}
      {!rewriteResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Better Results</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Be specific:</strong> Include key messages you want to preserve
              </li>
              <li>
                <strong>Choose the right platform:</strong>{" "}
                Character limits and tone vary by platform
              </li>
              <li>
                <strong>Review changes:</strong> The AI preserves meaning but you can fine-tune
              </li>
              <li>
                <strong>Iterate:</strong> Run multiple passes for best results
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
