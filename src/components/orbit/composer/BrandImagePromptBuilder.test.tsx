/**
 * Tests for BrandImagePromptBuilder
 * Part of #843: AI Image Generation for Posts
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrandProfileFormData } from "@/lib/validations/brand-brain";

import {
  BrandImagePromptBuilder,
  buildBrandAwarePrompt,
} from "./BrandImagePromptBuilder";

describe("buildBrandAwarePrompt", () => {
  it("returns original prompt when no brand profile provided", () => {
    const userPrompt = "A modern office workspace";
    const result = buildBrandAwarePrompt(userPrompt, null);

    expect(result.enrichedPrompt).toBe(userPrompt);
    expect(result.brandAttributes).toEqual([]);
  });

  it("returns original prompt when brand profile is undefined", () => {
    const userPrompt = "A modern office workspace";
    const result = buildBrandAwarePrompt(userPrompt, undefined);

    expect(result.enrichedPrompt).toBe(userPrompt);
    expect(result.brandAttributes).toEqual([]);
  });

  it("enriches prompt with tone descriptors", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 70, // casual
        technicalSimple: 30, // technical
        seriousPlayful: 80, // playful
        reservedEnthusiastic: 20, // reserved
      },
      colorPalette: [],
      values: [],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    expect(result.enrichedPrompt).toContain("Style: casual, technical, playful, reserved");
    expect(result.brandAttributes).toContain("Tone: casual, technical, playful, reserved");
  });

  it("describes balanced tone correctly", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [],
      values: [],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    // Balanced tone should not add style enrichment
    expect(result.enrichedPrompt).toBe(userPrompt);
    expect(result.brandAttributes).toEqual([]);
  });

  it("enriches prompt with color palette", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [
        { name: "Primary Blue", hex: "#0066CC" },
        { name: "Accent Orange", hex: "#FF6600" },
        { name: "Background White", hex: "#FFFFFF" },
      ],
      values: [],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    expect(result.enrichedPrompt).toContain("Brand colors: Primary Blue (#0066CC), Accent Orange (#FF6600), Background White (#FFFFFF)");
    expect(result.brandAttributes).toContain("Colors: 3 defined");
  });

  it("limits color palette to 5 colors", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [
        { name: "Color 1", hex: "#111111" },
        { name: "Color 2", hex: "#222222" },
        { name: "Color 3", hex: "#333333" },
        { name: "Color 4", hex: "#444444" },
        { name: "Color 5", hex: "#555555" },
        { name: "Color 6", hex: "#666666" },
        { name: "Color 7", hex: "#777777" },
      ],
      values: [],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    // Should only include first 5 colors
    expect(result.enrichedPrompt).toContain("Color 1");
    expect(result.enrichedPrompt).toContain("Color 5");
    expect(result.enrichedPrompt).not.toContain("Color 6");
    expect(result.brandAttributes).toContain("Colors: 7 defined");
  });

  it("enriches prompt with brand values", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [],
      values: ["innovation", "collaboration", "transparency"],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    expect(result.enrichedPrompt).toContain("Themes: innovation, collaboration, transparency");
    expect(result.brandAttributes).toContain("Values: innovation, collaboration, transparency");
  });

  it("limits values to 5 items", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [],
      values: ["value1", "value2", "value3", "value4", "value5", "value6", "value7"],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    // Should only include first 5 values in enrichment
    expect(result.enrichedPrompt).toContain("value1");
    expect(result.enrichedPrompt).toContain("value5");
    expect(result.enrichedPrompt).not.toContain("value6");
    // But all values should be in attributes
    expect(result.brandAttributes[0]).toContain("value7");
  });

  it("combines all brand attributes correctly", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 70, // casual
        technicalSimple: 70, // simple
        seriousPlayful: 30, // serious
        reservedEnthusiastic: 70, // enthusiastic
      },
      colorPalette: [
        { name: "Primary Blue", hex: "#0066CC" },
        { name: "Accent Orange", hex: "#FF6600" },
      ],
      values: ["innovation", "collaboration"],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    // Check enriched prompt structure
    expect(result.enrichedPrompt).toContain(userPrompt);
    expect(result.enrichedPrompt).toContain("Style: casual, simple, serious, enthusiastic");
    expect(result.enrichedPrompt).toContain("Brand colors: Primary Blue (#0066CC), Accent Orange (#FF6600)");
    expect(result.enrichedPrompt).toContain("Themes: innovation, collaboration");

    // Check attributes
    expect(result.brandAttributes).toHaveLength(3);
    expect(result.brandAttributes).toContain("Tone: casual, simple, serious, enthusiastic");
    expect(result.brandAttributes).toContain("Colors: 2 defined");
    expect(result.brandAttributes).toContain("Values: innovation, collaboration");
  });

  it("handles empty brand profile gracefully", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      colorPalette: [],
      values: [],
    };

    const result = buildBrandAwarePrompt(userPrompt, brandProfile);

    expect(result.enrichedPrompt).toBe(userPrompt);
    expect(result.brandAttributes).toEqual([]);
  });
});

describe("BrandImagePromptBuilder Component", () => {
  it("renders nothing when no children provided", () => {
    const { container } = render(
      <BrandImagePromptBuilder userPrompt="test prompt" />
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls children with enriched prompt and attributes", () => {
    const userPrompt = "A modern office workspace";
    const brandProfile: BrandProfileFormData = {
      name: "Test Brand",
      toneDescriptors: {
        formalCasual: 70,
        technicalSimple: 70,
        seriousPlayful: 70,
        reservedEnthusiastic: 70,
      },
      colorPalette: [{ name: "Blue", hex: "#0066CC" }],
      values: ["innovation"],
    };

    const { getByText } = render(
      <BrandImagePromptBuilder
        userPrompt={userPrompt}
        brandProfile={brandProfile}
      >
        {(enrichedPrompt, attributes) => (
          <div>
            <p>{enrichedPrompt}</p>
            {attributes.map((attr) => (
              <span key={attr}>{attr}</span>
            ))}
          </div>
        )}
      </BrandImagePromptBuilder>
    );

    expect(getByText(/A modern office workspace/)).toBeInTheDocument();
    expect(getByText(/Style: casual, simple, playful, enthusiastic/)).toBeInTheDocument();
    expect(getByText(/Tone: casual, simple, playful, enthusiastic/)).toBeInTheDocument();
    expect(getByText(/Colors: 1 defined/)).toBeInTheDocument();
    expect(getByText(/Values: innovation/)).toBeInTheDocument();
  });

  it("calls children with original prompt when no brand profile", () => {
    const userPrompt = "A modern office workspace";

    const { getByText, queryByText } = render(
      <BrandImagePromptBuilder userPrompt={userPrompt} brandProfile={null}>
        {(enrichedPrompt, attributes) => (
          <div>
            <p>{enrichedPrompt}</p>
            <span>Attributes: {attributes.length}</span>
          </div>
        )}
      </BrandImagePromptBuilder>
    );

    expect(getByText("A modern office workspace")).toBeInTheDocument();
    expect(getByText("Attributes: 0")).toBeInTheDocument();
    expect(queryByText(/Style:/)).not.toBeInTheDocument();
  });
});
