"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Home,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";

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

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ElementType;
    color: string;
  }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    icon: Clock,
    color: "text-yellow-600",
  },
  PAYMENT_PENDING: {
    label: "Awaiting Payment",
    variant: "outline",
    icon: CreditCard,
    color: "text-yellow-600",
  },
  PAID: {
    label: "Paid",
    variant: "secondary",
    icon: CheckCircle,
    color: "text-green-600",
  },
  SUBMITTED: {
    label: "Processing",
    variant: "secondary",
    icon: Package,
    color: "text-blue-600",
  },
  IN_PRODUCTION: {
    label: "In Production",
    variant: "default",
    icon: Package,
    color: "text-blue-600",
  },
  SHIPPED: {
    label: "Shipped",
    variant: "default",
    icon: Truck,
    color: "text-purple-600",
  },
  DELIVERED: {
    label: "Delivered",
    variant: "default",
    icon: Home,
    color: "text-green-600",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "destructive",
    icon: XCircle,
    color: "text-red-600",
  },
  REFUNDED: {
    label: "Refunded",
    variant: "outline",
    icon: RefreshCw,
    color: "text-gray-600",
  },
};

export function OrderStatusBadge({
  status,
  className,
  showIcon = true,
}: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge data-testid="order-status-badge" variant={config.variant} className={className}>
      {showIcon && <Icon className={`mr-1 h-3 w-3 ${config.color}`} />}
      {config.label}
    </Badge>
  );
}
