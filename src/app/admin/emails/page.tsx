/**
 * Email Logs Admin Page
 *
 * View all sent emails, search, filter, and send test emails.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  resendId: string | null;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  SENT: "bg-blue-500/10 text-blue-500",
  DELIVERED: "bg-green-500/10 text-green-500",
  OPENED: "bg-cyan-500/10 text-cyan-500",
  CLICKED: "bg-purple-500/10 text-purple-500",
  BOUNCED: "bg-red-500/10 text-red-500",
  FAILED: "bg-red-500/10 text-red-500",
};

export default function EmailLogsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [template, setTemplate] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const fetchEmails = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (template && template !== "all") params.set("template", template);

      const response = await fetch(`/api/admin/emails?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch emails");

      const data = await response.json();
      setEmails(data.emails);
      setPagination(data.pagination);
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, status, template]);

  useEffect(() => {
    fetchEmails(1);
  }, [fetchEmails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails(1);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      alert("Please enter an email address");
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendTestEmail",
          to: testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email");
      }

      alert(`Test email sent successfully! ID: ${data.emailId}`);
      setTestEmail("");
      fetchEmails(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Logs</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            View and search all sent emails
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">
            Total: {pagination.total} emails
          </p>
        </div>
      </div>

      {/* Send Test Email Card */}
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Send Test Email</h2>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={handleSendTestEmail}
            disabled={sendingTest || !testEmail}
          >
            {sendingTest ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <Input
            type="text"
            placeholder="Search by email or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="OPENED">Opened</SelectItem>
              <SelectItem value="CLICKED">Clicked</SelectItem>
              <SelectItem value="BOUNCED">Bounced</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {(search || status !== "all" || template !== "all") && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setTemplate("all");
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10 p-4">
          <p className="text-red-500">{error}</p>
        </Card>
      )}

      {/* Email Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">To</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Template
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Sent At
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      Loading...
                    </td>
                  </tr>
                )
                : emails.length === 0
                ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No emails found
                    </td>
                  </tr>
                )
                : (
                  emails.map((email) => (
                    <tr
                      key={email.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate text-sm">
                          {email.to}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate text-sm">
                          {email.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {email.template}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[email.status] || ""}>
                          {email.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {formatDate(email.sentAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmail(email)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-neutral-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchEmails(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchEmails(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Email Details Modal */}
      {selectedEmail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedEmail(null)}
        >
          <Card
            className="max-h-[80vh] w-full max-w-lg overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Email Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmail(null)}
              >
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  To
                </label>
                <p>{selectedEmail.to}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  Subject
                </label>
                <p>{selectedEmail.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  Template
                </label>
                <div>
                  <Badge variant="outline">{selectedEmail.template}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  Status
                </label>
                <div>
                  <Badge className={STATUS_COLORS[selectedEmail.status] || ""}>
                    {selectedEmail.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  Resend ID
                </label>
                <p className="font-mono text-sm">
                  {selectedEmail.resendId || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">
                  User
                </label>
                <p>
                  {selectedEmail.user.name || selectedEmail.user.email ||
                    selectedEmail.user.id}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Sent At
                  </label>
                  <p className="text-sm">{formatDate(selectedEmail.sentAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Opened At
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedEmail.openedAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Clicked At
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedEmail.clickedAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500">
                    Bounced At
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedEmail.bouncedAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
