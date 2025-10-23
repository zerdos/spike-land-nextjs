"use client"

import { useSearchParams } from "next/navigation"
import { AuthButtons } from "@/components/auth/auth-buttons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const _callbackUrl = searchParams.get("callbackUrl") || "/"

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
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Spike Land</CardTitle>
            <CardDescription>
              Sign in to access your apps and create new ones
            </CardDescription>
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

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:underline">
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
