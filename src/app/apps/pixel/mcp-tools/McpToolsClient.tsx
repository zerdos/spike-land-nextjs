"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  Wand2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
}

interface JobResult {
  id: string;
  type: string;
  tier: string;
  tokensCost: number;
  status: string;
  prompt: string;
  outputImageUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  errorMessage?: string;
  createdAt: string;
  processingCompletedAt?: string;
}

interface McpToolsClientProps {
  isLoggedIn?: boolean;
}

export function McpToolsClient({ isLoggedIn = false }: McpToolsClientProps) {
  // Check both server-side prop and client-side session for E2E test compatibility
  const { data: session } = useSession();
  const isAuthenticated = isLoggedIn || !!session?.user;

  // API keys state - unused for now but kept for future API key selection feature
  const [_apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [_selectedApiKey, _setSelectedApiKey] = useState<string>("");
  const [manualApiKey, setManualApiKey] = useState<string>("");
  const [_isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Generate form state
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateTier, setGenerateTier] = useState("TIER_1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<JobResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Modify form state
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [modifyTier, setModifyTier] = useState("TIER_1K");
  const [modifyImage, setModifyImage] = useState<File | null>(null);
  const [modifyImagePreview, setModifyImagePreview] = useState<string | null>(
    null,
  );
  const [isModifying, setIsModifying] = useState(false);
  const [modifyResult, setModifyResult] = useState<JobResult | null>(null);
  const [modifyError, setModifyError] = useState<string | null>(null);

  // Job status form state
  const [jobId, setJobId] = useState("");
  const [isCheckingJob, setIsCheckingJob] = useState(false);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Balance state
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Fetch API keys on mount
  useEffect(() => {
    async function fetchApiKeys() {
      try {
        const response = await fetch("/api/settings/api-keys");
        if (response.ok) {
          const data = await response.json();
          setApiKeys(data.apiKeys || []);
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      } finally {
        setIsLoadingKeys(false);
      }
    }
    fetchApiKeys();
  }, []);

  const getApiKey = useCallback(() => {
    return manualApiKey || "";
  }, [manualApiKey]);

  const makeApiRequest = useCallback(async (
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown> | FormData,
  ) => {
    const apiKey = getApiKey();

    // If not authenticated and no API key provided, show error
    if (!isAuthenticated && !apiKey) {
      throw new Error("Please enter an API key to test the API");
    }

    const headers: Record<string, string> = {};

    // Only add Authorization header if API key is explicitly provided
    // Otherwise, session cookies will be sent automatically for logged-in users
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: "include", // Ensure cookies are sent for session auth
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
      } else {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(endpoint, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }

    return data;
  }, [getApiKey, isAuthenticated]);

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateResult(null);

    try {
      const result = await makeApiRequest("/api/mcp/generate", "POST", {
        prompt: generatePrompt,
        tier: generateTier,
      });

      if (result.jobId) {
        // Poll for job completion
        await pollJob(result.jobId, setGenerateResult, setGenerateError);
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Failed to generate image",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModify = async () => {
    if (!modifyPrompt.trim() || !modifyImage) return;

    setIsModifying(true);
    setModifyError(null);
    setModifyResult(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const parts = result.split(",");
          const base64 = parts[1] || "";
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(modifyImage);
      });

      const result = await makeApiRequest("/api/mcp/modify", "POST", {
        prompt: modifyPrompt,
        tier: modifyTier,
        image: imageData,
        mimeType: modifyImage.type,
      });

      if (result.jobId) {
        await pollJob(result.jobId, setModifyResult, setModifyError);
      }
    } catch (error) {
      setModifyError(
        error instanceof Error ? error.message : "Failed to modify image",
      );
    } finally {
      setIsModifying(false);
    }
  };

  const pollJob = async (
    jobId: string,
    setResult: (result: JobResult | null) => void,
    setError: (error: string | null) => void,
  ) => {
    const maxAttempts = 60; // 2 minutes with 2s interval
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const data = await makeApiRequest(`/api/mcp/jobs/${jobId}`);

        if (data.status === "COMPLETED") {
          setResult(data);
          return;
        } else if (data.status === "FAILED" || data.status === "REFUNDED") {
          setError(data.errorMessage || "Job failed");
          return;
        }

        // Still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to check job status",
        );
        return;
      }
    }

    setError("Job timed out - please check status manually");
  };

  const handleCheckJob = async () => {
    if (!jobId.trim()) return;

    setIsCheckingJob(true);
    setJobError(null);
    setJobResult(null);

    try {
      const data = await makeApiRequest(`/api/mcp/jobs/${jobId}`);
      setJobResult(data);
    } catch (error) {
      setJobError(
        error instanceof Error ? error.message : "Failed to fetch job",
      );
    } finally {
      setIsCheckingJob(false);
    }
  };

  const handleCheckBalance = async () => {
    setIsLoadingBalance(true);
    setBalanceError(null);

    try {
      const data = await makeApiRequest("/api/mcp/balance");
      setBalance(data.balance);
    } catch (error) {
      setBalanceError(
        error instanceof Error ? error.message : "Failed to fetch balance",
      );
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModifyImage(file);
      const reader = new FileReader();
      reader.onload = () => setModifyImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const tierCosts: Record<string, number> = {
    TIER_1K: 2,
    TIER_2K: 5,
    TIER_4K: 10,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />Completed
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing
          </Badge>
        );
      case "FAILED":
      case "REFUNDED":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MCP Tools</h1>
        <p className="text-muted-foreground mt-2">
          Test the MCP API for image generation and modification
        </p>
      </div>

      {/* Authentication Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {isAuthenticated ? "Authentication" : "API Key Required"}
          </CardTitle>
          <CardDescription>
            {isAuthenticated
              ? (
                <>
                  You&apos;re signed in and can use the tools directly with your session.
                  Optionally, enter an API key to test Bearer token authentication.{" "}
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                  >
                    Manage API keys
                  </Link>
                </>
              )
              : (
                <>
                  Enter an API key to test the MCP API.{" "}
                  <Link
                    href="/auth/signin"
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to use your session instead.
                </>
              )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated
            ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Using session authentication (no API key needed)</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-key">
                    Optional: Test with API Key
                  </Label>
                  <Input
                    id="manual-key"
                    type="password"
                    placeholder="sk_live_... (leave empty to use session)"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a full API key here to test Bearer token authentication instead of session
                    auth.
                  </p>
                </div>
              </>
            )
            : (
              <div className="space-y-2">
                <Label htmlFor="manual-key">API Key</Label>
                <Input
                  id="manual-key"
                  type="password"
                  placeholder="sk_live_..."
                  value={manualApiKey}
                  onChange={(e) => setManualApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from the{" "}
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                  >
                    Settings page
                  </Link>
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">
            <ImagePlus className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="modify">
            <Wand2 className="h-4 w-4 mr-2" />
            Modify
          </TabsTrigger>
          <TabsTrigger value="status">
            <Search className="h-4 w-4 mr-2" />
            Job Status
          </TabsTrigger>
          <TabsTrigger value="balance">
            <Wallet className="h-4 w-4 mr-2" />
            Balance
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Image</CardTitle>
                <CardDescription>
                  Create a new image from a text prompt using Gemini AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generate-prompt">Prompt</Label>
                  <Textarea
                    id="generate-prompt"
                    placeholder="A serene mountain landscape at sunset with a lake..."
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generate-tier">Quality Tier</Label>
                  <Select value={generateTier} onValueChange={setGenerateTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIER_1K">
                        1K (1024px) - 2 tokens
                      </SelectItem>
                      <SelectItem value="TIER_2K">
                        2K (2048px) - 5 tokens
                      </SelectItem>
                      <SelectItem value="TIER_4K">
                        4K (4096px) - 10 tokens
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    Cost: {tierCosts[generateTier]} tokens
                  </span>
                  <Button
                    onClick={handleGenerate}
                    disabled={!generatePrompt.trim() || isGenerating ||
                      (!isAuthenticated && !getApiKey())}
                  >
                    {isGenerating
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      )
                      : (
                        <>
                          <ImagePlus className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                  </Button>
                </div>

                {generateError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {generateError}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {generateResult
                  ? (
                    <div className="space-y-4">
                      {getStatusBadge(generateResult.status)}
                      {generateResult.outputImageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={generateResult.outputImageUrl}
                            alt="Generated image"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Job ID:</strong> {generateResult.id}
                        </p>
                        <p>
                          <strong>Dimensions:</strong> {generateResult.outputWidth}x{generateResult
                            .outputHeight}
                        </p>
                        <p>
                          <strong>Tokens Used:</strong> {generateResult.tokensCost}
                        </p>
                      </div>
                    </div>
                  )
                  : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      Generate an image to see the result here
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modify Tab */}
        <TabsContent value="modify">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Modify Image</CardTitle>
                <CardDescription>
                  Edit an existing image using a text prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modify-image">Upload Image</Label>
                  <Input
                    id="modify-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {modifyImagePreview && (
                    <div className="relative h-32 w-32 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={modifyImagePreview}
                        alt="Image to modify"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modify-prompt">Modification Prompt</Label>
                  <Textarea
                    id="modify-prompt"
                    placeholder="Add a rainbow in the sky..."
                    value={modifyPrompt}
                    onChange={(e) => setModifyPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modify-tier">Quality Tier</Label>
                  <Select value={modifyTier} onValueChange={setModifyTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIER_1K">
                        1K (1024px) - 2 tokens
                      </SelectItem>
                      <SelectItem value="TIER_2K">
                        2K (2048px) - 5 tokens
                      </SelectItem>
                      <SelectItem value="TIER_4K">
                        4K (4096px) - 10 tokens
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    Cost: {tierCosts[modifyTier]} tokens
                  </span>
                  <Button
                    onClick={handleModify}
                    disabled={!modifyPrompt.trim() || !modifyImage ||
                      isModifying ||
                      (!isAuthenticated && !getApiKey())}
                  >
                    {isModifying
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Modifying...
                        </>
                      )
                      : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Modify
                        </>
                      )}
                  </Button>
                </div>

                {modifyError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {modifyError}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {modifyResult
                  ? (
                    <div className="space-y-4">
                      {getStatusBadge(modifyResult.status)}
                      {modifyResult.outputImageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={modifyResult.outputImageUrl}
                            alt="Modified image"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Job ID:</strong> {modifyResult.id}
                        </p>
                        <p>
                          <strong>Dimensions:</strong>{" "}
                          {modifyResult.outputWidth}x{modifyResult.outputHeight}
                        </p>
                        <p>
                          <strong>Tokens Used:</strong> {modifyResult.tokensCost}
                        </p>
                      </div>
                    </div>
                  )
                  : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      Modify an image to see the result here
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Job Status Tab */}
        <TabsContent value="status">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Check Job Status</CardTitle>
                <CardDescription>
                  Look up the status of a generation or modification job
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job-id">Job ID</Label>
                  <Input
                    id="job-id"
                    placeholder="cm4xxxxx..."
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleCheckJob}
                  disabled={!jobId.trim() || isCheckingJob ||
                    (!isAuthenticated && !getApiKey())}
                  className="w-full"
                >
                  {isCheckingJob
                    ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    )
                    : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Check Status
                      </>
                    )}
                </Button>

                {jobError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {jobError}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                {jobResult
                  ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(jobResult.status)}
                        <Badge variant="outline">{jobResult.type}</Badge>
                      </div>
                      {jobResult.outputImageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={jobResult.outputImageUrl}
                            alt="Job output"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Job ID:</strong> {jobResult.id}
                        </p>
                        <p>
                          <strong>Type:</strong> {jobResult.type}
                        </p>
                        <p>
                          <strong>Tier:</strong> {jobResult.tier}
                        </p>
                        <p>
                          <strong>Tokens:</strong> {jobResult.tokensCost}
                        </p>
                        <p>
                          <strong>Prompt:</strong> {jobResult.prompt}
                        </p>
                        {jobResult.outputWidth && (
                          <p>
                            <strong>Dimensions:</strong>{" "}
                            {jobResult.outputWidth}x{jobResult.outputHeight}
                          </p>
                        )}
                        {jobResult.errorMessage && (
                          <p className="text-destructive">
                            <strong>Error:</strong> {jobResult.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                  : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      Enter a job ID to see details
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Tab */}
        <TabsContent value="balance">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
                <CardDescription>
                  Check your current token balance using the API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleCheckBalance}
                  disabled={isLoadingBalance ||
                    (!isAuthenticated && !getApiKey())}
                  className="w-full"
                >
                  {isLoadingBalance
                    ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    )
                    : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Balance
                      </>
                    )}
                </Button>

                {balanceError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {balanceError}
                  </div>
                )}

                {balance !== null && (
                  <div className="rounded-md bg-muted p-4 text-center">
                    <p className="text-4xl font-bold">{balance}</p>
                    <p className="text-sm text-muted-foreground">
                      tokens available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Costs</CardTitle>
                <CardDescription>
                  Pricing for image generation and modification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">1K Quality</p>
                      <p className="text-sm text-muted-foreground">
                        1024px resolution
                      </p>
                    </div>
                    <Badge>2 tokens</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">2K Quality</p>
                      <p className="text-sm text-muted-foreground">
                        2048px resolution
                      </p>
                    </div>
                    <Badge>5 tokens</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">4K Quality</p>
                      <p className="text-sm text-muted-foreground">
                        4096px resolution
                      </p>
                    </div>
                    <Badge>10 tokens</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* API Documentation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Use these endpoints with your API key for programmatic access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium">Generate Image</h4>
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <pre className="overflow-x-auto">
{`curl -X POST https://spike.land/api/mcp/generate \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "your prompt", "tier": "TIER_1K"}'`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `curl -X POST https://spike.land/api/mcp/generate -H "Authorization: Bearer sk_live_..." -H "Content-Type: application/json" -d '{"prompt": "your prompt", "tier": "TIER_1K"}'`,
                    "generate",
                  )}
              >
                {copiedCommand === "generate"
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Modify Image</h4>
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <pre className="overflow-x-auto">
{`curl -X POST https://spike.land/api/mcp/modify \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "your prompt", "image": "base64...", "mimeType": "image/jpeg", "tier": "TIER_1K"}'`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `curl -X POST https://spike.land/api/mcp/modify -H "Authorization: Bearer sk_live_..." -H "Content-Type: application/json" -d '{"prompt": "your prompt", "image": "base64...", "mimeType": "image/jpeg", "tier": "TIER_1K"}'`,
                    "modify",
                  )}
              >
                {copiedCommand === "modify"
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Check Job Status</h4>
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <pre className="overflow-x-auto">
{`curl https://spike.land/api/mcp/jobs/{jobId} \\
  -H "Authorization: Bearer sk_live_..."`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `curl https://spike.land/api/mcp/jobs/{jobId} -H "Authorization: Bearer sk_live_..."`,
                    "status",
                  )}
              >
                {copiedCommand === "status"
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Check Balance</h4>
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <pre className="overflow-x-auto">
{`curl https://spike.land/api/mcp/balance \\
  -H "Authorization: Bearer sk_live_..."`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `curl https://spike.land/api/mcp/balance -H "Authorization: Bearer sk_live_..."`,
                    "balance",
                  )}
              >
                {copiedCommand === "balance"
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">
              MCP Server (Claude Desktop / Claude Code)
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Install the MCP server to use these tools directly in Claude:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <pre className="overflow-x-auto">
{`SPIKE_LAND_API_KEY=sk_live_... npx @spike-npm-land/mcp-server`}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `SPIKE_LAND_API_KEY=sk_live_... npx @spike-npm-land/mcp-server`,
                    "mcp",
                  )}
              >
                {copiedCommand === "mcp"
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <Link
                href="/settings"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Manage API Keys
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
