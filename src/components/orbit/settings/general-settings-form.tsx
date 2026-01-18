/**
 * General Settings Form
 *
 * Form for editing workspace name and description.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useState } from "react";

interface GeneralSettingsFormProps {
  workspaceId: string;
  initialName: string;
  initialDescription: string | null;
}

export function GeneralSettingsForm({
  workspaceId,
  initialName,
  initialDescription,
}: GeneralSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges = name !== initialName || description !== (initialDescription || "");

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, name, description, hasChanges]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Workspace Name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workspace"
          maxLength={50}
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground">
          {name.length}/50 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-description">Description</Label>
        <Textarea
          id="workspace-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this workspace for?"
          maxLength={200}
          rows={3}
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground">
          {description.length}/200 characters
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {success && <p className="text-sm text-green-500">Settings saved successfully!</p>}

      <Button
        onClick={handleSave}
        disabled={isSaving || !hasChanges || name.trim().length < 2}
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
