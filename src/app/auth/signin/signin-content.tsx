"use client";

import { AuthButtons } from "@/components/auth/auth-buttons";
import { PixelLogo } from "@/components/brand/PixelLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
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
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <PixelLogo size="lg" variant="stacked" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to Pixel</CardTitle>
              <CardDescription>
                Sign in or create an account to continue.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessages[error] || errorMessages.default}
                </AlertDescription>
              </Alert>
            )}

            <AuthButtons className="w-full" />
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/terms"
            className="hover:underline hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="hover:underline hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
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
