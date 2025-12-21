"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CartIconProps {
  className?: string;
}

export function CartIcon({ className }: CartIconProps) {
  const [itemCount, setItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCartCount() {
      try {
        const response = await fetch("/api/merch/cart");
        if (response.ok) {
          const data = await response.json();
          setItemCount(data.cart?.itemCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch cart:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCartCount();

    // Listen for cart updates
    const handleCartUpdate = () => {
      fetchCartCount();
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      asChild
    >
      <Link href="/cart" className="relative">
        <ShoppingCart className="h-5 w-5" />
        {!isLoading && itemCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {itemCount > 99 ? "99+" : itemCount}
          </Badge>
        )}
        <span className="sr-only">Shopping cart ({itemCount} items)</span>
      </Link>
    </Button>
  );
}

// Helper to dispatch cart update event
export function notifyCartUpdate() {
  window.dispatchEvent(new CustomEvent("cart-updated"));
}
