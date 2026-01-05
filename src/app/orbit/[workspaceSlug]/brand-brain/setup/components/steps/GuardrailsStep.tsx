"use client";

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";
import { useFormContext } from "react-hook-form";
import { GuardrailList } from "../ui/GuardrailList";
import { VocabularyList } from "../ui/VocabularyList";

interface GuardrailsStepProps {
  disabled?: boolean;
}

export function GuardrailsStep({ disabled = false }: GuardrailsStepProps) {
  const form = useFormContext<BrandProfileFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Content Guardrails</h2>
        <p className="text-sm text-muted-foreground">
          Set up rules to keep AI-generated content aligned with your brand guidelines.
        </p>
      </div>

      <Tabs defaultValue="prohibited" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prohibited">Prohibited Topics</TabsTrigger>
          <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
        </TabsList>

        {/* Prohibited Topics */}
        <TabsContent value="prohibited" className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium">Prohibited Topics</h3>
            <p className="text-sm text-muted-foreground">
              Topics that should never be discussed or mentioned in brand content. AI will actively
              avoid these subjects.
            </p>
          </div>

          <FormField
            control={form.control}
            name="guardrails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Prohibited Topics</FormLabel>
                <FormControl>
                  <GuardrailList
                    guardrails={field.value || []}
                    onChange={field.onChange}
                    type="PROHIBITED_TOPIC"
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </TabsContent>

        {/* Required Disclosures */}
        <TabsContent value="disclosures" className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium">Required Disclosures</h3>
            <p className="text-sm text-muted-foreground">
              Information that must be included when certain topics are discussed. Examples: legal
              disclaimers, affiliate disclosures, regulatory notices.
            </p>
          </div>

          <FormField
            control={form.control}
            name="guardrails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Required Disclosures</FormLabel>
                <FormControl>
                  <GuardrailList
                    guardrails={field.value || []}
                    onChange={field.onChange}
                    type="REQUIRED_DISCLOSURE"
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </TabsContent>

        {/* Content Warnings */}
        <TabsContent value="warnings" className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium">Content Warnings</h3>
            <p className="text-sm text-muted-foreground">
              Topics that require warning labels or special handling. AI will flag content
              containing these topics for review.
            </p>
          </div>

          <FormField
            control={form.control}
            name="guardrails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Content Warnings</FormLabel>
                <FormControl>
                  <GuardrailList
                    guardrails={field.value || []}
                    onChange={field.onChange}
                    type="CONTENT_WARNING"
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </TabsContent>

        {/* Vocabulary */}
        <TabsContent value="vocabulary" className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium">Brand Vocabulary</h3>
            <p className="text-sm text-muted-foreground">
              Define preferred, banned, and replacement terms to maintain consistent brand language.
            </p>
          </div>

          <FormField
            control={form.control}
            name="vocabulary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Brand Vocabulary</FormLabel>
                <FormDescription>
                  Set up vocabulary rules to ensure consistent brand terminology.
                </FormDescription>
                <FormControl>
                  <VocabularyList
                    vocabulary={field.value || []}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
