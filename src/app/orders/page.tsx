import { auth } from "@/auth";
import { OrderStatusBadge } from "@/components/merch/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { ChevronRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Orders | Spike Land",
  description: "View your order history",
};

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

async function getOrders(userId: string) {
  const orders = await prisma.merchOrder.findMany({
    where: { userId },
    include: {
      items: {
        take: 3, // Only first 3 items for preview
        include: {
          product: true,
        },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    itemCount: order._count.items,
    previewItems: order.items.map((item) => ({
      id: item.id,
      name: item.productName,
      imageUrl: item.imageUrl,
    })),
  }));
}

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/orders");
  }

  const orders = await getOrders(session.user.id);

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
    });
  };

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader>
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
            <CardTitle>No orders yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Browse our merch collection and place your first order!
            </p>
            <Button asChild>
              <Link href="/merch">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card
              data-testid="order-card"
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        data-testid="order-number"
                        className="font-mono text-sm"
                      >
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span data-testid="order-date">
                        {formatDate(order.createdAt)}
                      </span>
                      <span>
                        {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                      </span>
                      <span
                        data-testid="order-total"
                        className="font-semibold text-foreground"
                      >
                        {formatPrice(order.totalAmount, order.currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {order.previewItems.map((item) => (
                        <div
                          key={item.id}
                          data-testid="order-preview-image"
                          className="relative w-10 h-10 rounded bg-muted overflow-hidden"
                        >
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          )}
                        </div>
                      ))}
                      {order.itemCount > 3 && (
                        <span className="text-sm text-muted-foreground">
                          +{order.itemCount - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
