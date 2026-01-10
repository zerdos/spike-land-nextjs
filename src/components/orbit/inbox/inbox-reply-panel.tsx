
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from 'react-query';
import { useParams } from 'next/navigation';

const replySchema = z.object({
  content: z.string().trim().min(1, 'Reply content cannot be empty'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface InboxReplyPanelProps {
  itemId: string;
}

async function postReply(workspaceSlug: string, itemId: string, content: string) {
  const res = await fetch(`/api/orbit/${workspaceSlug}/inbox/${itemId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    let errorText: string;
    try {
      errorText = await res.text();
    } catch {
      errorText = '<unable to read response body>';
    }
    throw new Error(
      `Failed to post reply: HTTP ${res.status} ${res.statusText} - ${errorText}`,
    );
  }
  return res.json();
}

export function InboxReplyPanel({ itemId }: InboxReplyPanelProps) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: '' },
  });

  const mutation = useMutation(
    (content: string) => postReply(workspaceSlug, itemId, content),
    {
      onSuccess: () => {
        form.reset();
        // In a real app, you'd probably want to refetch the inbox item
      },
    }
  );

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
        <Button type="submit" disabled={mutation.isLoading}>
          {mutation.isLoading ? 'Sending...' : 'Send Reply'}
        </Button>
      </form>
    </Form>
  );
}
