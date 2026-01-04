"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { PixelLogo, SpikeLandLogo } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Coins, LayoutGrid, LogOut, Menu, Settings, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/pixel", label: "Pixel", isPixel: true },
  { href: "/blog/pixel-launch-announcement", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
];

export function PlatformHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  // Only render Sheet after hydration to avoid ID mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

          {/* Mobile Menu - Only render Sheet after hydration to prevent ID mismatch */}
          {mounted
            ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="rounded-t-[2rem] border-t border-primary/20 bg-background/95 backdrop-blur-xl h-[60vh] z-[60] overflow-y-auto"
                >
                  <VisuallyHidden>
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </VisuallyHidden>
                  <div className="flex justify-center w-full pt-2 pb-6">
                    <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
                  </div>
                  <nav className="flex flex-col gap-6 px-4 pb-8">
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
                    {isAuthenticated && session?.user
                      ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <Separator className="my-2" />
                          <div className="flex items-center gap-3 py-2">
                            <Avatar>
                              <AvatarImage
                                src={session.user.image || undefined}
                                alt={session.user.name || "User"}
                              />
                              <AvatarFallback>
                                {session.user.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {session.user.name || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {session.user.email || "No email"}
                              </span>
                            </div>
                          </div>

                          <Link
                            href="/apps/pixel"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <PixelLogo
                              size="sm"
                              variant="icon"
                              showText={false}
                              className="mr-3 h-5 w-5"
                            />
                            <span>Pixel - AI Photo Enhance</span>
                          </Link>

                          <Link
                            href="/tokens"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Coins className="mr-3 h-5 w-5" />
                            <span>Token Management</span>
                          </Link>

                          <Link
                            href="/my-apps"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <LayoutGrid className="mr-3 h-5 w-5" />
                            <span>My Apps</span>
                          </Link>

                          <Link
                            href="/profile"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <User className="mr-3 h-5 w-5" />
                            <span>Profile</span>
                          </Link>

                          <Link
                            href="/settings"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Settings className="mr-3 h-5 w-5" />
                            <span>Settings</span>
                          </Link>

                          <button
                            onClick={() => signOut()}
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2 text-left"
                          >
                            <LogOut className="mr-3 h-5 w-5" />
                            <span>Log out</span>
                          </button>
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
            )
            : (
              // SSR placeholder - matches visual appearance without Radix IDs
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
        </div>
      </div>
    </header>
  );
}
