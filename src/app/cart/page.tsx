"use client";

import { notifyCartUpdate } from "@/components/merch/cart-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface CartItem {
  id: string;
  quantity: number;
  customText: string | null;
  product: {
    id: string;
    name: string;
    retailPrice: number;
    currency: string;
    mockupTemplate: string | null;
  };
  variant: {
    id: string;
    name: string;
    priceDelta: number;
  } | null;
  image: {
    id: string;
    originalUrl: string;
  } | null;
  uploadedImageUrl: string | null;
}

interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

const FREE_SHIPPING_THRESHOLD = 55;

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch("/api/merch/cart");
      if (response.ok) {
        const data = await response.json();
        setCart(data.cart);
      } else if (response.status === 401) {
        router.push("/login?callbackUrl=/cart");
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setError("Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > 10) {
      setError("Maximum quantity is 10 per item");
      return;
    }

    setUpdatingItemId(itemId);
    setError(null);

    try {
      const response = await fetch(`/api/merch/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) {
        throw new Error("Failed to update quantity");
      }

      await fetchCart();
      notifyCartUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingItemId(itemId);
    setError(null);

    try {
      const response = await fetch(`/api/merch/cart/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove item");
      }

      await fetchCart();
      notifyCartUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const formatPrice = (price: number, currency = "GBP") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getItemPrice = (item: CartItem) => {
    return item.product.retailPrice + (item.variant?.priceDelta || 0);
  };

  const getItemImageUrl = (item: CartItem) => {
    return item.image?.originalUrl || item.uploadedImageUrl || item.product.mockupTemplate;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader>
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
            <CardTitle>Your cart is empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Browse our merch collection and add some products!
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/merch">Browse Products</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const subtotal = cart.subtotal;
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 4.99;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const itemPrice = getItemPrice(item);
            const imageUrl = getItemImageUrl(item);
            const isUpdating = updatingItemId === item.id;

            return (
              <Card
                key={item.id}
                data-testid="cart-item"
                className={isUpdating ? "opacity-50" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {imageUrl
                        ? (
                          <Image
                            src={imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        )
                        : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-2xl">🖼️</span>
                          </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.product.name}</h3>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.name}
                        </p>
                      )}
                      {item.customText && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Custom text: {item.customText}
                        </p>
                      )}
                      <p className="font-semibold mt-2">
                        {formatPrice(itemPrice, item.product.currency)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        data-testid="remove-cart-item"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          data-testid="decrease-quantity"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span data-testid="cart-item-quantity" className="w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          data-testid="increase-quantity"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdating || item.quantity >= 10}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="font-semibold">
                        {formatPrice(itemPrice * item.quantity, item.product.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <Card data-testid="order-summary" className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span data-testid="shipping-cost">
                  {shippingCost === 0 ? <span className="text-green-600">FREE</span> : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>

              {remainingForFreeShipping > 0 && (
                <Alert>
                  <AlertDescription className="text-sm">
                    Add {formatPrice(remainingForFreeShipping)} more for free shipping!
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span data-testid="cart-total">{formatPrice(total)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                VAT will be calculated at checkout for EU orders
              </p>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/merch">Continue Shopping</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
