import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInContent } from "./signin-content";

export default async function SignInPage() {
  const session = await auth();

  // If user is already authenticated, redirect to home
  if (session) {
    redirect("/");
  }

  return <SignInContent />;
}
