import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AlbumsClient } from "./AlbumsClient";

export const metadata = {
  title: "Albums - Spike Land",
  description: "Organize your enhanced images into albums",
};

export default async function AlbumsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/?callbackUrl=/albums");
  }

  return <AlbumsClient />;
}
