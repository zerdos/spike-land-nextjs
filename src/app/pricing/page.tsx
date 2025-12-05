"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ENHANCEMENT_COSTS, TOKEN_PACKAGES } from "@/lib/stripe/client";
import type { TokenPackageId } from "@/lib/stripe/client";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packageId: TokenPackageId) => {
    if (!session) {
      window.location.href = "/?callbackUrl=/pricing";
      return;
    }

    setLoading(packageId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, mode: "payment" }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get tokens to enhance your images with AI. Choose a token pack that suits your needs.
        </p>
      </div>

      {/* Enhancement Costs Info */}
      <div className="max-w-2xl mx-auto mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_1K}</div>
                <div className="text-sm text-muted-foreground">token for 1K</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_2K}</div>
                <div className="text-sm text-muted-foreground">tokens for 2K</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_4K}</div>
                <div className="text-sm text-muted-foreground">tokens for 4K</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Packs */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Token Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {(Object.entries(TOKEN_PACKAGES) as [
            TokenPackageId,
            typeof TOKEN_PACKAGES[TokenPackageId],
          ][]).map(
            ([id, pkg]) => (
              <Card key={id} className={id === "pro" ? "border-primary" : ""}>
                <CardHeader>
                  {id === "pro" && <Badge className="w-fit mb-2">Most Popular</Badge>}
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.tokens} tokens</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    £{pkg.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    £{(pkg.price / pkg.tokens).toFixed(2)} per token
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={id === "pro" ? "default" : "outline"}
                    disabled={loading === id || status === "loading"}
                    onClick={() => handlePurchase(id)}
                  >
                    {loading === id ? "Processing..." : "Buy Now"}
                  </Button>
                </CardFooter>
              </Card>
            ),
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">What are tokens used for?</h3>
            <p className="text-muted-foreground">
              Tokens are used to enhance your images with AI. Higher resolution enhancements cost
              more tokens.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Do tokens expire?</h3>
            <p className="text-muted-foreground">
              Purchased tokens never expire. Use them whenever you need to enhance your images.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">How do I get more tokens?</h3>
            <p className="text-muted-foreground">
              You can purchase additional token packs anytime from this page. Choose the pack that
              best fits your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
