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
          "addressCountry": "GB",
        },
        "priceRange": "$$",
      },
      {
        "@type": "Service",
        "serviceType": "Social Media Management",
        "provider": {
          "@id": "https://spike.land/#organization",
        },
        "name": "Social Media Command Center",
        "description":
          "Manage all your social accounts with AI agents. Create content, schedule posts, and grow your audience.",
      },
      {
        "@type": "Service",
        "serviceType": "AI Automation",
        "provider": {
          "@id": "https://spike.land/#organization",
        },
        "name": "AI Automation",
        "description":
          "Relay drafts and Allocator autopilot for automated content creation and distribution.",
      },
      {
        "@type": "Service",
        "serviceType": "A/B Testing",
        "provider": {
          "@id": "https://spike.land/#organization",
        },
        "name": "A/B Testing & Analytics",
        "description": "Pulse monitoring and A/B testing to optimize content performance.",
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
