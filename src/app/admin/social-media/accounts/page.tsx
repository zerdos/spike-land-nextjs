"use client";

/**
 * Social Media Accounts Management Page
 *
 * Manage connected social media accounts, add new ones, and configure settings.
 */

import {
  PLATFORM_CONFIG,
  useSocialMediaData,
} from "@/components/admin/social-media/SocialMediaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";

export default function SocialMediaAccountsPage() {
  const { data } = useSocialMediaData();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your social media account connections
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Account (Coming Soon)
        </Button>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>
            {data.accounts.length} accounts connected across{" "}
            {new Set(data.accounts.map(a => a.platform)).size} platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((account) => {
                const config = PLATFORM_CONFIG[account.platform];
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${config.color}`}
                        >
                          {config.icon}
                        </div>
                        <span className="font-medium">{config.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {account.handle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.followers !== null ? account.followers.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.lastSynced
                        ? new Date(account.lastSynced).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" disabled title="Sync account">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled title="Account settings">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled title="Remove account">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Platform Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Coverage</CardTitle>
          <CardDescription>
            Overview of registered platforms and their connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
              const account = data.accounts.find((a) => a.platform === platform);
              const isConnected = !!account;

              return (
                <div
                  key={platform}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isConnected
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-muted/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{config.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? account.handle : "Not connected"}
                    </p>
                  </div>
                  {isConnected
                    ? (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Connected
                      </Badge>
                    )
                    : (
                      <Button variant="outline" size="sm" disabled>
                        Connect
                      </Button>
                    )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>API Integrations</CardTitle>
          <CardDescription>
            Status of API connections for automatic data syncing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              API integrations are coming soon. Once connected, you&apos;ll be able to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Automatically sync follower counts and engagement metrics</li>
              <li>Post content directly from this dashboard</li>
              <li>Schedule posts across multiple platforms</li>
              <li>Track mentions and respond to comments</li>
              <li>View unified analytics across all platforms</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
