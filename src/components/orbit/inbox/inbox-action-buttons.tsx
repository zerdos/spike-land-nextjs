import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InboxConfirmDialog } from "./inbox-confirm-dialog";

interface InboxActionButtonsProps {
  itemId: string;
  workspaceSlug: string;
  onActionComplete?: () => void;
}

type ActionType = "RESOLVE" | "ARCHIVE" | "IGNORE" | null;

export function InboxActionButtons({
  itemId: _itemId, // TODO: Will be used with actual API mutation
  workspaceSlug,
  onActionComplete,
}: InboxActionButtonsProps) {
  const [actionType, setActionType] = useState<ActionType>(null);
  const queryClient = useQueryClient();

  const handleAction = async () => {
    if (!actionType) return;

    try {
      // TODO: Replace with actual API mutation hook
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success(`Item ${actionType.toLowerCase()}d successfully`);

      queryClient.invalidateQueries({ queryKey: ["inboxItems", workspaceSlug] });
      onActionComplete?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to perform action");
    } finally {
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
          className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
        >
          <CheckCircle className="h-4 w-4" />
          Mark Resolved
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActionType("ARCHIVE")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Archive className="h-4 w-4" />
          Archive
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActionType("IGNORE")}
          className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Ban className="h-4 w-4" />
          Ignore
        </Button>
      </div>

      <InboxConfirmDialog
        isOpen={!!actionType}
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
