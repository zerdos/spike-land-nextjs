"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type ContentPlatform,
  getPlatformDisplayName,
  PLATFORM_LIMITS,
} from "@/lib/validations/brand-rewrite";

interface PlatformSelectorProps {
  value: ContentPlatform;
  onChange: (platform: ContentPlatform) => void;
  currentLength: number;
  disabled?: boolean;
}

const PLATFORM_ICONS: Record<ContentPlatform, string> = {
  TWITTER: "𝕏",
  LINKEDIN: "in",
  INSTAGRAM: "📷",
  FACEBOOK: "f",
  GENERAL: "📝",
};

export function PlatformSelector({
  value,
  onChange,
  currentLength,
  disabled = false,
}: PlatformSelectorProps) {
  const limit = PLATFORM_LIMITS[value];
  const percentage = (currentLength / limit) * 100;
  const isWarning = percentage > 80 && percentage <= 100;
  const isOver = percentage > 100;

  return (
    <div className="space-y-2">
      <Label htmlFor="platform">Target Platform</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ContentPlatform)}
        disabled={disabled}
      >
        <SelectTrigger id="platform" className="w-full">
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PLATFORM_LIMITS) as ContentPlatform[]).map((
            platform,
          ) => (
            <SelectItem key={platform} value={platform}>
              <span className="flex items-center gap-2">
                <span className="w-6 text-center font-bold">
                  {PLATFORM_ICONS[platform]}
                </span>
                <span>{getPlatformDisplayName(platform)}</span>
                <span className="text-xs text-muted-foreground">
                  ({PLATFORM_LIMITS[platform].toLocaleString()} chars)
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Character count indicator */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isOver && "text-red-600 dark:text-red-400",
            isWarning && "text-yellow-600 dark:text-yellow-400",
            !isWarning && !isOver && "text-muted-foreground",
          )}
        >
          {currentLength.toLocaleString()} / {limit.toLocaleString()} characters
        </span>
        {isOver && (
          <span className="text-red-600 dark:text-red-400 text-xs">
            Over limit by {(currentLength - limit).toLocaleString()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isOver && "bg-red-500",
            isWarning && "bg-yellow-500",
            !isWarning && !isOver && "bg-green-500",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
