"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

interface SignInButtonProps {
  provider?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SignInButton({
  provider,
  children,
  className,
}: SignInButtonProps) {
  const handleSignIn = () => {
    if (provider) {
      signIn(provider);
    } else {
      signIn();
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      className={className}
      variant="default"
    >
      {children || (
        <>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </>
      )}
    </Button>
  );
}
