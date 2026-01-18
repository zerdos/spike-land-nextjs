"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { campaignObjectivesSchema } from "@/lib/validation/brief";

type CampaignObjectivesFormValues = z.infer<typeof campaignObjectivesSchema>;

interface CampaignObjectivesFormProps {
  onSubmit: (data: CampaignObjectivesFormValues) => void;
}

export function CampaignObjectivesForm({
  onSubmit,
}: CampaignObjectivesFormProps) {
  const form = useForm<CampaignObjectivesFormValues>({
    resolver: zodResolver(campaignObjectivesSchema),
    defaultValues: {
      objective: "",
      kpis: [],
      successMetrics: "",
    },
  });

  return (
    <Form {...form}>
      <form
        id="campaign-objectives-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Objective</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Increase brand awareness"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kpis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key Performance Indicators (KPIs)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Website Traffic, Conversion Rate"
                  onChange={(e) => {
                    const kpis = e.target.value.split(",").map((k) => k.trim());
                    field.onChange(kpis);
                  }}
                />
              </FormControl>
              <FormDescription>Enter KPIs separated by commas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="successMetrics"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Success Metrics</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Achieve a 20% increase in website traffic"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="hidden">
          Submit
        </Button>
      </form>
    </Form>
  );
}
