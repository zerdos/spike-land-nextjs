"use client";

import { TierCard } from "@/components/tiers";
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
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { useTier } from "@/hooks/useTier";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { ENHANCEMENT_COSTS, TOKEN_PACKAGES } from "@/lib/stripe/client";
import type { TokenPackageId } from "@/lib/stripe/client";
import { cn } from "@/lib/utils";
import { Check, Clock, Coins, Crown, Gift, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";

// Calculate value comparison for packages
function getPackageValueInfo(id: TokenPackageId) {
  const basePrice = TOKEN_PACKAGES.starter.price /
    TOKEN_PACKAGES.starter.tokens;
  const currentPrice = TOKEN_PACKAGES[id].price / TOKEN_PACKAGES[id].tokens;
  const savings = Math.round((1 - currentPrice / basePrice) * 100);

  const badges: {
    label: string;
    variant: "default" | "secondary" | "outline";
  }[] = [];

  if (id === "pro") {
    badges.push({ label: "Most Popular", variant: "default" });
  }
  if (id === "power") {
    badges.push({ label: "Best Value", variant: "secondary" });
  }
  if (savings > 0 && id !== "starter") {
    badges.push({ label: `Save ${savings}%`, variant: "outline" });
  }

  return { savings, badges };
}

// Format time remaining in minutes
function formatTimeRemaining(ms: number): string {
  const minutes = Math.ceil(ms / (1000 * 60));
  if (minutes <= 0) return "Available now!";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [timeUntilNextToken, setTimeUntilNextToken] = useState<number | null>(
    null,
  );
  const isAuthenticated = status === "authenticated" && session?.user;

  // Fetch token balance for logged-in users to get regeneration time
  const { balance, isLoading: balanceLoading } = useTokenBalance();

  // Fetch tier information for subscription section
  const { tiers, currentTier, isLoading: tiersLoading } = useTier();

  // Fetch time until next regeneration for logged-in users
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRegenTime = async () => {
      try {
        const response = await fetch("/api/tokens/balance");
        if (response.ok) {
          const data = await response.json();
          if (typeof data.timeUntilNextRegenMs === "number") {
            setTimeUntilNextToken(data.timeUntilNextRegenMs);
          }
        }
      } catch {
        // Silently fail - not critical
      }
    };

    fetchRegenTime();

    // Update countdown every minute
    const interval = setInterval(() => {
      setTimeUntilNextToken((prev) => {
        if (prev === null) return null;
        const newTime = prev - 60000;
        return newTime > 0 ? newTime : 0;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
        setLoading(null);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
      setLoading(null);
    }
  };

  // Get enhancement counts for each package
  const getEnhancementCounts = (tokens: number) => ({
    tier1K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_1K),
    tier2K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_2K),
    tier4K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_4K),
  });

  return (
    <div className="container mx-auto pt-24 pb-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Pricing</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get tokens to enhance your images with AI. Choose a token pack that suits your needs.
          Tokens never expire!
        </p>
      </div>

      {/* Free Tokens Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">
                Free Tokens Every 15 Minutes!
              </CardTitle>
            </div>
            <CardDescription className="text-base">
              No credit card required. Just sign in and start enhancing your photos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Token Well Image */}
            <div className="relative w-full aspect-[2/1] max-w-2xl mx-auto rounded-lg overflow-hidden border shadow-lg">
              <Image
                src="/token-well.jpeg"
                alt="How Pixel tokens work - Free regeneration every 15 minutes, enhance your photos, power user mode for unlimited creativity"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Key Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-background/50">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold">+1 Token Every 15 Min</p>
                <p className="text-sm text-muted-foreground">
                  Tokens regenerate automatically
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <Coins className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-semibold">Up to 10 Free Tokens</p>
                <p className="text-sm text-muted-foreground">
                  Your token well stores up to 10
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold">2 Tokens = 1 Image</p>
                <p className="text-sm text-muted-foreground">
                  Enhance at 1K resolution
                </p>
              </div>
            </div>

            {/* Next Token Countdown for logged in users */}
            {isAuthenticated && (
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">
                  Your current balance
                </p>
                <p className="text-2xl font-bold text-primary mb-2">
                  {balanceLoading ? "..." : `${balance} tokens`}
                </p>
                {timeUntilNextToken !== null && balance < 10 && (
                  <p className="text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Next free token in: <strong>{formatTimeRemaining(timeUntilNextToken)}</strong>
                  </p>
                )}
                {balance >= 10 && (
                  <p className="text-sm text-green-600">
                    <Check className="h-4 w-4 inline mr-1" />
                    Token well is full!
                  </p>
                )}
              </div>
            )}

            {/* Sign in CTA for non-authenticated users */}
            {!isAuthenticated && status !== "loading" && (
              <div className="text-center">
                <Button asChild size="lg" className="px-8">
                  <Link href="/auth/signin?callbackUrl=/pricing">
                    Sign in to get free tokens
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans */}
      <div className="max-w-6xl mx-auto mb-16" data-testid="subscription-tiers-section">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-bold">Subscription Plans</h2>
          </div>
          <p className="text-muted-foreground">
            Upgrade your token well for faster regeneration and higher capacity
          </p>
        </div>

        {tiersLoading
          ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading plans...</p>
            </div>
          )
          : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.map((tier) => {
                  const isCurrent = tier.tier === currentTier;
                  return (
                    <TierCard
                      key={tier.tier}
                      tier={tier}
                      isCurrent={isCurrent}
                      data-testid={`pricing-tier-${tier.tier}`}
                    />
                  );
                })}
              </div>

              <div className="text-center mt-8">
                {isAuthenticated
                  ? (
                    <Button asChild variant="outline">
                      <Link href="/settings/subscription">Manage Your Subscription</Link>
                    </Button>
                  )
                  : (
                    <Button asChild>
                      <Link href="/auth/signin?callbackUrl=/settings/subscription">
                        Sign in to Subscribe
                      </Link>
                    </Button>
                  )}
              </div>
            </>
          )}
      </div>

      {/* Token Packs */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Token Packs</h2>
        <p className="text-center text-muted-foreground mb-8">
          One-time purchase. No subscription required.
        </p>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
          data-testid="token-packages-grid"
        >
          {(Object.entries(TOKEN_PACKAGES) as [
            TokenPackageId,
            typeof TOKEN_PACKAGES[TokenPackageId],
          ][]).map(
            ([id, pkg]) => {
              const { badges } = getPackageValueInfo(id);
              const enhancements = getEnhancementCounts(pkg.tokens);
              const isPopular = id === "pro";
              const isBestValue = id === "power";

              return (
                <Card
                  key={id}
                  className={cn(
                    "relative overflow-hidden transition-all hover:shadow-lg",
                    isPopular && "border-primary border-2 scale-105 shadow-lg",
                    isBestValue && "border-green-500 border-2",
                  )}
                  data-testid={`package-card-${id}`}
                >
                  {/* Featured ribbon for popular */}
                  {isPopular && (
                    <div className="absolute top-4 -right-8 rotate-45 bg-primary text-primary-foreground text-xs py-1 px-8 font-medium">
                      Popular
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 min-h-[24px] mb-2">
                      {badges.map((badge, i) => (
                        <Badge
                          key={i}
                          variant={badge.variant}
                          className={cn(
                            "text-xs",
                            badge.label === "Best Value" &&
                              "bg-green-500 hover:bg-green-600 text-white",
                          )}
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>

                    <CardTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      {pkg.name}
                    </CardTitle>
                    <CardDescription className="text-lg font-semibold text-foreground">
                      {pkg.tokens} tokens
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price */}
                    <div>
                      <div className="text-3xl font-bold">
                        £{pkg.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        £{(pkg.price / pkg.tokens).toFixed(3)} per token
                      </div>
                    </div>

                    <Separator />

                    {/* Enhancement estimates */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Enhance up to:
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>
                            <strong>{enhancements.tier1K}</strong> images at 1K
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>
                            <strong>{enhancements.tier2K}</strong> images at 2K
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>
                            <strong>{enhancements.tier4K}</strong> images at 4K
                          </span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>

                  {isAuthenticated && (
                    <CardFooter>
                      <Button
                        className={cn(
                          "w-full",
                          isPopular && "bg-primary hover:bg-primary/90",
                          isBestValue && "bg-green-500 hover:bg-green-600",
                        )}
                        variant={isPopular || isBestValue
                          ? "default"
                          : "outline"}
                        disabled={loading === id}
                        onClick={() => handlePurchase(id)}
                        data-testid={`buy-button-${id}`}
                      >
                        {loading === id ? "Redirecting to checkout..." : (
                          <>
                            <Zap className="h-4 w-4 mr-1.5" />
                            Buy Now
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            },
          )}
        </div>
      </div>

      {/* Token Usage Info */}
      <div className="max-w-3xl mx-auto mb-16">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Token Usage Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-xl mx-auto">
                  {ENHANCEMENT_COSTS.TIER_1K}
                </div>
                <div>
                  <p className="font-semibold">1K Enhancement</p>
                  <p className="text-xs text-muted-foreground">
                    1024px resolution
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-xl mx-auto">
                  {ENHANCEMENT_COSTS.TIER_2K}
                </div>
                <div>
                  <p className="font-semibold">2K Enhancement</p>
                  <p className="text-xs text-muted-foreground">
                    2048px resolution
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-xl mx-auto">
                  {ENHANCEMENT_COSTS.TIER_4K}
                </div>
                <div>
                  <p className="font-semibold">4K Enhancement</p>
                  <p className="text-xs text-muted-foreground">
                    4096px resolution
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What are tokens used for?</h3>
              <p className="text-muted-foreground">
                Tokens are used to enhance your images with AI. Higher resolution enhancements cost
                more tokens. Choose the quality level that best suits your needs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Do tokens expire?</h3>
              <p className="text-muted-foreground">
                No! Purchased tokens never expire. Use them whenever you need to enhance your
                images. Your tokens will always be available in your account.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">
                Which pack should I choose?
              </h3>
              <p className="text-muted-foreground">
                If you're just getting started, the <strong>Starter Pack</strong>{" "}
                is perfect for trying out the service. For regular use, the{" "}
                <strong>Pro Pack</strong> offers great value. Power users should consider the{" "}
                <strong>Power Pack</strong> for maximum savings.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Can I get a refund?</h3>
              <p className="text-muted-foreground">
                If an enhancement fails, your tokens are automatically refunded. For
                purchase-related refunds, please contact our support team within 7 days of purchase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
