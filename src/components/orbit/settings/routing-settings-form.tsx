"use client";

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
import { Switch } from "@/components/ui/switch";
import { SmartRoutingSettings } from "@/lib/smart-routing/types";
import { SmartRoutingSettingsSchema } from "@/lib/validations/smart-routing";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface RoutingSettingsFormProps {
  initialSettings: SmartRoutingSettings;
  workspaceSlug: string;
}

export function RoutingSettingsForm({ initialSettings, workspaceSlug }: RoutingSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SmartRoutingSettings>({
    resolver: zodResolver(SmartRoutingSettingsSchema),
    defaultValues: initialSettings,
  });

  async function onSubmit(data: SmartRoutingSettings) {
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/orbit/${workspaceSlug}/inbox/routing/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!resp.ok) throw new Error("Failed to save settings");

      const updated = await resp.json();
      form.reset(updated);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">General</h3>
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Smart Routing</FormLabel>
                  <FormDescription>
                    Automatically analyze and route incoming inbox items.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autoAnalyzeOnFetch"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Auto-Analysis</FormLabel>
                  <FormDescription>
                    Analyze messages immediately when fetched from platforms.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Priority Weights</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(initialSettings.priorityWeights).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={`priorityWeights.${key as keyof SmartRoutingSettings["priorityWeights"]}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
