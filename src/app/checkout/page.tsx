"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const UK_EU_COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
];

interface CheckoutSummary {
  subtotal: number;
  shipping: number;
  shippingZone: string;
  freeShippingThreshold: number;
  total: number;
  currency: string;
  itemCount: number;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone: string;
}

function CheckoutForm({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          `${window.location.origin}/orders/${orderId}/confirmation?orderNumber=${orderNumber}`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing
          ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </span>
          )
          : (
            <span className="flex items-center">
              <Lock className="mr-2 h-4 w-4" />
              Complete Order
            </span>
          )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is securely processed by Stripe. Your card will be authorized now and charged
        only after your order is confirmed by our production partner.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<"address" | "payment">("address");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);

  // Address form
  const [email, setEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    countryCode: "GB",
    phone: "",
  });

  // Fetch user data and cart summary
  useEffect(() => {
    async function init() {
      try {
        // Get user email
        const userResponse = await fetch("/api/user");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setEmail(userData.email || "");
        }

        // Verify cart has items
        const cartResponse = await fetch("/api/merch/cart");
        if (!cartResponse.ok) {
          router.push("/login?callbackUrl=/checkout");
          return;
        }

        const cartData = await cartResponse.json();
        if (!cartData.cart || cartData.cart.items.length === 0) {
          router.push("/cart");
          return;
        }
      } catch (err) {
        console.error("Failed to initialize checkout:", err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [router]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!shippingAddress.name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!shippingAddress.line1.trim()) {
      setError("Address line 1 is required");
      return;
    }
    if (!shippingAddress.city.trim()) {
      setError("City is required");
      return;
    }
    if (!shippingAddress.postalCode.trim()) {
      setError("Postal code is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress,
          customerEmail: email,
          customerPhone: shippingAddress.phone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setSummary(data.summary);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to proceed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(price);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/cart"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to cart
      </Link>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === "address" && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            phone: e.target.value,
                          })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={shippingAddress.name}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          name: e.target.value,
                        })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line1">Address Line 1 *</Label>
                    <Input
                      id="line1"
                      value={shippingAddress.line1}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          line1: e.target.value,
                        })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line2">Address Line 2 (optional)</Label>
                    <Input
                      id="line2"
                      value={shippingAddress.line2}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          line2: e.target.value,
                        })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            city: e.target.value,
                          })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            postalCode: e.target.value,
                          })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={shippingAddress.countryCode}
                        onValueChange={(value) =>
                          setShippingAddress({
                            ...shippingAddress,
                            countryCode: value,
                          })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UK_EU_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processing...
                        </span>
                      )
                      : (
                        "Continue to Payment"
                      )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "payment" && clientSecret && (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                    },
                  }}
                >
                  <CheckoutForm
                    orderId={orderId!}
                    orderNumber={orderNumber!}
                  />
                </Elements>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary
                ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Subtotal ({summary.itemCount} items)
                      </span>
                      <span>{formatPrice(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Shipping ({summary.shippingZone})
                      </span>
                      <span>
                        {summary.shipping === 0 ? <span className="text-green-600">FREE</span> : (
                          formatPrice(summary.shipping)
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatPrice(summary.total)}</span>
                    </div>
                  </>
                )
                : (
                  <p className="text-sm text-muted-foreground">
                    Complete shipping info to see final total
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
