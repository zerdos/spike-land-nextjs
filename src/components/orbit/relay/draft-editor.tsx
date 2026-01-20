"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RelayDraft } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface DraftEditorProps {
  draft: RelayDraft & {
    metadata?: {
      platformLimit?: number;
    } | null;
  };
  onSaved?: () => void;
}

const editDraftSchema = z.object({
  content: z.string().trim().min(1, "Draft content cannot be empty"),
  reason: z.string().optional(),
});

type EditDraftFormValues = z.infer<typeof editDraftSchema>;

async function editDraft(
  workspaceSlug: string,
  draftId: string,
  content: string,
  reason?: string,
) {
  const res = await fetch(
    `/api/orbit/${workspaceSlug}/relay/drafts/${draftId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", content, reason }),
    },
  );

  if (!res.ok) {
    let errorText: string;
    try {
      const errorData = await res.json();
      errorText = errorData.error || res.statusText;
    } catch {
      // Intentionally silent: Response body may not be valid JSON - use status text as fallback.
      errorText = res.statusText;
    }
    throw new Error(`Failed to edit draft: ${errorText}`);
  }

  return res.json();
}

export function DraftEditor({ draft, onSaved }: DraftEditorProps) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const queryClient = useQueryClient();

  const form = useForm<EditDraftFormValues>({
    resolver: zodResolver(editDraftSchema),
    defaultValues: {
      content: draft.content,
      reason: "",
    },
  });

  // Reset form when draft changes
  useEffect(() => {
    form.reset({
      content: draft.content,
      reason: "",
    });
  }, [draft.id, draft.content, form]);

  const mutation = useMutation({
    mutationFn: (values: EditDraftFormValues) =>
      editDraft(workspaceSlug, draft.id, values.content, values.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relayDrafts", workspaceSlug],
      });
      onSaved?.();
    },
  });

  const content = form.watch("content");
  const characterCount = content.length;
  const platformLimit = (draft.metadata as { platformLimit?: number; })?.platformLimit ?? 0;
  const isOverLimit = platformLimit > 0 && characterCount > platformLimit;
  const hasChanges = content !== draft.content;
  const isPending = draft.status === "PENDING";

  function onSubmit(data: EditDraftFormValues) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                <span>Draft Content</span>
                {platformLimit > 0 && (
                  <span
                    className={cn(
                      "text-xs font-normal",
                      isOverLimit ? "text-red-500" : "text-muted-foreground",
                    )}
                  >
                    {characterCount}/{platformLimit}
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder="Edit the draft content..."
                  disabled={!isPending || mutation.isPending}
                  data-testid="draft-content-editor"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasChanges && isPending && (
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Edit Reason (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Why are you making this change?"
                    disabled={mutation.isPending}
                    data-testid="draft-edit-reason"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!isPending && (
          <p className="text-sm text-muted-foreground">
            This draft has been {draft.status.toLowerCase()} and cannot be edited.
          </p>
        )}

        {isPending && hasChanges && (
          <Button
            type="submit"
            disabled={mutation.isPending || isOverLimit}
            data-testid="save-draft-button"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}

        {mutation.error && (
          <p className="text-sm text-red-500">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to save"}
          </p>
        )}
      </form>
    </Form>
  );
}
