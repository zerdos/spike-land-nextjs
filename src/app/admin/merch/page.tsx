/**
 * Admin Merch Dashboard
 *
 * Overview of merchandise orders, products, and revenue.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";

async function getMerchMetrics() {
  const [
    totalOrders,
    pendingOrders,
    inProductionOrders,
    shippedOrders,
    deliveredOrders,
    totalProducts,
    activeProducts,
    totalRevenue,
    recentOrders,
  ] = await Promise.all([
    prisma.merchOrder.count(),
    prisma.merchOrder.count({ where: { status: "PENDING" } }),
    prisma.merchOrder.count({ where: { status: "IN_PRODUCTION" } }),
    prisma.merchOrder.count({ where: { status: "SHIPPED" } }),
    prisma.merchOrder.count({ where: { status: "DELIVERED" } }),
    prisma.merchProduct.count(),
    prisma.merchProduct.count({ where: { isActive: true } }),
    prisma.merchOrder.aggregate({
      where: {
        status: {
          in: ["PAID", "SUBMITTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED"],
        },
      },
      _sum: { totalAmount: true },
    }),
    prisma.merchOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    inProductionOrders,
    shippedOrders,
    deliveredOrders,
    totalProducts,
    activeProducts,
    totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      customerName: order.user.name || order.user.email || "Unknown",
      itemCount: order._count.items,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

export default async function AdminMerchPage() {
  const metrics = await getMerchMetrics();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "text-yellow-600 bg-yellow-50",
      PAYMENT_PENDING: "text-yellow-600 bg-yellow-50",
      PAID: "text-green-600 bg-green-50",
      SUBMITTED: "text-blue-600 bg-blue-50",
      IN_PRODUCTION: "text-blue-600 bg-blue-50",
      SHIPPED: "text-purple-600 bg-purple-50",
      DELIVERED: "text-green-600 bg-green-50",
      CANCELLED: "text-red-600 bg-red-50",
      REFUNDED: "text-gray-600 bg-gray-50",
    };
    return colors[status] || "text-gray-600 bg-gray-50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Merch Dashboard</h1>
          <p className="text-muted-foreground">
            Manage products, orders, and track revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/merch/products">Manage Products</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/merch/orders">View All Orders</Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.pendingOrders + metrics.inProductionOrders + metrics.shippedOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingOrders} pending, {metrics.inProductionOrders} in production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProducts} total ({metrics.totalProducts - metrics.activeProducts}{" "}
              inactive)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.shippedOrders} currently shipping
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentOrders.length === 0
            ? (
              <p className="text-muted-foreground text-center py-8">
                No orders yet
              </p>
            )
            : (
              <div className="space-y-4">
                {metrics.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/merch/orders/${order.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{order.orderNumber}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            getStatusColor(order.status)
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.customerName} • {order.itemCount}{" "}
                        item{order.itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
