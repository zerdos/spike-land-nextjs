import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPageStructuredData } from "./LandingPageStructuredData";

describe("LandingPageStructuredData", () => {
  it("renders the JSON-LD script with correct data", () => {
    render(<LandingPageStructuredData />);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeDefined();

    if (script) {
      const json = JSON.parse(script.innerHTML);
      expect(json["@context"]).toBe("https://schema.org");
      expect(json["@graph"]).toHaveLength(5);

      const organization = json["@graph"].find((item: any) => item["@type"] === "Organization");
      expect(organization).toBeDefined();
      expect(organization.name).toBe("Spike Land");

      const localBusiness = json["@graph"].find((item: any) =>
        item["@type"] === "ProfessionalService"
      );
      expect(localBusiness).toBeDefined();
      expect(localBusiness.address.addressCountry).toBe("GB");

      const services = json["@graph"].filter((item: any) => item["@type"] === "Service");
      expect(services).toHaveLength(3);
    }
  });
});
