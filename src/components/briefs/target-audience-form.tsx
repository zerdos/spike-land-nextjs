"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { targetAudienceSchema } from "@/lib/validation/brief";

type TargetAudienceFormValues = z.infer<typeof targetAudienceSchema>;

interface TargetAudienceFormProps {
  onSubmit: (data: TargetAudienceFormValues) => void;
}

export function TargetAudienceForm({ onSubmit }: TargetAudienceFormProps) {
  const form = useForm<TargetAudienceFormValues>({
    resolver: zodResolver(targetAudienceSchema),
    defaultValues: {
      demographics: {
        ageRange: "",
        gender: "",
        location: "",
      },
      interests: [],
      behaviors: [],
    },
  });

  return (
    <Form {...form}>
      <form
        id="target-audience-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="demographics.ageRange"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age Range</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 18-24" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="demographics.gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Female" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="demographics.location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., California, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="interests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interests</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Hiking, Cooking, Technology"
                  onChange={(e) => {
                    const interests = e.target.value
                      .split(",")
                      .map((i) => i.trim());
                    field.onChange(interests);
                  }}
                />
              </FormControl>
              <FormDescription>
                Enter interests separated by commas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="behaviors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Behaviors</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Online Shoppers, Early Adopters"
                  onChange={(e) => {
                    const behaviors = e.target.value
                      .split(",")
                      .map((b) => b.trim());
                    field.onChange(behaviors);
                  }}
                />
              </FormControl>
              <FormDescription>
                Enter behaviors separated by commas.
              </FormDescription>
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
