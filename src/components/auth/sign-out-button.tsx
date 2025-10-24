"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  children?: React.ReactNode;
  className?: string;
  callbackUrl?: string;
}

export function SignOutButton({
  children,
  className,
  callbackUrl = "/"
}: SignOutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl });
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      className={className}
    >
      {children || (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </>
      )}
    </Button>
  );
}