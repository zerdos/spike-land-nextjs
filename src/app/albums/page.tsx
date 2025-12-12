import { redirect } from "next/navigation";

/**
 * Redirect /albums to /apps/pixel/albums
 * This provides a shorter URL for easy access to the albums feature.
 */
export default function AlbumsRedirect() {
  redirect("/apps/pixel/albums");
}
