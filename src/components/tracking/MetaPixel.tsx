/**
 * Meta Pixel Component
 *
 * Loads the Meta (Facebook) Pixel for conversion tracking.
 * Only renders if NEXT_PUBLIC_META_PIXEL_ID is configured.
 *
 * @see https://developers.facebook.com/docs/meta-pixel/implementation/
 */
"use client";

import { CONSENT_CHANGED_EVENT, CONSENT_KEY, hasConsent } from "@/lib/tracking/consent";
import Script from "next/script";
import { useEffect, useState } from "react";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

interface MetaPixelProps {
  /** CSP nonce for inline script execution */
  nonce?: string;
}

/**
 * Meta Pixel tracking component
 *
 * Initializes Meta Pixel and fires PageView event on load.
 * This component should be placed in the root layout.
 *
 * @example
 * ```tsx
 * // In src/app/layout.tsx
 * import { MetaPixel } from "@/components/tracking/MetaPixel";
 * import { getNonce } from "@/lib/security/csp-nonce-server";
 *
 * export default async function RootLayout({ children }) {
 *   const nonce = await getNonce();
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <MetaPixel nonce={nonce ?? undefined} />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function MetaPixel({ nonce }: MetaPixelProps) {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    setConsentGiven(hasConsent());
  }, []);

  // Listen for same-tab consent changes via custom event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleConsentChange = () => {
      setConsentGiven(hasConsent());
    };

    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
  }, []);

  // Sync across tabs using storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY) {
        setConsentGiven(hasConsent());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (!META_PIXEL_ID || !consentGiven) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- The `<img>` tag is required for the Meta Pixel's noscript fallback, as Next.js's `<Image>` component does not work without JavaScript. */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
