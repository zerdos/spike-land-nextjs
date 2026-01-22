import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { CookieConsent } from "@/components/CookieConsent";
import { ConsoleCapture } from "@/components/errors/ConsoleCapture";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ConditionalHeader } from "@/components/platform-landing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import { SessionTracker } from "@/components/tracking/SessionTracker";
import { Toaster } from "@/components/ui/sonner";
import { getNonce } from "@/lib/security/csp-nonce-server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ViewTransitions } from "next-view-transitions";

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
  metadataBase: new URL("https://spike.land"),
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
  const nonce = await getNonce();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <ViewTransitions>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
            nonce={nonce ?? undefined}
          >
            <QueryProvider>
              <SessionProvider>
                <ConditionalHeader />
                {children}
                <FeedbackButton />
                <Suspense fallback={null}>
                  <SessionTracker />
                </Suspense>
              </SessionProvider>
            </QueryProvider>
            <Toaster toastOptions={{ className: "z-[100]" }} />
            <CookieConsent />
          </ThemeProvider>
        </ViewTransitions>
        <Analytics />
        <SpeedInsights />
        <ConsoleCapture />
        <MetaPixel nonce={nonce ?? undefined} />
      </body>
    </html>
  );
}
