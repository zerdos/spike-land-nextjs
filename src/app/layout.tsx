import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieConsent } from "@/components/analytics/cookie-consent";

// Temporary workaround: Use system fonts to avoid Google Fonts network issues in CI
// TODO: Switch back to Geist fonts once network connectivity is stable or use local fonts
// const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const geistSans = {
  variable: "--font-geist-sans",
  className: "",
};

const geistMono = {
  variable: "--font-geist-mono",
  className: "",
};

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
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
