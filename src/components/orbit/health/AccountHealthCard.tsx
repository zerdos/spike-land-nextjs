/**
 * Account Health Card - Individual account status display
 * Resolves #522 (ORB-066): Account Health Monitor UI
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS = {
  HEALTHY: "bg-green-100 text-green-800 border-green-200",
  DEGRADED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  UNHEALTHY: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

interface AccountHealthCardProps {
  account: {
    accountId: string;
    accountName: string;
    platform: string;
    healthScore: number;
    status: keyof typeof STATUS_COLORS;
    issues: string[];
    lastChecked: string;
  };
  workspaceSlug: string;
  onRefresh: () => void;
}

export function AccountHealthCard({ account, workspaceSlug, onRefresh }: AccountHealthCardProps) {
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/accounts/health/${account.accountId}/recover`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Recovery failed");
      toast.success("Recovery initiated");
      onRefresh();
    } catch (_error) {
      toast.error("Failed to initiate recovery");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Card className={STATUS_COLORS[account.status]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{account.accountName}</CardTitle>
          <Badge variant="outline">{account.platform}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Health Score</span>
            <span className="font-bold">{account.healthScore}/100</span>
          </div>
          <Progress value={account.healthScore} className="h-2" />
        </div>

        {account.issues.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Issues ({account.issues.length})
            </p>
            <ul className="text-sm space-y-1">
              {account.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="mt-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Last checked: {new Date(account.lastChecked).toLocaleTimeString()}
          </p>
          {account.status !== "HEALTHY" && (
            <Button size="sm" onClick={handleRecover} disabled={isRecovering}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {isRecovering ? "Recovering..." : "Recover"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
