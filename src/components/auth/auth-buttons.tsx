"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome, Github, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

type AuthStep = "email" | "password" | "signup" | "oauth-only";

interface AuthButtonsProps {
  className?: string;
}

interface EmailCheckResponse {
  exists: boolean;
  hasPassword: boolean;
  error?: string;
}

export function AuthButtons({ className }: AuthButtonsProps) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEmail = async (): Promise<EmailCheckResponse | null> => {
    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to check email");
        return null;
      }

      return data as EmailCheckResponse;
    } catch (err) {
      console.error("Email check error:", err);
      setError("An error occurred. Please try again.");
      return null;
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsCheckingEmail(true);
    setError(null);

    const result = await checkEmail();

    setIsCheckingEmail(false);

    if (!result) return;

    if (result.exists) {
      if (result.hasPassword) {
        // User exists with password - show password field
        setStep("password");
      } else {
        // User exists but no password (OAuth only)
        setStep("oauth-only");
      }
    } else {
      // New user - show signup form with password
      setStep("signup");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        // Redirect to callback URL or home on success
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") || "/";

        // Validate URL to prevent open redirect attacks
        let safeUrl = "/";
        try {
          // Only allow same-origin absolute URLs or relative paths
          const url = new URL(callbackUrl, window.location.origin);
          if (url.origin === window.location.origin) {
            safeUrl = url.href;
          }
        } catch {
          // Malformed URL; use default
        }
        window.location.href = safeUrl;
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // For signup, we use the same credentials flow
      // The backend will create the user if they don't exist
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        // If error, the user might need to register differently
        setError("Unable to create account. Please try signing in with Google or GitHub.");
      } else if (result?.ok) {
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") || "/";

        let safeUrl = "/";
        try {
          const url = new URL(callbackUrl, window.location.origin);
          if (url.origin === window.location.origin) {
            safeUrl = url.href;
          }
        } catch {
          // Malformed URL; use default
        }
        window.location.href = safeUrl;
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError("An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setPassword("");
    setError(null);
  };

  const renderEmailStep = () => (
    <form onSubmit={handleEmailContinue} className="space-y-4">
      <div className="space-y-2">
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isCheckingEmail}
          className="h-12"
          autoComplete="email"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full shadow-glow-cyan"
        size="lg"
        disabled={isCheckingEmail || !email.trim()}
      >
        {isCheckingEmail
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          )
          : (
            "Continue"
          )}
      </Button>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Input
          id="email-display"
          type="email"
          value={email}
          disabled
          className="h-12 bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="h-12"
          autoComplete="current-password"
          autoFocus
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full shadow-glow-cyan"
        size="lg"
        disabled={isLoading || !password}
      >
        {isLoading
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          )
          : (
            "Sign In"
          )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleBack}
        disabled={isLoading}
      >
        Use different email
      </Button>
    </form>
  );

  const renderSignupStep = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Input
          id="email-display"
          type="email"
          value={email}
          disabled
          className="h-12 bg-muted"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Create a password to set up your account.
      </p>

      <div className="space-y-2">
        <Input
          id="password"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="h-12"
          autoComplete="new-password"
          minLength={8}
          autoFocus
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full shadow-glow-cyan"
        size="lg"
        disabled={isLoading || password.length < 8}
      >
        {isLoading
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          )
          : (
            "Create Account"
          )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleBack}
        disabled={isLoading}
      >
        Use different email
      </Button>
    </form>
  );

  const renderOAuthOnlyStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          id="email-display"
          type="email"
          value={email}
          disabled
          className="h-12 bg-muted"
        />
      </div>

      <p className="text-sm text-muted-foreground text-center">
        This account was created with Google or GitHub. Please sign in using one of these options.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleBack}
      >
        Use different email
      </Button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case "email":
        return renderEmailStep();
      case "password":
        return renderPasswordStep();
      case "signup":
        return renderSignupStep();
      case "oauth-only":
        return renderOAuthOnlyStep();
      default:
        return renderEmailStep();
    }
  };

  return (
    <div className={`flex flex-col gap-4 w-full max-w-sm ${className || ""}`}>
      {/* Email Form - Primary Action */}
      {renderCurrentStep()}

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social Buttons - Secondary, Neutral Styling */}
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => signIn("google")}
          variant="outline"
          className="w-full bg-card hover:bg-card/80 border-border"
          size="lg"
        >
          <Chrome className="mr-2 h-5 w-5" />
          Continue with Google
        </Button>

        <Button
          onClick={() => signIn("github")}
          variant="outline"
          className="w-full bg-card hover:bg-card/80 border-border"
          size="lg"
        >
          <Github className="mr-2 h-5 w-5" />
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}
