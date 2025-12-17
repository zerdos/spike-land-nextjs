/**
 * Meta Pixel Component
 *
 * Loads the Meta (Facebook) Pixel for conversion tracking.
 * Only renders if NEXT_PUBLIC_META_PIXEL_ID is configured.
 *
 * @see https://developers.facebook.com/docs/meta-pixel/implementation/
 */
"use client";

import Script from "next/script";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <MetaPixel />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function MetaPixel() {
  if (!META_PIXEL_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
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
        {/* eslint-disable-next-line @next/next/no-img-element -- Tracking pixel must use img, not Next Image */}
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
