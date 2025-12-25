import { auth } from "@/auth";
import { PhotoMixClient } from "./PhotoMixClient";

export default async function PhotoMixPage() {
  const session = await auth();

  // Allow anonymous access - pass isAnonymous flag to client
  return <PhotoMixClient isAnonymous={!session} />;
}
