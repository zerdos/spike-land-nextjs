"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const assignSchema = z.object({
  assignedToId: z.string(),
});

type AssignFormValues = z.infer<typeof assignSchema>;

interface InboxAssignDialogProps {
  itemId: string;
  teamMembers: { id: string; name: string; }[];
  onAssign: () => void;
}

async function assignItem(
  workspaceSlug: string,
  itemId: string,
  assignedToId: string,
) {
  const res = await fetch(`/api/orbit/${workspaceSlug}/inbox/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedToId }),
  });
  if (!res.ok) {
    let responseText: string | undefined;
    try {
      responseText = await res.text();
    } catch {
      // Intentionally silent: Response body unavailable - continue with undefined for error message.
      responseText = undefined;
    }
    const statusInfo = `${res.status} ${res.statusText || ""}`.trim();
    const bodyInfo = responseText && responseText.length > 0
      ? ` - Response body: ${responseText}`
      : "";
    throw new Error(`Failed to assign item (${statusInfo})${bodyInfo}`);
  }
  return res.json();
}

export function InboxAssignDialog(
  { itemId, teamMembers, onAssign }: InboxAssignDialogProps,
) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const queryClient = useQueryClient();
  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {},
  });

  const mutation = useMutation({
    mutationFn: (assignedToId: string) => assignItem(workspaceSlug, itemId, assignedToId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inboxItems", workspaceSlug],
      });
      onAssign();
    },
  });

  function onSubmit(data: AssignFormValues) {
    mutation.mutate(data.assignedToId);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Assign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to a team member</DialogTitle>
          <DialogDescription>
            Select a team member to assign this conversation to.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Member</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
