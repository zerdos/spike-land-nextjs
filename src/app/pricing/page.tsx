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
import { useWorkspaceCredits } from "@/hooks/useWorkspaceCredits";
import { ENHANCEMENT_COSTS } from "@/lib/credits/costs";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Fetch credit balance for logged-in users
  const { remaining, isLoading } = useWorkspaceCredits();

  async function handleTierCheckout(tierId: "PRO" | "BUSINESS") {
    if (!isAuthenticated) {
      router.push("/auth/signin?callbackUrl=/pricing");
      return;
    }

    setCheckoutLoading(tierId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "workspace_tier", tierId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="container mx-auto pt-24 pb-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Pricing</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose a workspace plan that fits your social media and AI needs.
          All plans include monthly AI credits for image enhancement.
        </p>
      </div>

      {/* Hero card about AI Credits */}
      <div className="max-w-4xl mx-auto mb-16">
        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">
                Pixel AI Photo Enhancement
              </CardTitle>
            </div>
            <CardDescription className="text-base">
              Use Orbit's built-in AI to enhance your brand photography directly in your workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative w-full aspect-[2/1] max-w-2xl mx-auto rounded-lg overflow-hidden border shadow-lg">
              <Image
                src="/token-well.jpeg"
                alt="Orbit AI Credits"
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {isAuthenticated && (
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">
                  Your current balance
                </p>
                <p className="text-2xl font-bold text-primary">
                  {isLoading ? "..." : `${remaining} credits`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orbit Workspace Tiers */}
      <div
        className="max-w-6xl mx-auto mb-16"
        data-testid="workspace-tiers-section"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Orbit Workspace Plans</h2>
          </div>
          <p className="text-muted-foreground">
            Power your social media management with Orbit workspace subscriptions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Free
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>3 social accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>30 scheduled posts/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>1 A/B test</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>100 AI credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>1 team member</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* PRO Tier */}
          <Card className="relative border-2 border-primary shadow-lg">
            <div className="absolute top-4 -right-8 rotate-45 bg-primary text-primary-foreground text-xs py-1 px-8 font-medium">
              Popular
            </div>
            <CardHeader>
              <Badge className="w-fit mb-2">Most Popular</Badge>
              <CardTitle className="flex items-center gap-2">
                Pro
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$29</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>10 social accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>Unlimited</strong> scheduled posts
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>10 A/B tests</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>1,000 AI credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>3 team members</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleTierCheckout("PRO")}
                disabled={checkoutLoading === "PRO"}
              >
                {checkoutLoading === "PRO"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  : "Get Started"}
              </Button>
            </CardFooter>
          </Card>

          {/* BUSINESS Tier */}
          <Card className="relative border-2 border-green-500">
            <Badge className="absolute -top-3 left-4 bg-green-500">Best Value</Badge>
            <CardHeader className="pt-6">
              <CardTitle className="flex items-center gap-2">
                Business
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$99</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>Unlimited</strong> social accounts
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>Unlimited</strong> scheduled posts
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>Unlimited</strong> A/B tests
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>5,000 AI credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>10 team members</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => handleTierCheckout("BUSINESS")}
                disabled={checkoutLoading === "BUSINESS"}
              >
                {checkoutLoading === "BUSINESS"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  : "Get Started"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Credit Usage Info */}
      <div className="max-w-3xl mx-auto mb-16">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Credit Usage Guide
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
                    1 credit per image
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
                    2 credits per image
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
                    5 credits per image
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
              <h3 className="font-semibold mb-2">What are AI credits used for?</h3>
              <p className="text-muted-foreground">
                Credits are used to enhance your images with AI in Pixel. Higher resolution
                enhancements cost more credits. All Orbit plans include a monthly allocation
                of AI credits.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">
                How do I get more credits?
              </h3>
              <p className="text-muted-foreground">
                Upgrading your Orbit plan increases your monthly AI credit limit. 
                Pro and Business plans include significantly higher monthly allocations 
                to support larger workflows.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Do credits roll over?</h3>
              <p className="text-muted-foreground">
                No, monthly credits from your workspace plan reset at the start of each billing cycle.
                Make sure to use your allocated credits each month or upgrade your plan if you
                consistently need more.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What happens if an enhancement fails?</h3>
              <p className="text-muted-foreground">
                If an enhancement fails, your credits are automatically refunded to your 
                workspace balance. You can try the enhancement again or contact support 
                if you experience persistent issues.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
