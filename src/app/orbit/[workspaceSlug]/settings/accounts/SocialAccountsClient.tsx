/**
 * Social Accounts Client Component
 *
 * Displays connected social accounts and provides connect/disconnect functionality.
 */

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SocialAccountStatus, SocialPlatform } from "@prisma/client";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  RefreshCw,
  Twitter,
  Unlink,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  status: SocialAccountStatus;
  connectedAt: string;
  metadata: Record<string, unknown> | null;
  health: {
    healthScore: number;
    status: string;
    lastSuccessfulSync: string | null;
    isRateLimited: boolean;
    tokenRefreshRequired: boolean;
  } | null;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface SocialAccountsClientProps {
  workspaceSlug: string;
  workspaceId: string;
}

const PLATFORM_CONFIG: Record<
  SocialPlatform,
  {
    name: string;
    icon: React.ComponentType<{ className?: string; }>;
    color: string;
    bgColor: string;
    connectPath: string;
  }
> = {
  TWITTER: {
    name: "Twitter / X",
    icon: Twitter,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    connectPath: "/api/social/twitter/connect",
  },
  FACEBOOK: {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    connectPath: "/api/social/facebook/connect",
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    connectPath: "/api/social/facebook/connect", // Instagram uses Facebook OAuth
  },
  LINKEDIN: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-700",
    bgColor: "bg-blue-700/10",
    connectPath: "/api/social/linkedin/connect",
  },
  YOUTUBE: {
    name: "YouTube",
    icon: Youtube,
    color: "text-red-600",
    bgColor: "bg-red-600/10",
    connectPath: "/api/social/youtube/connect",
  },
  TIKTOK: {
    name: "TikTok",
    icon: () => <span className="text-lg">🎵</span>,
    color: "text-black dark:text-white",
    bgColor: "bg-black/10 dark:bg-white/10",
    connectPath: "", // Not implemented yet
  },
  DISCORD: {
    name: "Discord",
    icon: () => <span className="text-lg">💬</span>,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    connectPath: "", // Not implemented yet
  },
  PINTEREST: {
    name: "Pinterest",
    icon: () => <span className="text-lg">📌</span>,
    color: "text-red-600",
    bgColor: "bg-red-600/10",
    connectPath: "/api/social/pinterest/connect",
  },
};

const STATUS_CONFIG: Record<
  SocialAccountStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; }
> = {
  ACTIVE: { label: "Active", variant: "default" },
  EXPIRED: { label: "Token Expired", variant: "destructive" },
  ERROR: { label: "Error", variant: "destructive" },
  RATE_LIMITED: { label: "Rate Limited", variant: "secondary" },
  RESTRICTED: { label: "Restricted", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  DISCONNECTED: { label: "Disconnected", variant: "outline" },
};

export function SocialAccountsClient({
  workspaceSlug,
  workspaceId,
}: SocialAccountsClientProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccount | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orbit/${workspaceSlug}/accounts`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch accounts");
      }

      setAccounts(data.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = useCallback(
    (platform: SocialPlatform) => {
      const config = PLATFORM_CONFIG[platform];
      if (!config.connectPath) {
        return; // Platform not implemented
      }

      // Redirect to OAuth flow with both workspaceId and workspaceSlug
      window.location.href = `${config.connectPath}?workspaceId=${workspaceId}&workspaceSlug=${
        encodeURIComponent(workspaceSlug)
      }`;
    },
    [workspaceId, workspaceSlug],
  );

  const handleDisconnect = useCallback(async () => {
    if (!accountToDisconnect) return;

    setDisconnecting(accountToDisconnect.id);

    try {
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/accounts?accountId=${accountToDisconnect.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect account");
      }

      // Refresh accounts list
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(null);
      setAccountToDisconnect(null);
    }
  }, [accountToDisconnect, workspaceSlug, fetchAccounts]);

  const activeAccounts = accounts.filter((a) => a.status !== "DISCONNECTED");
  const connectedPlatforms = new Set(activeAccounts.map((a) => a.platform));

  // Platforms available to connect (not yet connected or implemented)
  const availablePlatforms = (
    Object.keys(PLATFORM_CONFIG) as SocialPlatform[]
  ).filter(
    (platform) => !connectedPlatforms.has(platform) && PLATFORM_CONFIG[platform].connectPath,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Social media accounts linked to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAccounts.length === 0
            ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No social accounts connected yet.</p>
                <p className="text-sm mt-1">
                  Connect your accounts below to start managing your social presence.
                </p>
              </div>
            )
            : (
              <div className="space-y-3">
                {activeAccounts.map((account) => {
                  const config = PLATFORM_CONFIG[account.platform];
                  const statusConfig = STATUS_CONFIG[account.status];
                  const Icon = config.icon;

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2 ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.accountName}</span>
                            <Badge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{config.name}</span>
                            {account.health && (
                              <>
                                <span className="flex items-center gap-1">
                                  {account.health.healthScore >= 80
                                    ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    : account.health.healthScore >= 50
                                    ? <Clock className="h-3 w-3 text-yellow-500" />
                                    : <AlertCircle className="h-3 w-3 text-red-500" />}
                                  {account.health.healthScore}% health
                                </span>
                                {account.health.tokenRefreshRequired && (
                                  <span className="flex items-center gap-1 text-yellow-600">
                                    <RefreshCw className="h-3 w-3" />
                                    Needs reconnection
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.health?.tokenRefreshRequired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(account.platform)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reconnect
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAccountToDisconnect(account)}
                          disabled={disconnecting === account.id}
                        >
                          {disconnecting === account.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Unlink className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Connect New Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
          <CardDescription>
            Link additional social media platforms to your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availablePlatforms.map((platform) => {
              const config = PLATFORM_CONFIG[platform];
              const Icon = config.icon;

              return (
                <Button
                  key={platform}
                  variant="outline"
                  className="h-auto justify-start gap-3 p-4"
                  onClick={() => handleConnect(platform)}
                >
                  <div className={`rounded-lg p-2 ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Click to connect
                    </div>
                  </div>
                </Button>
              );
            })}
            {availablePlatforms.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">
                All available platforms are connected.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!accountToDisconnect}
        onOpenChange={(open) => !open && setAccountToDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{" "}
              <strong>{accountToDisconnect?.accountName}</strong>? You can reconnect it later, but
              scheduled posts and analytics for this account will be paused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
