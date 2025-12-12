import { redirect } from "next/navigation";

/**
 * Redirects /albums to /pixel
 * Albums are now managed directly on the /pixel page
 */
export default function AlbumsPage() {
  redirect("/pixel");
}
