import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PhotoMixClient } from "./PhotoMixClient";

export default async function PhotoMixPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return <PhotoMixClient />;
}
