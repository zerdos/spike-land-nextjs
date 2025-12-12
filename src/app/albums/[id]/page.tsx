import { redirect } from "next/navigation";

interface AlbumRedirectProps {
  params: Promise<{ id: string; }>;
}

/**
 * Redirect /albums/[id] to /apps/pixel/albums/[id]
 * This provides a shorter URL for easy access to individual albums.
 */
export default async function AlbumRedirect({ params }: AlbumRedirectProps) {
  const { id } = await params;
  redirect(`/apps/pixel/albums/${id}`);
}
