"use client";

import { SignInButton } from "./sign-in-button";
import { Github, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

interface AuthButtonsProps {
  className?: string;
}

export function AuthButtons({ className }: AuthButtonsProps) {
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

      <SignInButton className="w-full" />
    </div>
  );
}