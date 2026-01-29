/**
 * Policy Check Panel
 *
 * Pre-publish validation component for checking content against policy rules.
 * Displays real-time validation results with severity indicators and suggestions.
 *
 * Resolves #522 (ORB-065): Build Policy Checker UI
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Shield, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type {
  PolicyCheckOutput,
  ViolationSummary
} from "@/lib/policy-checker/types";
import type { SocialPlatform, PolicyCheckScope } from "@prisma/client";

interface PolicyCheckPanelProps {
  workspaceSlug: string;
  initialContent?: string;
  initialPlatform?: SocialPlatform;
  onCheckComplete?: (result: PolicyCheckOutput) => void;
}

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TWITTER", label: "Twitter" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
];

const SEVERITY_COLORS = {
  CRITICAL: "destructive",
  ERROR: "destructive",
  WARNING: "warning",
  INFO: "default",
} as const;

const RESULT_ICONS = {
  PASSED: <CheckCircle className="h-5 w-5 text-green-600" />,
  PASSED_WITH_WARNINGS: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  FAILED: <XCircle className="h-5 w-5 text-red-600" />,
  BLOCKED: <Shield className="h-5 w-5 text-red-600" />,
};

export function PolicyCheckPanel({
  workspaceSlug,
  initialContent = "",
  initialPlatform,
  onCheckComplete,
}: PolicyCheckPanelProps) {
  const [content, setContent] = useState(initialContent);
  const [platform, setPlatform] = useState<SocialPlatform | "">( initialPlatform || "");
  const [checkScope, setCheckScope] = useState<PolicyCheckScope>("FULL");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PolicyCheckOutput | null>(null);

  const handleCheck = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to check");
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentType: "POST",
            contentText: content,
            platform: platform || undefined,
            checkScope,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check content");
      }

      const checkResult = await response.json();
      setResult(checkResult);
      onCheckComplete?.(checkResult);

      // Show toast based on result
      if (checkResult.overallResult === "PASSED") {
        toast.success("Content passed all policy checks!");
      } else if (checkResult.overallResult === "PASSED_WITH_WARNINGS") {
        toast.warning("Content passed with warnings. Review before publishing.");
      } else {
        toast.error("Content failed policy checks. Please fix violations.");
      }
    } catch (error) {
      console.error("Policy check failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to check content"
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Policy Checker</CardTitle>
          <CardDescription>
            Validate your content against platform policies before publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(value) => setPlatform(value as SocialPlatform)}
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Check Scope</Label>
              <Select
                value={checkScope}
                onValueChange={(value) => setCheckScope(value as PolicyCheckScope)}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUICK">Quick (Critical only)</SelectItem>
                  <SelectItem value="FULL">Full Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCheck}
            disabled={isChecking || !content.trim()}
            className="w-full"
          >
            {isChecking ? "Checking..." : "Check Content"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {RESULT_ICONS[result.overallResult!]}
                <CardTitle>Check Results</CardTitle>
              </div>
              <Badge
                variant={
                  result.canPublish
                    ? "default"
                    : ("destructive" as const)
                }
              >
                {result.canPublish ? "Can Publish" : "Cannot Publish"}
              </Badge>
            </div>
            <CardDescription>{result.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.passedRules}
                </p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {result.warningRules}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.failedRules}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {result.violations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Violations</h4>
                {result.violations.map((violation, index) => (
                  <ViolationCard key={index} violation={violation} />
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-right">
              Check completed in {result.durationMs}ms
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ViolationCard({ violation }: { violation: ViolationSummary }) {
  return (
    <Alert variant={violation.severity === "CRITICAL" || violation.severity === "ERROR" ? "destructive" : "default"}>
      <AlertDescription className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={SEVERITY_COLORS[violation.severity]}>
                {violation.severity}
              </Badge>
              <span className="font-semibold">{violation.ruleName}</span>
            </div>
            <p className="text-sm">{violation.message}</p>
            {violation.matchedContent && (
              <p className="text-sm mt-2 bg-muted p-2 rounded font-mono">
                "{violation.matchedContent}"
              </p>
            )}
            {violation.suggestedFix && (
              <p className="text-sm mt-2 text-muted-foreground">
                <strong>Suggestion:</strong> {violation.suggestedFix}
              </p>
            )}
          </div>
          {violation.isBlocking && (
            <Badge variant="destructive">Blocking</Badge>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
