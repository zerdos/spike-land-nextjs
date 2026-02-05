"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

interface SignInButtonProps {
  provider?: string;
  children?: React.ReactNode;
  className?: string;
  callbackUrl?: string;
}

export function SignInButton({
  provider,
  children,
  className,
  callbackUrl,
}: SignInButtonProps) {
  const handleSignIn = () => {
    const options = callbackUrl ? { callbackUrl } : undefined;
    if (provider) {
      signIn(provider, options);
    } else {
      signIn(undefined, options);
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
