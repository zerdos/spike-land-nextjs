"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorDetails: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: "Server Configuration Error",
      description:
        "There is a problem with the server configuration. Please contact support if this persists.",
    },
    AccessDenied: {
      title: "Access Denied",
      description:
        "You do not have permission to sign in. This might be because your account has been disabled or you're trying to access a restricted resource.",
    },
    Verification: {
      title: "Verification Error",
      description:
        "The verification token has expired or has already been used. Please try signing in again.",
    },
    OAuthSignin: {
      title: "OAuth Sign In Error",
      description:
        "Error occurred while starting the OAuth sign in process. Please try again.",
    },
    OAuthCallback: {
      title: "OAuth Callback Error",
      description:
        "Error occurred during the OAuth callback. This might be a temporary issue. Please try again.",
    },
    OAuthCreateAccount: {
      title: "OAuth Account Creation Error",
      description:
        "Could not create your account using OAuth. This might be because an account with your email already exists using a different sign in method.",
    },
    EmailCreateAccount: {
      title: "Email Account Creation Error",
      description:
        "Could not create your account. Please check your email and try again.",
    },
    Callback: {
      title: "Callback Error",
      description:
        "Error occurred in the callback handler. This is usually a temporary issue. Please try again.",
    },
    OAuthAccountNotLinked: {
      title: "Account Already Linked",
      description:
        "This email is already associated with another account. Please sign in using your original sign in method.",
    },
    EmailSignin: {
      title: "Email Sign In Error",
      description:
        "Could not send sign in email. Please check your email address and try again.",
    },
    CredentialsSignin: {
      title: "Sign In Failed",
      description:
        "Sign in failed. Please check your credentials and try again.",
    },
    SessionRequired: {
      title: "Session Required",
      description:
        "You must be signed in to access this page. Please sign in and try again.",
    },
    default: {
      title: "Authentication Error",
      description:
        "An unexpected error occurred during authentication. Please try again later.",
    },
  }

  const currentError = (error ? errorDetails[error] : undefined) ?? errorDetails.default
  const { title, description } = currentError!

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>
              Something went wrong during the authentication process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription>{description}</AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/auth/signin">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {error && (
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Error Code: <code className="font-mono">{error}</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="container mx-auto flex min-h-screen items-center justify-center">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}
