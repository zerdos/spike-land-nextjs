"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, ExternalLink, Key, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface NewApiKey extends ApiKey {
  key: string; // Full key, only available at creation
}

export function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewApiKey | null>(
    null,
  );
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/api-keys");
      if (!response.ok) throw new Error("Failed to fetch API keys");
      const data = await response.json();
      setApiKeys(data.apiKeys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create API key");
      }

      const data = await response.json();
      setNewlyCreatedKey(data.apiKey);
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke API key");
      }

      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    } finally {
      setRevokingKeyId(null);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      // istanbul ignore next -- @preserve Defensive error handling for clipboard API failures
      console.error("Failed to copy to clipboard:", err);
      // istanbul ignore next
      setError("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName("");
    setNewlyCreatedKey(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastUsed = (dateString: string | null) => {
    if (!dateString) return "Never used";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for MCP server and programmatic access
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newlyCreatedKey
                ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>API Key Created</DialogTitle>
                      <DialogDescription>
                        Copy your API key now. For security, it will not be shown again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Your API Key</Label>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                            {newlyCreatedKey.key}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(newlyCreatedKey.key, "new")}
                          >
                            {copiedKeyId === "new"
                              ? <Check className="h-4 w-4 text-green-500" />
                              : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                        Make sure to copy your API key now. You will not be able to see it again!
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={closeCreateDialog}>Done</Button>
                    </DialogFooter>
                  </>
                )
                : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create New API Key</DialogTitle>
                      <DialogDescription>
                        Give your API key a name to help you remember what it is used for.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          placeholder="e.g., Claude Desktop, Development"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          maxLength={50}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateKey}
                        disabled={!newKeyName.trim() || isCreating}
                      >
                        {isCreating ? "Creating..." : "Create Key"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {apiKeys.length === 0
          ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No API Keys</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create an API key to use the MCP server or make programmatic requests.
              </p>
            </div>
          )
          : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-md">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{key.name}</span>
                        {!key.isActive && <Badge variant="secondary">Revoked</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <code className="bg-muted px-1 rounded">
                          {key.keyPrefix}
                        </code>
                        <span className="mx-2">-</span>
                        Created {formatDate(key.createdAt)}
                        <span className="mx-2">-</span>
                        {formatLastUsed(key.lastUsedAt)}
                      </div>
                    </div>
                  </div>
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeKey(key.id)}
                      disabled={revokingKeyId === key.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Using your API Keys</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Use your API key to authenticate with the MCP server or REST API:
            </p>
            <div className="space-y-1">
              <p className="font-medium text-foreground">REST API:</p>
              <code className="block p-2 bg-muted rounded text-xs">
                curl -H &quot;Authorization: Bearer sk_live_...&quot; \
                <br />
                &nbsp;&nbsp;https://spike.land/api/mcp/generate
              </code>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">MCP Server:</p>
              <code className="block p-2 bg-muted rounded text-xs">
                SPIKE_LAND_API_KEY=sk_live_... npx @spike-land/mcp-server
              </code>
            </div>
            <div className="flex items-center space-x-4 pt-2">
              <Link
                href="/apps/pixel/mcp-tools"
                className="inline-flex items-center text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Test your API keys
              </Link>
              <Link
                href="/settings/mcp-history"
                className="inline-flex items-center text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View usage history
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
