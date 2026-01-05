"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

interface BrandBasicsStepProps {
  disabled?: boolean;
}

export function BrandBasicsStep({ disabled = false }: BrandBasicsStepProps) {
  const form = useFormContext<BrandProfileFormData>();
  const [newValue, setNewValue] = useState("");

  const values = form.watch("values") || [];

  const handleAddValue = () => {
    if (!newValue.trim()) return;
    if (values.length >= 10) return;

    const currentValues = form.getValues("values") || [];
    form.setValue("values", [...currentValues, newValue.trim()], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setNewValue("");
  };

  const handleRemoveValue = (index: number) => {
    const currentValues = form.getValues("values") || [];
    form.setValue(
      "values",
      currentValues.filter((_, i) => i !== index),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddValue();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Brand Basics</h2>
        <p className="text-sm text-muted-foreground">
          Define your brand&apos;s core identity and values.
        </p>
      </div>

      {/* Brand Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Name *</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Enter your brand name"
                disabled={disabled}
                maxLength={100}
              />
            </FormControl>
            <FormDescription>
              The name that will represent your brand across all content.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Mission Statement */}
      <FormField
        control={form.control}
        name="mission"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mission Statement</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ""}
                placeholder="What is your brand's mission? What do you stand for?"
                disabled={disabled}
                rows={4}
                maxLength={1000}
              />
            </FormControl>
            <FormDescription>
              A clear statement of your brand&apos;s purpose and goals. This helps AI maintain
              consistent messaging.
            </FormDescription>
            <div className="text-right text-xs text-muted-foreground">
              {(field.value || "").length} / 1000
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand Values */}
      <FormField
        control={form.control}
        name="values"
        render={() => (
          <FormItem>
            <FormLabel>Brand Values</FormLabel>
            <FormDescription>
              Core values that define your brand&apos;s identity (max 10).
            </FormDescription>

            {/* Values Tags */}
            {values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {values.map((value, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1 px-3 py-1"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(index)}
                      disabled={disabled}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Value Input */}
            {values.length < 10 && (
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a value (e.g., Innovation, Trust)"
                    disabled={disabled}
                    maxLength={50}
                    className="flex-1"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddValue}
                  disabled={disabled || !newValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {values.length} / 10 values
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
