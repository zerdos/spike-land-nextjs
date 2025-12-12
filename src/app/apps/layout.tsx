import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apps | Spike Land",
  description: "Explore interactive applications built with Next.js",
};

export default function AppsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pass through layout - individual apps have their own layouts/headers
  return <>{children}</>;
}
