import { auth } from "@/auth";
import { OrderStatusBadge } from "@/components/merch/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { ChevronLeft, ExternalLink, Package, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ orderId: string; }>;
}

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

async function getOrder(orderId: string, userId: string) {
  const order = await prisma.merchOrder.findUnique({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      shipments: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() || null,
    shippingAddress: order.shippingAddress as {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      countryCode: string;
    },
    customerEmail: order.customerEmail,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      customText: item.customText,
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
      shippedAt: shipment.shippedAt?.toISOString() || null,
      deliveredAt: shipment.deliveredAt?.toISOString() || null,
    })),
    events: order.events.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/orders");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCountryName = (code: string) => {
    const countries: Record<string, string> = {
      GB: "United Kingdom",
      DE: "Germany",
      FR: "France",
      ES: "Spain",
      IT: "Italy",
      NL: "Netherlands",
      BE: "Belgium",
      AT: "Austria",
      PL: "Poland",
      SE: "Sweden",
      DK: "Denmark",
      FI: "Finland",
      IE: "Ireland",
      PT: "Portugal",
      CZ: "Czech Republic",
      GR: "Greece",
      HU: "Hungary",
      RO: "Romania",
      BG: "Bulgaria",
      SK: "Slovakia",
      SI: "Slovenia",
      HR: "Croatia",
      LT: "Lithuania",
      LV: "Latvia",
      EE: "Estonia",
      CY: "Cyprus",
      LU: "Luxembourg",
      MT: "Malta",
    };
    return countries[code] || code;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.imageUrl
                        ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        )
                        : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-xl">🖼️</span>
                          </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{item.productName}</h4>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      {item.customText && (
                        <p className="text-sm text-muted-foreground">
                          Custom: {item.customText}
                        </p>
                      )}
                      <p className="text-sm mt-1">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipments */}
          {order.shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {shipment.carrier || "Carrier TBD"}
                          </p>
                          {shipment.trackingNumber && (
                            <p className="text-sm text-muted-foreground">
                              Tracking: {shipment.trackingNumber}
                            </p>
                          )}
                          {shipment.shippedAt && (
                            <p className="text-sm text-muted-foreground">
                              Shipped: {formatDate(shipment.shippedAt)}
                            </p>
                          )}
                          {shipment.deliveredAt && (
                            <p className="text-sm text-green-600">
                              Delivered: {formatDate(shipment.deliveredAt)}
                            </p>
                          )}
                        </div>
                        {shipment.trackingUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Track
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {order.shippingCost === 0 ? <span className="text-green-600">FREE</span> : (
                    formatPrice(order.shippingCost)
                  )}
                </span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <address className="not-italic text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                </p>
                <p>{getCountryName(order.shippingAddress.countryCode)}</p>
              </address>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Contact us at{" "}
                <a
                  href="mailto:support@spike.land"
                  className="text-primary hover:underline"
                >
                  support@spike.land
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Include your order number: {order.orderNumber}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
