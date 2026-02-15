"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface StorePurchaseButtonProps {
  price: number;
}

export function StorePurchaseButton({ price }: StorePurchaseButtonProps) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3 items-center">
        <Button disabled>Loading...</Button>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col gap-3 items-center">
        <Button asChild>
          <Link href="/auth/signin">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sign in to Purchase
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="flex flex-row gap-3">
        <Button asChild variant="default">
          <Link href="#">
            <Sparkles className="mr-2 h-4 w-4" />
            Install Free
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">
            <ShoppingCart className="mr-2 h-4 w-4" />
            ${price} - Buy Now
          </Link>
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Free with Orbit subscription
      </p>
    </div>
  );
}
