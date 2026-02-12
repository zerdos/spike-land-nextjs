"use client";

import { usePathname, useRouter } from "next/navigation";

export function useAuthRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  const redirectToSignIn = () => {
    const callbackUrl = encodeURIComponent(pathname);
    router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
  };

  return { redirectToSignIn };
}
