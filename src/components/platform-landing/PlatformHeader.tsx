"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { PixelLogo, SpikeLandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

const navLinks = [
  { href: "/pixel", label: "Pixel", isPixel: true },
  { href: "/blog/pixel-launch-announcement", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
];

export function PlatformHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <SpikeLandLogo size="sm" variant="horizontal" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center"
              >
                {"isPixel" in link && link.isPixel
                  ? <PixelLogo size="sm" variant="horizontal" />
                  : link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
            )}
            {isAuthenticated ? <UserAvatar /> : (
              <Button asChild>
                <Link href="/pixel">
                  Get Started
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
              className="rounded-t-[2rem] border-t border-primary/20 bg-background/95 backdrop-blur-xl h-[60vh] z-[60]"
            >
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
              <div className="flex justify-center w-full pt-2 pb-6">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>
              <nav className="flex flex-col gap-6 px-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {"isPixel" in link && link.isPixel
                      ? <PixelLogo size="sm" variant="horizontal" />
                      : link.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <Link
                    href="/auth/signin"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
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
                        href="/pixel"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
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
