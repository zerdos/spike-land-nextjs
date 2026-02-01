"use client";

import { ORBIT_STORAGE_KEY } from "@/components/orbit/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleCreateWorkspace = async () => {
    if (!formData.name.trim()) {
      setError("Workspace name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create workspace");
      }

      // Save to localStorage and redirect to new workspace
      localStorage.setItem(ORBIT_STORAGE_KEY, data.workspace.slug);
      router.push(`/orbit/${data.workspace.slug}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Orbit</h1>
          <p className="text-muted-foreground">
            Let's set up your first workspace to manage your social media presence.
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Create Workspace</CardTitle>
            <CardDescription>
              A workspace is home for your brand's content and social accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                placeholder="e.g. My Brand, Personal Project"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this workspace for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isCreating}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full h-11"
              onClick={handleCreateWorkspace}
              disabled={isCreating || !formData.name.trim()}
            >
              {isCreating ? "Creating Team Space..." : "Create Workspace"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
