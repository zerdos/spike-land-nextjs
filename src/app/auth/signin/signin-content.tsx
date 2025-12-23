"use client";

import { AuthButtons } from "@/components/auth/auth-buttons";
import { PixelLogo } from "@/components/brand/PixelLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContentInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Error starting OAuth sign in",
    OAuthCallback: "Error during OAuth callback",
    OAuthCreateAccount: "Could not create OAuth account",
    EmailCreateAccount: "Could not create email account",
    Callback: "Error in callback handler",
    OAuthAccountNotLinked: "This account is already linked to another user",
    EmailSignin: "Check your email for a sign in link",
    CredentialsSignin: "Sign in failed. Check your credentials",
    SessionRequired: "Please sign in to access this page",
    default: "An error occurred during sign in",
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        <Card className="bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-6 pt-8">
            <div className="flex justify-center scale-125 mb-2">
              <PixelLogo size="lg" variant="horizontal" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                Restore photos in minutes
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground font-medium">
                <span className="inline-block">Batch enhance</span>
                <span className="mx-2 opacity-50">•</span>
                <span className="inline-block">Compare before/after</span>
                <span className="mx-2 opacity-50">•</span>
                <span className="inline-block">Export in high quality</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessages[error] || errorMessages.default}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 mb-6 text-center">
              <p className="text-sm text-foreground/80">
                Enter your email to sign in or create an account.
              </p>
            </div>

            <AuthButtons className="w-full" />

            <div className="mt-6 text-center space-y-4">
              <p className="text-xs text-muted-foreground">
                By continuing you agree to{" "}
                <Link href="/terms" className="underline hover:text-foreground">Terms</Link> &{" "}
                <Link href="/privacy" className="underline hover:text-foreground">Privacy</Link>.
              </p>
              <p className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase">
                No spam. We never post to your accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SignInContent() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignInContentInner />
    </Suspense>
  );
}
