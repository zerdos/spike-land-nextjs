"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { PixelLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Menu, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function PixelAppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;
  const { balance, isLoading: balanceLoading } = useTokenBalance();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Pixel Logo - links to /apps/pixel */}
          <Link href="/apps/pixel" className="flex items-center">
            <PixelLogo size="sm" variant="horizontal" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {balanceLoading ? "..." : balance} tokens
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                >
                  <Link href="/pricing" title="Buy more tokens">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
            {isAuthenticated ? <UserAvatar /> : (
              <Button asChild size="sm">
                <Link href="/auth/signin?callbackUrl=/apps/pixel">
                  Sign In
                </Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-[2rem] border-t border-primary/20 bg-background/95 backdrop-blur-xl h-[50vh]"
            >
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
              <div className="flex justify-center w-full pt-2 pb-6">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>
              <nav className="flex flex-col gap-6 px-4">
                <Link
                  href="/apps/pixel"
                  className="flex items-center justify-between text-xl font-semibold text-foreground group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="group-hover:text-primary transition-colors">
                    Back to Pixel
                  </span>
                  <div
                    className="h-2 w-2 rounded-full bg-primary shadow-glow-cyan"
                    title="You are here"
                  />
                </Link>
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">
                      {balanceLoading ? "..." : balance} tokens
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href="/pricing"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Buy Tokens
                      </Link>
                    </Button>
                  </div>
                )}
                {isAuthenticated
                  ? (
                    <div className="mt-4">
                      <UserAvatar />
                    </div>
                  )
                  : (
                    <Button asChild className="mt-4">
                      <Link
                        href="/auth/signin?callbackUrl=/apps/pixel"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </Button>
                  )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
