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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RelayDraftsPanel } from "../relay/relay-drafts-panel";

const replySchema = z.object({
  content: z.string().trim().min(1, "Reply content cannot be empty"),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface InboxReplyPanelProps {
  itemId: string;
}

async function postReply(
  workspaceSlug: string,
  itemId: string,
  content: string,
) {
  const res = await fetch(`/api/orbit/${workspaceSlug}/inbox/${itemId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    let errorText: string;
    try {
      errorText = await res.text();
    } catch {
      errorText = "<unable to read response body>";
    }
    throw new Error(
      `Failed to post reply: HTTP ${res.status} ${res.statusText} - ${errorText}`,
    );
  }
  return res.json();
}

function ManualReplyForm({ itemId }: { itemId: string; }) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const queryClient = useQueryClient();
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: "" },
  });

  const mutation = useMutation({
    mutationFn: (content: string) => postReply(workspaceSlug, itemId, content),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["inboxItems", workspaceSlug],
      });
    },
  });

  function onSubmit(data: ReplyFormValues) {
    mutation.mutate(data.content);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply</FormLabel>
              <FormControl>
                <Textarea placeholder="Type your reply here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending..." : "Send Reply"}
        </Button>
      </form>
    </Form>
  );
}

export function InboxReplyPanel({ itemId }: InboxReplyPanelProps) {
  return (
    <Tabs defaultValue="ai-drafts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ai-drafts" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Drafts
        </TabsTrigger>
        <TabsTrigger value="manual" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Manual Reply
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ai-drafts" className="mt-4">
        <RelayDraftsPanel inboxItemId={itemId} />
      </TabsContent>
      <TabsContent value="manual" className="mt-4">
        <ManualReplyForm itemId={itemId} />
      </TabsContent>
    </Tabs>
  );
}
