/**
 * Admin Merch Orders List
 *
 * View and manage all merchandise orders with filtering.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

const ORDERS_PER_PAGE = 20;

type OrderStatus =
  | "PENDING"
  | "PAYMENT_PENDING"
  | "PAID"
  | "SUBMITTED"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

const STATUS_OPTIONS: { value: string; label: string; }[] = [
  { value: "", label: "All Orders" },
  { value: "PENDING", label: "Pending" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PAID", label: "Paid" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

async function getOrders(status: string | undefined, page: number) {
  const where = status ? { status: status as OrderStatus } : {};

  const [orders, totalCount] = await Promise.all([
    prisma.merchOrder.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
    }),
    prisma.merchOrder.count({ where }),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      customerName: order.user.name || "N/A",
      customerEmail: order.user.email,
      itemCount: order._count.items,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() || null,
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / ORDERS_PER_PAGE),
  };
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const { orders, totalCount, totalPages } = await getOrders(status, page);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusVariant = (orderStatus: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "outline",
      PAYMENT_PENDING: "outline",
      PAID: "secondary",
      SUBMITTED: "secondary",
      IN_PRODUCTION: "default",
      SHIPPED: "default",
      DELIVERED: "default",
      CANCELLED: "destructive",
      REFUNDED: "outline",
    };
    return variants[orderStatus] || "outline";
  };

  const buildUrl = (newStatus?: string, newPage?: number) => {
    const params = new URLSearchParams();
    if (newStatus) params.set("status", newStatus);
    if (newPage && newPage > 1) params.set("page", String(newPage));
    const query = params.toString();
    return `/admin/merch/orders${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {totalCount} order{totalCount !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/merch">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={buildUrl(option.value || undefined, 1)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (status || "") === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {/* Orders table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0
            ? (
              <p className="text-muted-foreground text-center py-8">
                No orders found
              </p>
            )
            : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Order</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Items</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-4">
                          <span className="font-mono text-sm">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerEmail}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">{order.itemCount}</td>
                        <td className="py-4 font-medium">
                          {formatPrice(order.totalAmount, order.currency)}
                        </td>
                        <td className="py-4">
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-4">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/merch/orders/${order.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                >
                  <Link href={buildUrl(status, page - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                >
                  <Link href={buildUrl(status, page + 1)}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
