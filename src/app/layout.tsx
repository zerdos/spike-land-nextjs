import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spike Land - Vibe Coded Apps with Claude Code",
  description:
    "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code, combining AI innovation with creative development for next-generation web experiences.",
  keywords: [
    "Spike Land",
    "Smart Video Wall",
    "vibe coding",
    "Claude Code",
    "AI development",
    "innovative apps",
    "web platform",
    "creative coding",
  ],
  authors: [{ name: "Spike Land Team" }],
  openGraph: {
    title: "Spike Land - Vibe Coded Apps with Claude Code",
    description:
      "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code.",
    type: "website",
    siteName: "Spike Land",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spike Land - Vibe Coded Apps with Claude Code",
    description:
      "Experience the platform that brought you Smart Video Wall. Create vibe-coded applications powered by Claude Code.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
          </SessionProvider>
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
