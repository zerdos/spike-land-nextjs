import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { CookieConsent } from "@/components/CookieConsent";
import { ConsoleCapture } from "@/components/errors/ConsoleCapture";
import { IframeErrorBridge } from "@/components/errors/IframeErrorBridge";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { FooterContent } from "@/components/footer/FooterContent";
import { FooterWrapper } from "@/components/footer/FooterWrapper";
import { ConditionalHeader } from "@/components/platform-landing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import { SessionTracker } from "@/components/tracking/SessionTracker";
import { Toaster } from "@/components/ui/sonner";
import { getNonce } from "@/lib/security/csp-nonce-server";
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
  title: "Spike Land - Open-Source AI-Powered Development Platform",
  description:
    "Build and ship software faster with AI agents, recursive workflows, and engineering discipline. Open source on GitHub. Clone it, run it, see what AI-assisted development looks like.",
  keywords: [
    "Spike Land",
    "AI development platform",
    "AI agents",
    "coding agents",
    "context engineering",
    "AI-assisted development",
    "open source",
    "developer tools",
    "CI/CD automation",
    "Claude Code",
  ],
  authors: [{ name: "Zoltan Erdos" }],
  openGraph: {
    title: "Spike Land - Open-Source AI-Powered Development Platform",
    description:
      "Build and ship software faster with AI agents, recursive workflows, and engineering discipline. Open source on GitHub.",
    type: "website",
    siteName: "Spike Land",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spike Land - Open-Source AI-Powered Development Platform",
    description:
      "Build and ship software faster with AI agents, recursive workflows, and engineering discipline. Open source on GitHub.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          nonce={nonce ?? undefined}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('selected-theme');
                  if (theme && theme !== 'default') {
                    document.documentElement.classList.add('theme-' + theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <ViewTransitions>
          <ThemeProvider
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
            nonce={nonce ?? undefined}
          >
            <QueryProvider>
              <SessionProvider>
                <ConditionalHeader />
                {children}
                <FooterWrapper>
                  <FooterContent />
                </FooterWrapper>
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
        <ConsoleCapture />
        <IframeErrorBridge />
        <MetaPixel nonce={nonce ?? undefined} />
      </body>
    </html>
  );
}
