"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface AutopilotExecutionHistoryProps {
  workspaceSlug: string;
}

interface ExecutionRecord {
  id: string;
  status: string;
  recommendationType: string;
  previousBudget: number;
  newBudget: number;
  executedAt: string;
  campaign: {
    name: string;
    platform: string;
  };
  rolledBackAt?: string;
}

export function AutopilotExecutionHistory({ workspaceSlug }: AutopilotExecutionHistoryProps) {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/orbit/${workspaceSlug}/allocator/autopilot/executions`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.executions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openRollbackDialog = (executionId: string) => {
    setSelectedExecutionId(executionId);
    setRollbackDialogOpen(true);
  };

  const handleRollbackConfirm = async () => {
    if (!selectedExecutionId) return;

    try {
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/autopilot/executions/${selectedExecutionId}/rollback`,
        {
          method: "POST",
        },
      );

      if (!res.ok) throw new Error("Rollback failed");

      toast.success("Rollback successful");
      fetchHistory(); // Refresh
    } catch (err) {
      toast.error("Failed to rollback");
      console.error(err);
    } finally {
      setRollbackDialogOpen(false);
      setSelectedExecutionId(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rollback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec) => (
                <TableRow key={exec.id} className={exec.rolledBackAt ? "opacity-50" : ""}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(exec.executedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{exec.campaign.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {exec.campaign.platform}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {exec.recommendationType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{exec.previousBudget}</span>
                      {" → "}
                      <span className="font-bold">{exec.newBudget}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={exec.status === "COMPLETED"
                        ? "default"
                        : exec.status === "FAILED"
                        ? "destructive"
                        : "secondary"}
                      className="text-xs"
                    >
                      {exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {exec.status === "COMPLETED" && !exec.rolledBackAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRollbackDialog(exec.id)}
                        title="Rollback this change"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {exec.rolledBackAt && (
                      <span className="text-xs text-muted-foreground italic">Rolled back</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {executions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No execution history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this change? This will create a new budget
              adjustment to reverse the previous change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollbackConfirm}>Rollback</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
