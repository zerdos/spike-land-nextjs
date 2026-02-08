export function LandingPageStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://spike.land/#organization",
        "name": "Spike Land",
        "legalName": "SPIKE LAND LTD",
        "url": "https://spike.land",
        "logo": {
          "@type": "ImageObject",
          "url": "https://spike.land/opengraph-image",
        },
        "email": "hello@spike.land",
        "sameAs": [
          "https://twitter.com/spikeland",
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "hello@spike.land",
          "contactType": "customer support",
        },
      },
      {
        "@type": "ProfessionalService",
        "@id": "https://spike.land/#localbusiness",
        "name": "Spike Land",
        "url": "https://spike.land",
        "parentOrganization": {
          "@id": "https://spike.land/#organization",
        },
        "image": "https://spike.land/opengraph-image",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Brighton",
          "addressRegion": "East Sussex",
          "addressCountry": "GB",
        },
        "areaServed": {
          "@type": "Country",
          "name": "United Kingdom",
        },
        "priceRange": "$$",
        "description":
          "AI-powered app creation platform. Build, share, and deploy live apps instantly. Based in Brighton, UK.",
      },
      {
        "@type": "WebApplication",
        "name": "Spike Land App Builder",
        "url": "https://spike.land/create",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "provider": {
          "@id": "https://spike.land/#organization",
        },
        "description":
          "AI-powered app builder that creates live, shareable web apps from natural language descriptions.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "GBP",
        },
      },
      {
        "@type": "Service",
        "serviceType": "AI Image Enhancement",
        "provider": {
          "@id": "https://spike.land/#organization",
        },
        "name": "Pixel - AI Image Enhancement",
        "description":
          "AI-powered image enhancement and photo blending tools for creators.",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
