"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  VOCABULARY_TYPE_LABELS,
  VOCABULARY_TYPES,
  type VocabularyItem,
  type VocabularyType,
} from "@/lib/validations/brand-brain";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

export interface VocabularyListProps {
  vocabulary: VocabularyItem[];
  onChange: (vocabulary: VocabularyItem[]) => void;
  disabled?: boolean;
  className?: string;
}

const TYPE_COLORS: Record<VocabularyType, string> = {
  PREFERRED: "bg-green-500/10 text-green-500 border-green-500/20",
  BANNED: "bg-red-500/10 text-red-500 border-red-500/20",
  REPLACEMENT: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export function VocabularyList({
  vocabulary,
  onChange,
  disabled = false,
  className,
}: VocabularyListProps) {
  const handleAdd = (type: VocabularyType) => {
    const newItem: VocabularyItem = {
      type,
      term: "",
      replacement: type === "REPLACEMENT" ? "" : undefined,
      context: undefined,
      isActive: true,
    };
    onChange([...vocabulary, newItem]);
  };

  const handleRemove = (index: number) => {
    const updated = vocabulary.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdate = (
    index: number,
    field: keyof VocabularyItem,
    value: string | boolean,
  ) => {
    const updated = vocabulary.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  // Group vocabulary by type
  const grouped = VOCABULARY_TYPES.reduce(
    (acc, type) => {
      acc[type] = vocabulary.filter((v) => v.type === type);
      return acc;
    },
    {} as Record<VocabularyType, VocabularyItem[]>,
  );

  return (
    <div className={cn("space-y-6", className)}>
      {VOCABULARY_TYPES.map((type) => {
        const items = grouped[type];
        const label = VOCABULARY_TYPE_LABELS[type];

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{label}s</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAdd(type)}
                disabled={disabled}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {items.length === 0
              ? (
                <p className="text-sm text-muted-foreground">
                  No {label.toLowerCase()}s configured yet.
                </p>
              )
              : (
                <div className="space-y-2">
                  {items.map((item) => {
                    // Find actual index in the vocabulary array
                    const actualIndex = vocabulary.findIndex(
                      (v) => v === item,
                    );

                    return (
                      <div
                        key={actualIndex}
                        className="flex items-start gap-2 rounded-lg border bg-card p-3"
                      >
                        <Badge
                          variant="outline"
                          className={cn("mt-1 shrink-0", TYPE_COLORS[type])}
                        >
                          {type}
                        </Badge>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.term}
                              onChange={(e) =>
                                handleUpdate(
                                  actualIndex,
                                  "term",
                                  e.target.value,
                                )}
                              disabled={disabled}
                              placeholder="Enter term"
                              className="flex-1"
                            />

                            {type === "REPLACEMENT" && (
                              <>
                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <Input
                                  value={item.replacement || ""}
                                  onChange={(e) =>
                                    handleUpdate(
                                      actualIndex,
                                      "replacement",
                                      e.target.value,
                                    )}
                                  disabled={disabled}
                                  placeholder="Replace with"
                                  className="flex-1"
                                />
                              </>
                            )}
                          </div>

                          <Textarea
                            value={item.context || ""}
                            onChange={(e) =>
                              handleUpdate(
                                actualIndex,
                                "context",
                                e.target.value,
                              )}
                            disabled={disabled}
                            placeholder="Context (optional) - When should this rule apply?"
                            rows={1}
                            className="text-xs"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(actualIndex)}
                          disabled={disabled}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}

      {/* Total Count */}
      <p className="text-xs text-muted-foreground">
        {vocabulary.length} vocabulary item{vocabulary.length !== 1 ? "s" : ""} configured
      </p>
    </div>
  );
}
