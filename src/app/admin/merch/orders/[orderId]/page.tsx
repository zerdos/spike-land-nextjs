/**
 * Admin Order Detail Page
 *
 * View and manage a single merchandise order.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { ChevronLeft, CreditCard, ExternalLink, Package, Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

async function getOrder(orderId: string) {
  const order = await prisma.merchOrder.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      shipments: true,
      events: {
        orderBy: { createdAt: "desc" },
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
    stripePaymentIntentId: order.stripePaymentIntentId,
    stripePaymentStatus: order.stripePaymentStatus,
    shippingAddress: order.shippingAddress as {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      countryCode: string;
      phone?: string;
    },
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() || null,
    user: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      imageR2Key: item.imageR2Key,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      customText: item.customText,
      podOrderId: item.podOrderId,
      podStatus: item.podStatus,
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      provider: shipment.provider,
      providerShipId: shipment.providerShipId,
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
      data: event.data as Record<string, unknown> | null,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

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

  const getStatusVariant = (status: string) => {
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
    return variants[status] || "outline";
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
    };
    return countries[code] || code;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/merch/orders">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge variant={getStatusVariant(order.status)}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        {order.stripePaymentIntentId && (
          <Button asChild variant="outline">
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Stripe
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
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
                  <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
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
                      {item.podOrderId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          POD: {item.podOrderId} ({item.podStatus || "Unknown"})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.totalPrice)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        R2: {item.imageR2Key.slice(0, 20)}...
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
                  Shipments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {shipment.carrier || "Carrier TBD"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Provider: {shipment.provider}
                          </p>
                          {shipment.trackingNumber && (
                            <p className="text-sm">
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
                        <div className="text-right">
                          <Badge variant="outline">{shipment.status}</Badge>
                          {shipment.trackingUrl && (
                            <Button asChild variant="link" size="sm" className="mt-2">
                              <a
                                href={shipment.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Track
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="font-medium">{event.type.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
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
              {order.stripePaymentStatus && (
                <p className="text-sm text-muted-foreground">
                  Payment status: {order.stripePaymentStatus}
                </p>
              )}
              {order.paidAt && (
                <p className="text-sm text-green-600">
                  Paid: {formatDate(order.paidAt)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{order.user.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">
                  {order.user.email}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/admin/users?search=${order.user.email}`}>
                  View User
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Shipping address */}
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
                {order.shippingAddress.phone && (
                  <p className="pt-2">{order.shippingAddress.phone}</p>
                )}
              </address>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
