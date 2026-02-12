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
import {
  BookOpen,
  Check,
  Code,
  ImageIcon,
  Loader2,
  Terminal,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
        <h1 className="text-4xl font-bold mb-4">Most of spike.land is free.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Vibe code apps, use MCP developer tools, enhance images, and learn
          anything — all without paying. Orbit plans are for when you need
          serious social media management.
        </p>
      </div>

      {/* Free Platform Features */}
      <div className="max-w-4xl mx-auto mb-16" data-testid="free-features-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Vibe Coding</CardTitle>
                <Badge variant="secondary" className="ml-auto">Free</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Build web apps from natural language. Describe what you want,
                watch it come to life.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">MCP Developer Tools</CardTitle>
                <Badge variant="secondary" className="ml-auto">Free</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect Claude, Cursor, or any MCP client directly to
                spike.land.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Pixel Image Enhancement</CardTitle>
                <Badge variant="secondary" className="ml-auto">Free</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enhance any image with AI. Free tier includes nano-model
                enhancements.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">LearnIt Wiki</CardTitle>
                <Badge variant="secondary" className="ml-auto">Free</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-generated knowledge base. Ask anything, get a structured
                article.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orbit Social Media Management */}
      <div
        className="max-w-6xl mx-auto mb-16"
        data-testid="workspace-tiers-section"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Orbit Social Media Management</h2>
          </div>
          <p className="text-muted-foreground">
            When you need to manage multiple accounts, schedule posts, and run
            A/B tests.
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
                  <span>Vibe coding (unlimited)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>MCP tools (unlimited)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>5 social accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>100 scheduled posts/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>3 A/B tests</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>500 AI credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>1 team member</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isAuthenticated ? (
                <Button variant="outline" className="w-full" disabled>
                  Your Plan
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auth/signin?callbackUrl=/pricing">
                    Get Started Free
                  </Link>
                </Button>
              )}
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
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Everything in Free, plus:
              </p>
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
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Everything in Free, plus:
              </p>
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

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">
                Why is so much of this free?
              </h3>
              <p className="text-muted-foreground">
                I quit my job to build spike.land full-time. I believe
                developer tools and creative tools should be accessible to
                everyone. The free tier isn't a trial — it's the real product.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">
                What actually costs money?
              </h3>
              <p className="text-muted-foreground">
                Orbit Pro and Business plans for teams that need advanced social
                media management. Everything else — vibe coding, MCP tools,
                image enhancement, LearnIt — is free.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">
                How can I support the project?
              </h3>
              <p className="text-muted-foreground">
                Use it, tell someone about it, or grab a paid Orbit plan if you
                need the features. Revenue from Orbit funds development. The
                project is also open source on GitHub.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
