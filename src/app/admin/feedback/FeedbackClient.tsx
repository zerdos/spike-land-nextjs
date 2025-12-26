/**
 * Admin Feedback Client Component
 *
 * Interactive component for managing user feedback with filtering,
 * status updates, and admin notes.
 */

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useState } from "react";

type FeedbackType = "BUG" | "IDEA" | "OTHER";
type FeedbackStatus = "NEW" | "REVIEWED" | "RESOLVED" | "DISMISSED";

interface FeedbackUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface FeedbackItem {
  id: string;
  userId: string | null;
  email: string | null;
  type: FeedbackType;
  message: string;
  page: string;
  userAgent: string | null;
  status: FeedbackStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: FeedbackUser | null;
}

interface FeedbackClientProps {
  initialFeedback: FeedbackItem[];
}

const TYPE_COLORS: Record<FeedbackType, string> = {
  BUG: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  IDEA: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  NEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  REVIEWED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DISMISSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
}

function getUserInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }
  if (email && email[0]) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function FeedbackClient({ initialFeedback }: FeedbackClientProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "ALL">(
    "ALL",
  );
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null,
  );
  const [adminNote, setAdminNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const response = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch feedback");

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  const handleStatusChange = async (id: string, newStatus: FeedbackStatus) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Update local state
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: newStatus, updatedAt: new Date().toISOString() }
            : f
        )
      );

      // Update selected feedback if open
      if (selectedFeedback?.id === id) {
        setSelectedFeedback((prev) =>
          prev
            ? {
              ...prev,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
            : null
        );
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedFeedback) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedFeedback.id, adminNote }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save note");
      }

      // Update local state
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === selectedFeedback.id
            ? { ...f, adminNote, updatedAt: new Date().toISOString() }
            : f
        )
      );

      setSelectedFeedback((prev) =>
        prev
          ? { ...prev, adminNote, updatedAt: new Date().toISOString() }
          : null
      );

      alert("Note saved successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save note");
    } finally {
      setIsUpdating(false);
    }
  };

  const openFeedbackDetails = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setAdminNote(item.adminNote || "");
  };

  const closeFeedbackDetails = () => {
    setSelectedFeedback(null);
    setAdminNote("");
  };

  // Filter feedback based on current filters
  const filteredFeedback = feedback.filter((f) => {
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && f.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Feedback Management</h1>
        <p className="mt-2 text-muted-foreground">
          Review and manage user feedback, bug reports, and ideas
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as FeedbackStatus | "ALL")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as FeedbackType | "ALL")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
                <SelectItem value="IDEA">Idea</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={fetchFeedback} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </Card>

      {/* Feedback Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted p-4">
          <h2 className="font-semibold">
            Feedback ({filteredFeedback.length})
          </h2>
        </div>

        {loading
          ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          )
          : filteredFeedback.length === 0
          ? (
            <div className="p-8 text-center text-muted-foreground">
              No feedback found
            </div>
          )
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Page
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFeedback.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => openFeedbackDetails(item)}
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={TYPE_COLORS[item.type]}>
                          {item.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={item.user?.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(
                                item.user?.name || null,
                                item.email,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {item.user?.name || item.user?.email ||
                              item.email || "Anonymous"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[150px] truncate">
                        {item.page}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[item.status]}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[250px]">
                        {truncateMessage(item.message)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(item.id, "REVIEWED")}
                            disabled={isUpdating || item.status === "REVIEWED"}
                            title="Mark as Reviewed"
                          >
                            R
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(item.id, "RESOLVED")}
                            disabled={isUpdating || item.status === "RESOLVED"}
                            className="text-green-600"
                            title="Mark as Resolved"
                          >
                            V
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(item.id, "DISMISSED")}
                            disabled={isUpdating || item.status === "DISMISSED"}
                            className="text-gray-500"
                            title="Dismiss"
                          >
                            X
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Feedback Details Dialog */}
      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => !open && closeFeedbackDetails()}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              View full message and manage feedback status
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Type
                  </span>
                  <div className="mt-1">
                    <Badge className={TYPE_COLORS[selectedFeedback.type]}>
                      {selectedFeedback.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Status
                  </span>
                  <div className="mt-1">
                    <Select
                      value={selectedFeedback.status}
                      onValueChange={(value) =>
                        handleStatusChange(
                          selectedFeedback.id,
                          value as FeedbackStatus,
                        )}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="REVIEWED">Reviewed</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="DISMISSED">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    User
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={selectedFeedback.user?.image || undefined}
                      />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(
                          selectedFeedback.user?.name || null,
                          selectedFeedback.email,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {selectedFeedback.user?.name ||
                        selectedFeedback.user?.email ||
                        selectedFeedback.email ||
                        "Anonymous"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Page
                  </span>
                  <p className="mt-1 text-sm break-all">
                    {selectedFeedback.page}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Submitted
                  </span>
                  <p className="mt-1 text-sm">
                    {formatDate(selectedFeedback.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </span>
                  <p className="mt-1 text-sm">
                    {formatDate(selectedFeedback.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Message
                </span>
                <div className="mt-2 rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </p>
                </div>
              </div>

              {/* User Agent (for bugs) */}
              {selectedFeedback.userAgent && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Browser Info
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground break-all">
                    {selectedFeedback.userAgent}
                  </p>
                </div>
              )}

              {/* Admin Note */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Admin Note
                </span>
                <Textarea
                  className="mt-2 min-h-[100px]"
                  placeholder="Add a note about this feedback..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeFeedbackDetails}>
              Close
            </Button>
            <Button onClick={handleSaveNote} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
