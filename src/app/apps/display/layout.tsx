import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Display App | Spike Land",
  description: "Smart Video Wall Display - Multi-Stream WebRTC Application",
};

export default function DisplayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
