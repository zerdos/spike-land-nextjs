"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

interface Job {
  id: string;
  status: string;
  tier: string;
  enhancedUrl?: string;
  enhancedWidth?: number;
  enhancedHeight?: number;
  errorMessage?: string;
}

export default function TestEnhancementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [selectedTier, setSelectedTier] = useState<"TIER_1K" | "TIER_2K" | "TIER_4K">("TIER_2K");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setUploadedImage(null);
      setJob(null);
    }
  };

  const fetchTokenBalance = async () => {
    try {
      const response = await fetch("/api/tokens/balance");
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
    }
  };

  const uploadImage = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedImage(data.image);
        await fetchTokenBalance();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      alert(`Upload error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const enhanceImage = async () => {
    if (!uploadedImage) return;

    setEnhancing(true);
    try {
      const response = await fetch("/api/images/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: uploadedImage.id,
          tier: selectedTier,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.newBalance);

        // Start polling for job status
        pollJobStatus(data.jobId);
      } else {
        const error = await response.json();
        alert(`Enhancement failed: ${error.error}`);
        setEnhancing(false);
      }
    } catch (error) {
      alert(`Enhancement error: ${error}`);
      setEnhancing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setEnhancing(false);
        alert("Job polling timeout");
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (response.ok) {
          const jobData = await response.json();
          setJob(jobData);

          if (jobData.status === "COMPLETED" || jobData.status === "FAILED") {
            setEnhancing(false);
            if (jobData.status === "COMPLETED") {
              await fetchTokenBalance();
            }
          } else {
            attempts++;
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        }
      } catch (error) {
        console.error("Job polling error:", error);
        attempts++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  useEffect(() => {
    fetchTokenBalance();
  }, []);

  const tierCosts = {
    TIER_1K: 2,
    TIER_2K: 5,
    TIER_4K: 10,
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Image Enhancement Demo</h1>

      {/* Token Balance */}
      <Card className="p-4 mb-6 bg-blue-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Token Balance: {tokenBalance ?? "..."}</p>
            <p className="text-sm text-gray-600">+1 token every 15 minutes (max 100)</p>
          </div>
          <Button onClick={fetchTokenBalance} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Upload Image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4 block"
          />
          {imagePreview && (
            <div className="mt-4 mb-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto rounded-lg border"
              />
            </div>
          )}
          <Button
            onClick={uploadImage}
            disabled={!file || uploading || !!uploadedImage}
            className="w-full"
          >
            {uploading ? "Uploading..." : uploadedImage ? "Uploaded ✓" : "Upload to R2"}
          </Button>
          {uploadedImage && (
            <div className="mt-4 p-3 bg-green-50 rounded text-sm">
              <p className="font-medium">✓ Uploaded Successfully</p>
              <p>{uploadedImage.width}x{uploadedImage.height}px</p>
            </div>
          )}
        </Card>

        {/* Enhancement Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">2. Enhance Image</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Quality Tier:</label>
            <div className="space-y-2">
              {(["TIER_1K", "TIER_2K", "TIER_4K"] as const).map((tier) => (
                <label key={tier} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tier"
                    value={tier}
                    checked={selectedTier === tier}
                    onChange={(e) =>
                      setSelectedTier(e.target.value as typeof tier)}
                    disabled={!uploadedImage || enhancing}
                  />
                  <span>
                    {tier.replace("TIER_", "")} - {tierCosts[tier]} tokens
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={enhanceImage}
            disabled={!uploadedImage || enhancing ||
              (tokenBalance !== null && tokenBalance < tierCosts[selectedTier])}
            className="w-full"
          >
            {enhancing ? "Enhancing..." : `Enhance (${tierCosts[selectedTier]} tokens)`}
          </Button>
          {tokenBalance !== null && tokenBalance < tierCosts[selectedTier] && uploadedImage && (
            <p className="mt-2 text-sm text-red-600">
              Insufficient tokens. Need {tierCosts[selectedTier]}, have {tokenBalance}
            </p>
          )}
        </Card>

        {/* Job Status */}
        {job && (
          <Card className="p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">3. Enhancement Result</h2>
            <div className="mb-4">
              <p>
                <strong>Status:</strong> {job.status}
              </p>
              <p>
                <strong>Tier:</strong> {job.tier}
              </p>
              <p>
                <strong>Tokens Used:</strong> {tierCosts[job.tier as keyof typeof tierCosts]}
              </p>
            </div>
            {job.status === "COMPLETED" && job.enhancedUrl && (
              <div>
                <p className="mb-2 font-medium text-green-600">✓ Enhancement Complete!</p>
                <p className="mb-2">Enhanced: {job.enhancedWidth}x{job.enhancedHeight}px</p>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-sm mb-2">Enhanced Image URL:</p>
                  <code className="text-xs break-all">{job.enhancedUrl}</code>
                </div>
              </div>
            )}
            {job.status === "FAILED" && (
              <div className="p-4 bg-red-50 rounded">
                <p className="text-red-600">Enhancement failed: {job.errorMessage}</p>
                <p className="text-sm mt-2">Tokens have been refunded.</p>
              </div>
            )}
            {job.status === "PROCESSING" && (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full">
                </div>
                <span>Processing...</span>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
