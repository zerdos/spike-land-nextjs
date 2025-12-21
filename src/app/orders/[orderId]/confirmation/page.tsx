import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { ArrowRight, CheckCircle, Mail, Package } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ orderId: string; }>;
}

async function getOrder(orderId: string, userId: string) {
  const order = await prisma.merchOrder.findUnique({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    customerEmail: order.customerEmail,
    itemCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
  };
}

export default async function OrderConfirmationPage({
  params,
}: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orderId } = await params;
  const order = await getOrder(orderId, session.user.id);

  if (!order) {
    notFound();
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: order.currency,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We are processing it now.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <p className="text-muted-foreground">Order Number</p>
                <p className="font-mono font-medium">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
              </div>
              <div className="text-left">
                <p className="text-muted-foreground">Items</p>
                <p>{order.itemCount} product{order.itemCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Status</p>
                <p className="capitalize">
                  {order.status.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <Mail className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Confirmation Email</h3>
              <p className="text-sm text-muted-foreground">
                We have sent a confirmation to{" "}
                <span className="font-medium">{order.customerEmail}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Package className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Production & Shipping</h3>
              <p className="text-sm text-muted-foreground">
                Your order will be printed and shipped within 5-7 business days
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href={`/orders/${order.id}`}>
              View Order Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/merch">Continue Shopping</Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Questions about your order?{" "}
          <a
            href="mailto:support@spike.land"
            className="text-primary hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
