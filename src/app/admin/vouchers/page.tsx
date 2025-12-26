/**
 * Voucher Management Page
 *
 * Create, view, and manage promotional vouchers.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface Voucher {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  redemptions: number;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    type: "FIXED_TOKENS",
    value: "",
    maxUses: "",
    expiresAt: "",
  });

  const fetchVouchers = async () => {
    try {
      const response = await fetch("/api/admin/vouchers");
      if (!response.ok) throw new Error("Failed to fetch vouchers");
      const data = await response.json();
      setVouchers(data.vouchers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          value: parseInt(formData.value),
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create voucher");
      }

      // Reset form and refresh list
      setFormData({
        code: "",
        type: "FIXED_TOKENS",
        value: "",
        maxUses: "",
        expiresAt: "",
      });
      setShowForm(false);
      await fetchVouchers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create voucher");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const response = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update voucher");

      await fetchVouchers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update voucher");
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return;

    try {
      const response = await fetch(`/api/admin/vouchers?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete voucher");

      await fetchVouchers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete voucher");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Voucher Management</h1>
        <Card className="h-64 animate-pulse bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voucher Management</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Create and manage promotional vouchers
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Voucher"}
        </Button>
      </div>

      {error && (
        <Card className="p-6">
          <p className="text-red-500">Error: {error}</p>
        </Card>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PROMO2025"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              >
                <option value="FIXED_TOKENS">Fixed Tokens</option>
                <option value="PERCENTAGE_BONUS">Percentage Bonus</option>
                <option value="SUBSCRIPTION_TRIAL">Subscription Trial</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Value</label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Max Uses (optional)
                </label>
                <Input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Expires At (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit">Create Voucher</Button>
          </form>
        </Card>
      )}

      {/* Vouchers List */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Value</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Uses</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td className="px-6 py-4 font-mono text-sm font-semibold">
                  {voucher.code}
                </td>
                <td className="px-6 py-4 text-sm">{voucher.type}</td>
                <td className="px-6 py-4 text-sm">{voucher.value}</td>
                <td className="px-6 py-4 text-sm">
                  {voucher.currentUses}
                  {voucher.maxUses && ` / ${voucher.maxUses}`}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={voucher.status === "ACTIVE"
                      ? "default"
                      : "secondary"}
                  >
                    {voucher.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm">
                  {voucher.expiresAt
                    ? new Date(voucher.expiresAt).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(voucher.id, voucher.status)}
                    >
                      {voucher.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteVoucher(voucher.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {vouchers.length === 0 && (
          <div className="py-12 text-center text-neutral-500">
            No vouchers created yet
          </div>
        )}
      </Card>
    </div>
  );
}
