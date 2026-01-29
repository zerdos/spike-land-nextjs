/**
 * Public Gallery Page
 * 
 * Server component that displays all public images from all users
 * with filtering by tags and enhancement tier.
 */

import type { Metadata } from "next";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Public Gallery | Spike Land",
  description: "Browse amazing AI-enhanced images from our community",
};

export default function GalleryPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Public Gallery</h1>
        <p className="text-muted-foreground">
          Explore AI-enhanced images from our community
        </p>
      </div>
      <GalleryClient />
    </main>
  );
}
