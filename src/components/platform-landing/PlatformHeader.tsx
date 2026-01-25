"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { SpikeLandLogo } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  BarChart3,
  Brain,
  Calendar,
  ChevronDown,
  Coins,
  LayoutGrid,
  LogOut,
  Menu,
  Rocket,
  Settings,
  SplitSquareVertical,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// Feature dropdown items for the Features menu
const featureItems = [
  {
    href: "/features/ab-testing",
    label: "A/B Testing",
    description: "Optimize content with data",
    icon: SplitSquareVertical,
  },
  {
    href: "/features/calendar",
    label: "AI Calendar",
    description: "Smart scheduling & automation",
    icon: Calendar,
  },
  {
    href: "/features/brand-brain",
    label: "Brand Brain",
    description: "Your AI brand guardian",
    icon: Brain,
  },
  {
    href: "/features/analytics",
    label: "Analytics",
    description: "Deep performance insights",
    icon: BarChart3,
  },
];

// Main navigation links
const navLinks = [
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
          <nav className="hidden md:flex items-center gap-6">
            {/* Orbit - Primary CTA */}
            <Button asChild variant="default" size="sm" className="font-semibold">
              <Link href="/orbit" className="flex items-center gap-1.5">
                <Rocket className="h-4 w-4" />
                Orbit
              </Link>
            </Button>

            {/* Features Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Features menu"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Features
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                {featureItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-start gap-3 py-2">
                      <item.icon className="h-5 w-5 mt-0.5 text-primary" aria-hidden="true" />
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Standard nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* My Apps - De-emphasized */}
            <Link
              href="/my-apps"
              className="text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              My Apps
            </Link>

            {!isAuthenticated && (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
            )}
            {isAuthenticated ? <UserAvatar /> : (
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin">
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
                  <nav className="flex flex-col gap-4 px-4 pb-8">
                    {/* Orbit - Primary CTA */}
                    <Button
                      asChild
                      variant="default"
                      className="w-full font-semibold h-12"
                    >
                      <Link
                        href="/orbit"
                        className="flex items-center justify-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Rocket className="h-5 w-5" />
                        Orbit - AI Marketing Team
                      </Link>
                    </Button>

                    {/* Features Section */}
                    <div className="space-y-2">
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Features
                      </span>
                      {featureItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <item.icon className="h-5 w-5 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <Separator />

                    {/* Standard nav links */}
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary flex items-center py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}

                    {/* My Apps - De-emphasized */}
                    <Link
                      href="/my-apps"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutGrid className="h-5 w-5" />
                      <span>My Apps</span>
                    </Link>

                    {!isAuthenticated && (
                      <Link
                        href="/auth/signin"
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
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
                            href="/tokens"
                            className="flex items-center text-lg font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary py-2"
                            onClick={() =>
                              setMobileMenuOpen(false)}
                          >
                            <Coins className="mr-3 h-5 w-5" />
                            <span>Token Management</span>
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
                        <Button asChild variant="outline" className="mt-4">
                          <Link
                            href="/auth/signin"
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
