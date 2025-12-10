import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { AuthHeader } from "@/components/auth/auth-header";
import { SessionProvider } from "@/components/auth/session-provider";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { NonceProvider } from "@/components/security/nonce-provider";
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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <NonceProvider nonce={nonce}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
            nonce={nonce}
          >
            <SessionProvider>
              <AuthHeader />
              {children}
              <FeedbackButton />
            </SessionProvider>
            <CookieConsent />
            <Toaster />
          </ThemeProvider>
        </NonceProvider>
        <Analytics nonce={nonce} />
        <SpeedInsights nonce={nonce} />
      </body>
    </html>
  );
}
