import { Button } from "@/components/ui/button";
import type { InboxItemStatus } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Ban, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InboxConfirmDialog } from "./inbox-confirm-dialog";

interface InboxActionButtonsProps {
  itemId: string;
  workspaceSlug: string;
  onActionComplete?: () => void;
}

type ActionType = "RESOLVE" | "ARCHIVE" | "IGNORE" | null;

interface UpdateInboxItemPayload {
  status: InboxItemStatus;
}

/**
 * Maps UI action types to API status values
 * RESOLVE -> ARCHIVED (with resolvedAt timestamp set server-side via archiveInboxItem)
 * ARCHIVE -> ARCHIVED
 * IGNORE -> IGNORED
 */
function getStatusForAction(action: ActionType): InboxItemStatus | null {
  switch (action) {
    case "RESOLVE":
    case "ARCHIVE":
      return "ARCHIVED";
    case "IGNORE":
      return "IGNORED";
    default:
      return null;
  }
}

export function InboxActionButtons({
  itemId,
  workspaceSlug,
  onActionComplete,
}: InboxActionButtonsProps) {
  const [actionType, setActionType] = useState<ActionType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = async () => {
    if (!actionType) return;

    const status = getStatusForAction(actionType);
    if (!status) return;

    setIsLoading(true);

    try {
      const payload: UpdateInboxItemPayload = { status };

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/inbox/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to ${actionType.toLowerCase()} item`,
        );
      }

      toast.success(`Item ${actionType.toLowerCase()}d successfully`);

      queryClient.invalidateQueries({
        queryKey: ["inboxItems", workspaceSlug],
      });
      onActionComplete?.();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error
        ? error.message
        : "Failed to perform action";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const getDialogContent = () => {
    switch (actionType) {
      case "RESOLVE":
        return {
          title: "Mark as Resolved?",
          description:
            "This will archive the item and mark it as resolved. You can still access it in the archives.",
          confirmText: "Mark Resolved",
        };
      case "ARCHIVE":
        return {
          title: "Archive Item?",
          description:
            "This item will be moved to the archives. You can restore it later if needed.",
          confirmText: "Archive",
        };
      case "IGNORE":
        return {
          title: "Ignore Item?",
          description:
            "This item will be marked as ignored. It won't appear in your main inbox unless you change filters.",
          confirmText: "Ignore",
          variant: "destructive" as const,
        };
      default:
        return {
          title: "",
          description: "",
          confirmText: "",
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActionType("RESOLVE")}
          disabled={isLoading}
          className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
        >
          {isLoading && actionType === "RESOLVE"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCircle className="h-4 w-4" />}
          Mark Resolved
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActionType("ARCHIVE")}
          disabled={isLoading}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {isLoading && actionType === "ARCHIVE"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Archive className="h-4 w-4" />}
          Archive
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActionType("IGNORE")}
          disabled={isLoading}
          className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {isLoading && actionType === "IGNORE"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Ban className="h-4 w-4" />}
          Ignore
        </Button>
      </div>

      <InboxConfirmDialog
        isOpen={!!actionType && !isLoading}
        onCancel={() => setActionType(null)}
        onConfirm={handleAction}
        title={dialogContent.title}
        description={dialogContent.description}
        confirmText={dialogContent.confirmText}
        variant={dialogContent.variant}
      />
    </>
  );
}
