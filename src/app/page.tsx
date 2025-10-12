"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthHeader, AuthSection } from "@/components/auth/auth-header";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <>
      <AuthHeader />
      <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {session ? `Welcome back, ${session.user?.name || 'User'}!` : 'Welcome to Your App'}
          </CardTitle>
          <CardDescription>
            Built with Next.js 15, TypeScript, Tailwind CSS 4, and shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!session ? (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sign in to get started</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred sign-in method to access all features.
                </p>
              </div>
              <AuthSection />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tech Stack:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Next.js 15 with App Router</li>
                  <li>✓ Strict TypeScript configuration</li>
                  <li>✓ Tailwind CSS 4 (latest)</li>
                  <li>✓ shadcn/ui components</li>
                  <li>✓ NextAuth.js authentication</li>
                  <li>✓ ESLint configured</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Get Started</Button>
                <Button variant="outline" className="flex-1">
                  Learn More
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
