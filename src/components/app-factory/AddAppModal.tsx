/**
 * Add App Modal
 *
 * Modal for adding a new app to the pipeline from the master list or manually.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MasterListItem } from "@/types/app-factory";
import { useState } from "react";

interface AddAppModalProps {
  initialItem: MasterListItem | null;
  onClose: () => void;
  onAdd: (name: string, category: string, description?: string) => Promise<void>;
}

const CATEGORIES = [
  "utility",
  "visualization",
  "productivity",
  "interactive",
  "health",
  "dogs",
];

export function AddAppModal({ initialItem, onClose, onAdd }: AddAppModalProps) {
  const [name, setName] = useState(initialItem?.name || "");
  const [category, setCategory] = useState(initialItem?.category || "utility");
  const [description, setDescription] = useState(initialItem?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!category) {
      setError("Category is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd(name.trim(), category, description.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add app");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Dialog role is interactive, handles Escape key and backdrop click
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-app-title"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-md p-6">
        <h2 id="add-app-title" className="mb-4 text-xl font-semibold">
          Add App to Pipeline
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">App Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-app"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Use lowercase with hyphens (e.g., pomodoro-timer)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={isSubmitting}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what the app does..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to Pipeline"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
