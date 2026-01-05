"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  COLOR_USAGES,
  type ColorPaletteItem,
  type ColorUsage,
} from "@/lib/validations/brand-brain";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export interface ColorPaletteInputProps {
  colors: ColorPaletteItem[];
  onChange: (colors: ColorPaletteItem[]) => void;
  maxColors?: number;
  disabled?: boolean;
  className?: string;
}

const USAGE_LABELS: Record<ColorUsage, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  text: "Text",
};

export function ColorPaletteInput({
  colors,
  onChange,
  maxColors = 10,
  disabled = false,
  className,
}: ColorPaletteInputProps) {
  const [newColor, setNewColor] = useState<Partial<ColorPaletteItem>>({
    name: "",
    hex: "#000000",
    usage: undefined,
  });

  const handleAddColor = () => {
    if (!newColor.name || !newColor.hex) return;
    if (colors.length >= maxColors) return;

    const colorToAdd: ColorPaletteItem = {
      name: newColor.name,
      hex: newColor.hex,
      usage: newColor.usage,
    };

    onChange([...colors, colorToAdd]);
    setNewColor({ name: "", hex: "#000000", usage: undefined });
  };

  const handleRemoveColor = (index: number) => {
    const updatedColors = colors.filter((_, i) => i !== index);
    onChange(updatedColors);
  };

  const handleUpdateColor = (
    index: number,
    field: keyof ColorPaletteItem,
    value: string | undefined,
  ) => {
    const updatedColors = colors.map((color, i) => {
      if (i !== index) return color;
      return { ...color, [field]: value };
    });
    onChange(updatedColors);
  };

  const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Existing Colors */}
      {colors.length > 0 && (
        <div className="space-y-2">
          {colors.map((color, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-card p-2"
            >
              {/* Color Preview */}
              <div
                className="h-8 w-8 shrink-0 rounded-md border shadow-sm"
                style={{ backgroundColor: color.hex }}
              />

              {/* Color Picker */}
              <input
                type="color"
                value={color.hex}
                onChange={(e) => handleUpdateColor(index, "hex", e.target.value)}
                disabled={disabled}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />

              {/* Hex Input */}
              <Input
                value={color.hex}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith("#")) {
                    value = "#" + value;
                  }
                  handleUpdateColor(index, "hex", value.toUpperCase());
                }}
                disabled={disabled}
                className={cn(
                  "w-24 font-mono text-xs",
                  !isValidHex(color.hex) && "border-destructive",
                )}
                placeholder="#000000"
              />

              {/* Name Input */}
              <Input
                value={color.name}
                onChange={(e) => handleUpdateColor(index, "name", e.target.value)}
                disabled={disabled}
                className="flex-1"
                placeholder="Color name"
              />

              {/* Usage Select */}
              <Select
                value={color.usage || "none"}
                onValueChange={(value) =>
                  handleUpdateColor(
                    index,
                    "usage",
                    value === "none" ? undefined : (value as ColorUsage),
                  )}
                disabled={disabled}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No usage</SelectItem>
                  {COLOR_USAGES.map((usage) => (
                    <SelectItem key={usage} value={usage}>
                      {USAGE_LABELS[usage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveColor(index)}
                disabled={disabled}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Color */}
      {colors.length < maxColors && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 p-2">
          {/* Color Preview */}
          <div
            className="h-8 w-8 shrink-0 rounded-md border shadow-sm"
            style={{ backgroundColor: newColor.hex || "#000000" }}
          />

          {/* Color Picker */}
          <input
            type="color"
            value={newColor.hex || "#000000"}
            onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
            disabled={disabled}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          />

          {/* Hex Input */}
          <Input
            value={newColor.hex || ""}
            onChange={(e) => {
              let value = e.target.value;
              if (!value.startsWith("#")) {
                value = "#" + value;
              }
              setNewColor({ ...newColor, hex: value.toUpperCase() });
            }}
            disabled={disabled}
            className="w-24 font-mono text-xs"
            placeholder="#000000"
          />

          {/* Name Input */}
          <Input
            value={newColor.name || ""}
            onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
            disabled={disabled}
            className="flex-1"
            placeholder="Color name"
          />

          {/* Usage Select */}
          <Select
            value={newColor.usage || "none"}
            onValueChange={(value) =>
              setNewColor({
                ...newColor,
                usage: value === "none" ? undefined : (value as ColorUsage),
              })}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Usage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No usage</SelectItem>
              {COLOR_USAGES.map((usage) => (
                <SelectItem key={usage} value={usage}>
                  {USAGE_LABELS[usage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddColor}
            disabled={disabled || !newColor.name || !newColor.hex}
            className="h-8 w-8 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Max colors indicator */}
      <p className="text-xs text-muted-foreground">
        {colors.length} / {maxColors} colors
      </p>
    </div>
  );
}
