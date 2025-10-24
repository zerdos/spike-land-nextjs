import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spike Land - Vibe Coded Apps with Claude Code",
  description: "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code, combining AI innovation with creative development for next-generation web experiences.",
  keywords: ["Spike Land", "Smart Video Wall", "vibe coding", "Claude Code", "AI development", "innovative apps", "web platform", "creative coding"],
  authors: [{ name: "Spike Land Team" }],
  openGraph: {
    title: "Spike Land - Vibe Coded Apps with Claude Code",
    description: "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code.",
    type: "website",
    siteName: "Spike Land",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spike Land - Vibe Coded Apps with Claude Code",
    description: "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
