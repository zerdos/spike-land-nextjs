"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chrome, Github, Loader2, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { SignInButton } from "./sign-in-button";

interface AuthButtonsProps {
  className?: string;
}

export function AuthButtons({ className }: AuthButtonsProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        // Redirect to home on success
        window.location.href = "/";
      }
    } catch {
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3 w-full max-w-sm ${className || ""}`}>
      <Button
        onClick={() => signIn("github")}
        variant="default"
        className="w-full"
        size="lg"
      >
        <Github className="mr-2 h-5 w-5" />
        Continue with GitHub
      </Button>

      <Button
        onClick={() => signIn("google")}
        variant="outline"
        className="w-full"
        size="lg"
      >
        <Chrome className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>

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

      {!showEmailForm ? (
        <Button
          onClick={() => setShowEmailForm(true)}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Mail className="mr-2 h-5 w-5" />
          Continue with Email
        </Button>
      ) : (
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Email"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setShowEmailForm(false);
              setError(null);
              setEmail("");
              setPassword("");
            }}
          >
            Back to other options
          </Button>
        </form>
      )}

      <SignInButton className="w-full" />
    </div>
  );
}
