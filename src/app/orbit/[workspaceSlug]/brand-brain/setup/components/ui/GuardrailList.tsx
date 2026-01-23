"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type Guardrail,
  GUARDRAIL_SEVERITIES,
  GUARDRAIL_TYPE_LABELS,
  type GuardrailSeverity,
  type GuardrailType,
} from "@/lib/validations/brand-brain";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export interface GuardrailListProps {
  guardrails: Guardrail[];
  onChange: (guardrails: Guardrail[]) => void;
  type: GuardrailType;
  disabled?: boolean;
  className?: string;
}

const SEVERITY_COLORS: Record<GuardrailSeverity, string> = {
  LOW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function GuardrailList({
  guardrails,
  onChange,
  type,
  disabled = false,
  className,
}: GuardrailListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newGuardrail, setNewGuardrail] = useState<Partial<Guardrail>>({
    type,
    name: "",
    description: "",
    severity: "MEDIUM",
    isActive: true,
  });

  // Filter guardrails by type
  const filteredGuardrails = guardrails.filter((g) => g.type === type);

  const handleAdd = () => {
    if (!newGuardrail.name?.trim()) return;

    const guardrailToAdd: Guardrail = {
      type,
      name: newGuardrail.name.trim(),
      description: newGuardrail.description?.trim() || undefined,
      severity: newGuardrail.severity || "MEDIUM",
      isActive: true,
    };

    onChange([...guardrails, guardrailToAdd]);
    setNewGuardrail({
      type,
      name: "",
      description: "",
      severity: "MEDIUM",
      isActive: true,
    });
  };

  const handleRemove = (indexInFiltered: number) => {
    // Find the actual index in the full guardrails array
    const guardrailToRemove = filteredGuardrails[indexInFiltered];
    if (!guardrailToRemove) return;

    const actualIndex = guardrails.findIndex(
      (g) =>
        g.type === guardrailToRemove.type &&
        g.name === guardrailToRemove.name,
    );

    if (actualIndex !== -1) {
      const updated = guardrails.filter((_, i) => i !== actualIndex);
      onChange(updated);
    }

    if (expandedIndex === indexInFiltered) {
      setExpandedIndex(null);
    }
  };

  const handleUpdate = (
    indexInFiltered: number,
    field: keyof Guardrail,
    value: string | boolean,
  ) => {
    // Find the actual index in the full guardrails array
    const guardrailToUpdate = filteredGuardrails[indexInFiltered];
    if (!guardrailToUpdate) return;

    const actualIndex = guardrails.findIndex(
      (g) =>
        g.type === guardrailToUpdate.type &&
        g.name === guardrailToUpdate.name,
    );

    if (actualIndex !== -1) {
      const updated = guardrails.map((g, i) => {
        if (i !== actualIndex) return g;
        return { ...g, [field]: value };
      });
      onChange(updated);
    }
  };

  const typeLabel = GUARDRAIL_TYPE_LABELS[type];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Existing Guardrails */}
      {filteredGuardrails.length > 0 && (
        <div className="space-y-2">
          {filteredGuardrails.map((guardrail, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card"
            >
              {/* Header */}
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  disabled={disabled}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {expandedIndex === index
                    ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="flex-1 font-medium">{guardrail.name}</span>
                </button>

                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    SEVERITY_COLORS[guardrail.severity ?? "MEDIUM"],
                  )}
                >
                  {guardrail.severity ?? "MEDIUM"}
                </Badge>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Expanded Content */}
              {expandedIndex === index && (
                <div className="space-y-3 border-t px-3 pb-3 pt-3">
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Name
                    </span>
                    <Input
                      value={guardrail.name}
                      onChange={(e) => handleUpdate(index, "name", e.target.value)}
                      disabled={disabled}
                      placeholder="Enter name"
                    />
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Description (optional)
                    </span>
                    <Textarea
                      value={guardrail.description || ""}
                      onChange={(e) => handleUpdate(index, "description", e.target.value)}
                      disabled={disabled}
                      placeholder="Add more details about this rule..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Severity
                    </span>
                    <Select
                      value={guardrail.severity ?? "MEDIUM"}
                      onValueChange={(value) => handleUpdate(index, "severity", value)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GUARDRAIL_SEVERITIES.map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            {severity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Guardrail */}
      <div className="rounded-lg border border-dashed bg-muted/50 p-3">
        <div className="space-y-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Add new {typeLabel.toLowerCase()}
            </span>
            <Input
              value={newGuardrail.name || ""}
              onChange={(e) => setNewGuardrail({ ...newGuardrail, name: e.target.value })}
              disabled={disabled}
              placeholder={`Enter ${typeLabel.toLowerCase()} name`}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description (optional)
            </span>
            <Textarea
              value={newGuardrail.description || ""}
              onChange={(e) =>
                setNewGuardrail({
                  ...newGuardrail,
                  description: e.target.value,
                })}
              disabled={disabled}
              placeholder="Add more details..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Severity
              </span>
              <Select
                value={newGuardrail.severity || "MEDIUM"}
                onValueChange={(value) =>
                  setNewGuardrail({
                    ...newGuardrail,
                    severity: value as GuardrailSeverity,
                  })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUARDRAIL_SEVERITIES.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAdd}
                disabled={disabled || !newGuardrail.name?.trim()}
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filteredGuardrails.length} {typeLabel.toLowerCase()}
        {filteredGuardrails.length !== 1 ? "s" : ""} configured
      </p>
    </div>
  );
}
