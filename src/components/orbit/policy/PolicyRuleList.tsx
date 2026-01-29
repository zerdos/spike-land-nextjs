/**
 * Policy Rule List
 *
 * Component for managing policy rules with filtering, creation, and editing.
 * Displays all workspace and global rules with their status and configuration.
 *
 * Resolves #522 (ORB-065): Build Policy Checker UI
 */

"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { PolicyCategory, PolicyRule, PolicySeverity, SocialPlatform } from "@prisma/client";

interface PolicyRuleListProps {
  workspaceSlug: string;
}

type FilterOptions = {
  platform?: SocialPlatform | "ALL";
  category?: PolicyCategory | "ALL";
  severity?: PolicySeverity | "ALL";
  showInactive?: boolean;
};

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  CONTENT_GUIDELINES: "Content Guidelines",
  AD_COMPLIANCE: "Ad Compliance",
  CHARACTER_LIMITS: "Character Limits",
  PROHIBITED_CONTENT: "Prohibited Content",
  CLAIMS_RESTRICTIONS: "Claims Restrictions",
  BRAND_SAFETY: "Brand Safety",
  ACCESSIBILITY: "Accessibility",
  HASHTAG_RULES: "Hashtag Rules",
  LINK_POLICIES: "Link Policies",
  MEDIA_REQUIREMENTS: "Media Requirements",
};

const SEVERITY_COLORS = {
  CRITICAL: "destructive",
  ERROR: "destructive",
  WARNING: "warning",
  INFO: "default",
} as const;

export function PolicyRuleList({ workspaceSlug }: PolicyRuleListProps) {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<PolicyRule | null>(null);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.platform && filters.platform !== "ALL") {
        params.set("platform", filters.platform);
      }
      if (filters.category && filters.category !== "ALL") {
        params.set("category", filters.category);
      }
      if (filters.severity && filters.severity !== "ALL") {
        params.set("severity", filters.severity);
      }
      if (filters.showInactive) {
        params.set("includeInactive", "true");
      }

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/rules?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch policy rules");
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
      toast.error("Failed to load policy rules");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, filters]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleActive = async (rule: PolicyRule) => {
    if (!rule.workspaceId) {
      toast.error("Cannot modify global rules");
      return;
    }

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/rules/${rule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !rule.isActive }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update rule");
      }

      toast.success(`Rule ${rule.isActive ? "deactivated" : "activated"}`);
      fetchRules();
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      toast.error("Failed to update rule");
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete || !ruleToDelete.workspaceId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/policy/rules/${ruleToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }

      toast.success("Rule deleted successfully");
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (!filters.showInactive && !rule.isActive) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Policy Rules</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={filters.platform || "ALL"}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, platform: value as SocialPlatform | "ALL" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Platforms</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="TWITTER">Twitter</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category || "ALL"}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, category: value as PolicyCategory | "ALL" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={filters.severity || "ALL"}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, severity: value as PolicySeverity | "ALL" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Show Inactive</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={filters.showInactive || false}
                  onCheckedChange={(checked) =>
                    setFilters((f) => ({ ...f, showInactive: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading
          ? <p className="text-center text-muted-foreground py-8">Loading rules...</p>
          : filteredRules.length === 0
          ? <p className="text-center text-muted-foreground py-8">No rules found</p>
          : (
            filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggleActive={handleToggleActive}
                onDelete={(r) => {
                  setRuleToDelete(r);
                  setDeleteDialogOpen(true);
                }}
              />
            ))
          )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{ruleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRuleToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RuleCardProps {
  rule: PolicyRule;
  onToggleActive: (rule: PolicyRule) => void;
  onDelete: (rule: PolicyRule) => void;
}

function RuleCard({ rule, onToggleActive, onDelete }: RuleCardProps) {
  const isGlobal = !rule.workspaceId;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{rule.name}</h3>
              {isGlobal && <Badge variant="secondary">Global</Badge>}
              <Badge variant={SEVERITY_COLORS[rule.severity]}>
                {rule.severity}
              </Badge>
              <Badge variant="outline">
                {CATEGORY_LABELS[rule.category]}
              </Badge>
              {rule.platform && <Badge variant="outline">{rule.platform}</Badge>}
              {rule.isBlocking && <Badge variant="destructive">Blocking</Badge>}
            </div>

            <p className="text-sm text-muted-foreground">{rule.description}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Type: {rule.ruleType}</span>
              {rule.sourceUrl && (
                <a
                  href={rule.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Source
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Switch
              checked={rule.isActive}
              onCheckedChange={() => onToggleActive(rule)}
              disabled={isGlobal}
            />
            {!isGlobal && (
              <>
                <Button size="icon" variant="ghost">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(rule)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
