/**
 * Retention Policy Manager - Configure retention policies
 * Resolves #522 (ORB-068): Audit Log UI
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface RetentionPolicy {
  id: string;
  actionType: string;
  retentionDays: number;
  archiveAfterDays: number;
  isActive: boolean;
}

interface RetentionPolicyManagerProps {
  workspaceSlug: string;
}

export function RetentionPolicyManager({ workspaceSlug }: RetentionPolicyManagerProps) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/audit/retention`,
      );
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (_error) {
      toast.error("Failed to load retention policies");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Retention Policies</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Policy
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading
          ? <p className="text-center py-8 text-muted-foreground">Loading policies...</p>
          : policies.length === 0
          ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No retention policies configured
              </CardContent>
            </Card>
          )
          : (
            policies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{policy.actionType}</Badge>
                        <Badge variant={policy.isActive ? "default" : "secondary"}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Retain for {policy.retentionDays} days, archive after{" "}
                        {policy.archiveAfterDays} days
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
      </div>
    </div>
  );
}
