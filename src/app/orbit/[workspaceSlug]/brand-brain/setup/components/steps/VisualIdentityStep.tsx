"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";
import { useFormContext } from "react-hook-form";
import { ColorPaletteInput } from "../ui/ColorPaletteInput";
import { LogoUpload } from "../ui/LogoUpload";

interface VisualIdentityStepProps {
  disabled?: boolean;
  workspaceId: string;
}

export function VisualIdentityStep({
  disabled = false,
  workspaceId,
}: VisualIdentityStepProps) {
  const form = useFormContext<BrandProfileFormData>();

  const handleLogoUpload = (url: string, r2Key: string) => {
    form.setValue("logoUrl", url, { shouldDirty: true });
    form.setValue("logoR2Key", r2Key, { shouldDirty: true });
  };

  const handleLogoRemove = () => {
    form.setValue("logoUrl", "", { shouldDirty: true });
    form.setValue("logoR2Key", "", { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Visual Identity</h2>
        <p className="text-sm text-muted-foreground">
          Upload your brand assets and define your color palette.
        </p>
      </div>

      {/* Logo Upload */}
      <FormField
        control={form.control}
        name="logoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Logo</FormLabel>
            <FormDescription>
              Upload your primary brand logo. Recommended: PNG or SVG, at least 256x256 pixels.
            </FormDescription>
            <FormControl>
              <LogoUpload
                logoUrl={field.value || undefined}
                onUpload={handleLogoUpload}
                onRemove={handleLogoRemove}
                workspaceId={workspaceId}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Color Palette */}
      <FormField
        control={form.control}
        name="colorPalette"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Colors</FormLabel>
            <FormDescription>
              Define your brand&apos;s color palette. Add colors and assign their usage (primary,
              secondary, accent, etc.).
            </FormDescription>
            <FormControl>
              <ColorPaletteInput
                colors={field.value || []}
                onChange={field.onChange}
                maxColors={10}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Color Usage Tips */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">Color Usage Tips</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Primary:</strong> Your main brand color, used for key elements
          </li>
          <li>
            <strong>Secondary:</strong> Complements the primary color
          </li>
          <li>
            <strong>Accent:</strong> Used for calls-to-action and highlights
          </li>
          <li>
            <strong>Background:</strong> Base colors for content areas
          </li>
          <li>
            <strong>Text:</strong> Colors for typography
          </li>
        </ul>
      </div>
    </div>
  );
}
