/**
 * User Management Page
 *
 * Search users, view details, manage roles, and adjust tokens.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  tokenBalance: number;
  imageCount: number;
  createdAt: string;
}

interface UserDetails extends User {
  authProviders: string[];
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  }>;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = searchTerm
        ? `/api/admin/users?search=${encodeURIComponent(searchTerm)}`
        : "/api/admin/users";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user details");

      const data = await response.json();
      setSelectedUser(data.user);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (
      !confirm(
        `Are you sure you want to change this user's role to ${newRole}?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "setRole",
          value: newRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      alert("Role updated successfully");
      await fetchUsers(search);
      if (selectedUser?.id === userId) {
        await fetchUserDetails(userId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleTokenAdjustment = async (userId: string) => {
    const amount = prompt(
      "Enter token adjustment amount (positive to add, negative to subtract):",
    );
    if (!amount) return;

    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) {
      alert("Invalid amount");
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "adjustTokens",
          value: amount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to adjust tokens");
      }

      const data = await response.json();
      alert(`Tokens adjusted successfully. New balance: ${data.newBalance}`);
      await fetchUsers(search);
      if (selectedUser?.id === userId) {
        await fetchUserDetails(userId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to adjust tokens");
    }
  };

  const handleUserDelete = async (
    userId: string,
    userName: string | null,
    userEmail: string | null,
  ) => {
    const displayName = userName || userEmail || userId;

    // Double confirmation for safety
    const firstConfirm = confirm(
      `Are you sure you want to delete user "${displayName}"?\n\nThis will permanently delete ALL their data including:\n- Albums\n- Images\n- Enhancement jobs\n- Token balance\n- Transaction history\n\nThis action cannot be undone.`,
    );

    if (!firstConfirm) return;

    const confirmInput = prompt(
      `To confirm deletion, type "DELETE" (case sensitive):`,
    );

    if (confirmInput !== "DELETE") {
      alert("Deletion cancelled - confirmation text did not match.");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      const data = await response.json();
      alert(
        `User deleted successfully.\n\nDeleted data:\n- Albums: ${data.deletedData.albums}\n- Images: ${data.deletedData.images}\n- Enhancement Jobs: ${data.deletedData.enhancementJobs}\n- Token Balance: ${data.deletedData.tokenBalance}`,
      );

      setSelectedUser(null);
      await fetchUsers(search);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="mt-2 text-muted-foreground">
          Search users, manage roles, and adjust tokens
        </p>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="flex gap-4">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchUsers(search);
              }
            }}
          />
          <Button onClick={() => fetchUsers(search)}>Search</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              fetchUsers();
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6">
          <p className="text-red-500">Error: {error}</p>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Users List */}
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted p-4">
            <h2 className="font-semibold">
              Users {loading ? "(Loading...)" : `(${users.length})`}
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {loading
              ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading...
                </div>
              )
              : users.length === 0
              ? (
                <div className="p-8 text-center text-muted-foreground">
                  No users found
                </div>
              )
              : (
                <div className="divide-y divide-border">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="cursor-pointer p-4 transition-colors hover:bg-muted"
                      onClick={() => fetchUserDetails(user.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {user.name || "No name"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Badge
                              variant={user.role === "ADMIN" ||
                                  user.role === "SUPER_ADMIN"
                                ? "default"
                                : "secondary"}
                            >
                              {user.role}
                            </Badge>
                            <Badge variant="outline">
                              {user.tokenBalance} tokens
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </Card>

        {/* User Details */}
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted p-4">
            <h2 className="font-semibold">User Details</h2>
          </div>
          <div className="p-6">
            {!selectedUser
              ? (
                <p className="text-center text-muted-foreground">
                  Select a user to view details
                </p>
              )
              : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="mb-3 font-semibold">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Name:</span> {selectedUser.name || "No name"}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {selectedUser.email}
                      </p>
                      <p>
                        <span className="font-medium">Joined:</span>{" "}
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">Auth Providers:</span>{" "}
                        {selectedUser.authProviders.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Role Management */}
                  <div>
                    <h3 className="mb-3 font-semibold">Role Management</h3>
                    <div className="flex items-center gap-2">
                      <Badge>{selectedUser.role}</Badge>
                      <select
                        className="rounded-lg border px-3 py-1 text-sm bg-background text-foreground border-input"
                        onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                        value=""
                      >
                        <option value="">Change role...</option>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </div>
                  </div>

                  {/* Token Management */}
                  <div>
                    <h3 className="mb-3 font-semibold">Token Management</h3>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Current Balance:</span>{" "}
                        {selectedUser.tokenBalance} tokens
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleTokenAdjustment(selectedUser.id)}
                      >
                        Adjust Tokens
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <h3 className="mb-3 font-semibold">Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Images Enhanced:</span>{" "}
                        {selectedUser.imageCount}
                      </p>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h3 className="mb-3 font-semibold">Recent Transactions</h3>
                    <div className="space-y-2">
                      {selectedUser.recentTransactions.length === 0
                        ? (
                          <p className="text-sm text-muted-foreground">
                            No recent transactions
                          </p>
                        )
                        : (
                          selectedUser.recentTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex justify-between rounded-lg border border-border p-2 text-sm"
                            >
                              <span>{tx.type}</span>
                              <span
                                className={tx.amount > 0
                                  ? "text-green-600"
                                  : "text-red-600"}
                              >
                                {tx.amount > 0 ? "+" : ""}
                                {tx.amount}
                              </span>
                            </div>
                          ))
                        )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t border-red-800 pt-6">
                    <h3 className="mb-3 font-semibold text-red-400">
                      Danger Zone
                    </h3>
                    <div className="rounded-lg border border-red-800 bg-red-950/20 p-4">
                      <p className="mb-3 text-sm text-red-400">
                        Permanently delete this user and all their data. This action cannot be
                        undone.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleUserDelete(
                            selectedUser.id,
                            selectedUser.name,
                            selectedUser.email,
                          )}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete User"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </Card>
      </div>
    </div>
  );
}
