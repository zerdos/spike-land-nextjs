import { redirect } from "next/navigation";

export const metadata = {
  title: "Albums - Spike Land",
  description: "Organize your enhanced images into albums",
};

export default async function AlbumsPage() {
  // Albums index page redirects to Pixel app
  redirect("/apps/pixel");
}
