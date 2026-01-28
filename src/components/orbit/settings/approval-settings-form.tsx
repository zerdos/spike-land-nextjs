/**
 * Approval Settings Form
 *
 * Form for configuring Relay approval workflow settings.
 * Resolves #872
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ApproverRole, RelayApprovalSettings } from "@/lib/relay";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Shield, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ApprovalSettingsFormProps {
  workspaceSlug: string;
}

const APPROVER_ROLE_OPTIONS: { value: ApproverRole; label: string; }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
];

async function fetchApprovalSettings(
  workspaceSlug: string,
): Promise<RelayApprovalSettings> {
  const res = await fetch(`/api/orbit/${workspaceSlug}/relay/settings`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Failed to fetch settings");
  }

  const data = await res.json();
  return data.settings;
}

async function updateApprovalSettings(
  workspaceSlug: string,
  updates: Partial<RelayApprovalSettings>,
): Promise<RelayApprovalSettings> {
  const res = await fetch(`/api/orbit/${workspaceSlug}/relay/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Failed to update settings");
  }

  const data = await res.json();
  return data.settings;
}

export function ApprovalSettingsForm({ workspaceSlug }: ApprovalSettingsFormProps) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["approvalSettings", workspaceSlug],
    queryFn: () => fetchApprovalSettings(workspaceSlug),
    enabled: !!workspaceSlug,
  });

  const [localSettings, setLocalSettings] = useState<RelayApprovalSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (updates: Partial<RelayApprovalSettings>) =>
      updateApprovalSettings(workspaceSlug, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(["approvalSettings", workspaceSlug], data);
      setLocalSettings(data);
    },
  });

  const handleToggleRequireApproval = useCallback((checked: boolean) => {
    setLocalSettings((prev) => (prev ? { ...prev, requireApproval: checked } : null));
  }, []);

  const handleToggleAutoApprove = useCallback((checked: boolean) => {
    setLocalSettings((prev) => prev ? { ...prev, autoApproveHighConfidence: checked } : null);
  }, []);

  const handleToggleNotifyApprovers = useCallback((checked: boolean) => {
    setLocalSettings((prev) => (prev ? { ...prev, notifyApprovers: checked } : null));
  }, []);

  const handleThresholdChange = useCallback((value: number[]) => {
    setLocalSettings((prev) => prev ? { ...prev, autoApproveThreshold: value[0] ?? 0.95 } : null);
  }, []);

  const handleEscalationTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const numValue = value === "" ? null : parseInt(value, 10);
      setLocalSettings((prev) => prev ? { ...prev, escalationTimeoutHours: numValue } : null);
    },
    [],
  );

  const handleApproverRoleToggle = useCallback((role: ApproverRole, checked: boolean) => {
    setLocalSettings((prev) => {
      if (!prev) return null;
      const newRoles = checked
        ? [...prev.approverRoles, role]
        : prev.approverRoles.filter((r) => r !== role);
      return { ...prev, approverRoles: newRoles };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!localSettings) return;
    mutation.mutate(localSettings);
  }, [localSettings, mutation]);

  const hasChanges = localSettings && settings &&
    JSON.stringify(localSettings) !== JSON.stringify(settings);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        data-testid="approval-settings-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approval-settings-error">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load settings"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!localSettings) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="approval-settings-form">
      {/* Approval Requirement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Approval Requirement
          </CardTitle>
          <CardDescription>
            Configure whether drafts require approval before publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-approval">Require Approval</Label>
              <p className="text-sm text-muted-foreground">
                Drafts must be approved before they can be sent
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={localSettings.requireApproval}
              onCheckedChange={handleToggleRequireApproval}
              disabled={mutation.isPending}
              data-testid="require-approval-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Approver Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Approver Roles
          </CardTitle>
          <CardDescription>
            Select which roles can approve drafts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {APPROVER_ROLE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`approver-role-${option.value}`}
                checked={localSettings.approverRoles.includes(option.value)}
                onCheckedChange={(checked) =>
                  handleApproverRoleToggle(option.value, checked === true)}
                disabled={mutation.isPending}
                data-testid={`approver-role-${option.value.toLowerCase()}`}
              />
              <Label htmlFor={`approver-role-${option.value}`}>{option.label}</Label>
            </div>
          ))}
          {localSettings.approverRoles.length === 0 && (
            <p className="text-sm text-amber-600">
              Warning: No approver roles selected. Only workspace owners will be able to approve.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto-Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Auto-Approval
          </CardTitle>
          <CardDescription>
            Automatically approve high-confidence drafts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-approve">Auto-approve High Confidence</Label>
              <p className="text-sm text-muted-foreground">
                Skip manual approval for drafts above the confidence threshold
              </p>
            </div>
            <Switch
              id="auto-approve"
              checked={localSettings.autoApproveHighConfidence}
              onCheckedChange={handleToggleAutoApprove}
              disabled={mutation.isPending || !localSettings.requireApproval}
              data-testid="auto-approve-switch"
            />
          </div>

          {localSettings.autoApproveHighConfidence && localSettings.requireApproval && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Confidence Threshold</Label>
                <span className="text-sm font-medium">
                  {Math.round(localSettings.autoApproveThreshold * 100)}%
                </span>
              </div>
              <Slider
                value={[localSettings.autoApproveThreshold]}
                onValueChange={handleThresholdChange}
                min={0.5}
                max={1}
                step={0.05}
                disabled={mutation.isPending}
                data-testid="confidence-threshold-slider"
              />
              <p className="text-xs text-muted-foreground">
                Drafts with confidence scores at or above this threshold will be automatically
                approved.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-approvers">Notify Approvers</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications when new drafts need approval
              </p>
            </div>
            <Switch
              id="notify-approvers"
              checked={localSettings.notifyApprovers}
              onCheckedChange={handleToggleNotifyApprovers}
              disabled={mutation.isPending || !localSettings.requireApproval}
              data-testid="notify-approvers-switch"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalation-timeout">Escalation Timeout (hours)</Label>
            <Input
              id="escalation-timeout"
              type="number"
              min={0}
              value={localSettings.escalationTimeoutHours ?? ""}
              onChange={handleEscalationTimeoutChange}
              placeholder="Leave empty to disable"
              disabled={mutation.isPending || !localSettings.requireApproval}
              data-testid="escalation-timeout-input"
            />
            <p className="text-xs text-muted-foreground">
              Time before unreviewed drafts are escalated. Leave empty to disable escalation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={mutation.isPending || !hasChanges}
          data-testid="save-approval-settings"
        >
          {mutation.isPending
            ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            )
            : (
              "Save Changes"
            )}
        </Button>

        {mutation.isSuccess && !hasChanges && (
          <p className="text-sm text-green-600" data-testid="save-success-message">
            Settings saved successfully!
          </p>
        )}

        {mutation.error && (
          <p className="text-sm text-red-500" data-testid="save-error-message">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to save settings"}
          </p>
        )}
      </div>
    </div>
  );
}
