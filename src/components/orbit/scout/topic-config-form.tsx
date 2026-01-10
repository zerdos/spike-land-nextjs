'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createTopicSchema, topicKeywordsSchema } from '@/lib/scout/topic-config';
import { toast } from 'sonner';

interface TopicConfigFormProps {
  workspaceSlug: string;
  initialData?: z.infer<typeof createTopicSchema>;
  onSave: () => void;
}

// Simplified schema for the form
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  andKeywords: z.string().optional(),
  orKeywords: z.string().optional(),
  notKeywords: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function TopicConfigForm({
  workspaceSlug,
  initialData,
  onSave,
}: TopicConfigFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      andKeywords: (initialData?.keywords as any)?.and?.join(', ') ?? '',
      orKeywords: (initialData?.keywords as any)?.or?.join(', ') ?? '',
      notKeywords: (initialData?.keywords as any)?.not?.join(', ') ?? '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      and: values.andKeywords?.split(',').map(kw => kw.trim()).filter(Boolean),
      or: values.orKeywords?.split(',').map(kw => kw.trim()).filter(Boolean),
      not: values.notKeywords?.split(',').map(kw => kw.trim()).filter(Boolean),
    };

    const payload = {
      name: values.name,
      keywords,
      isActive: values.isActive,
    };

    const endpoint = initialData
      ? `/api/orbit/${workspaceSlug}/scout/topics/${(initialData as any).id}`
      : `/api/orbit/${workspaceSlug}/scout/topics`;
    const method = initialData ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      toast.success(`Topic ${initialData ? 'updated' : 'created'} successfully.`);
      onSave();
    } else {
      toast.error('Failed to save topic.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Topic' : 'Create Topic'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AI in Healthcare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="andKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords (AND)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ai, ml, deep learning" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords (OR)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., gpt-4, claude, gemini" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords (NOT)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., crypto, blockchain" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
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
            <Button type="submit">
              {initialData ? 'Save Changes' : 'Create Topic'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
