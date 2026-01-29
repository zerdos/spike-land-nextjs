"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface AssetFiltersProps {
  fileTypes: string[];
  selectedFileTypes: string[];
  onFileTypesChange: (types: string[]) => void;
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClearAll: () => void;
}

export function AssetFilters({
  fileTypes,
  selectedFileTypes,
  onFileTypesChange,
  tags,
  selectedTags,
  onTagsChange,
  onClearAll,
}: AssetFiltersProps) {
  const handleFileTypeToggle = (type: string) => {
    if (selectedFileTypes.includes(type)) {
      onFileTypesChange(selectedFileTypes.filter((t) => t !== type));
    } else {
      onFileTypesChange([...selectedFileTypes, type]);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const activeFiltersCount = selectedFileTypes.length + selectedTags.length;

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
          >
            <X className="h-4 w-4 mr-2" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* File Types */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">File Type</Label>
        <div className="space-y-2">
          {fileTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={selectedFileTypes.includes(type)}
                onCheckedChange={() => handleFileTypeToggle(type)}
              />
              <label
                htmlFor={`type-${type}`}
                className="text-sm cursor-pointer capitalize"
              >
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags</Label>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm cursor-pointer"
                  >
                    {tag}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
