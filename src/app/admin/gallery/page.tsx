/**
 * Featured Gallery Admin Page
 *
 * Server component that wraps the client component for gallery management.
 * Allows admins to manage before/after image pairs displayed on the landing page.
 */

import { GalleryAdminClient } from "./GalleryAdminClient";

export default function GalleryAdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Featured Gallery</h1>
      <p className="text-muted-foreground mb-8">
        Manage before/after image pairs displayed on the landing page.
      </p>
      <GalleryAdminClient />
    </div>
  );
}
