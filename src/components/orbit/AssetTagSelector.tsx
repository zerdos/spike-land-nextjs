"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

interface AssetTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
}

export function AssetTagSelector({
  selectedTags,
  onTagsChange,
  availableTags = [],
}: AssetTagSelectorProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();
      if (!selectedTags.includes(newTag)) {
        onTagsChange([...selectedTags, newTag]);
      }
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddSuggestion = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const suggestedTags = availableTags.filter(
    (tag) => !selectedTags.includes(tag),
  );

  return (
    <div className="space-y-3">
      <div>
        <Input
          placeholder="Type a tag and press Enter..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested tags */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.slice(0, 10).map((tag) => (
              <Button
                key={tag}
                variant="outline"
                size="sm"
                onClick={() => handleAddSuggestion(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
