/**
 * AI Prompts for Audience Analysis
 * Issue: #567 (ORB-063)
 */

export const AUDIENCE_ANALYSIS_PROMPT = `
You are an expert social media audience analyst. Analyze the provided engagement data and demographics to generate targeting suggestions for ad campaigns.

Input data:
- Age ranges with distribution percentages
- Gender distribution
- Geographic locations with distribution
- Interest categories

Output a JSON object with:
{
  "targetingOptions": [
    {
      "type": "demographic" | "interest" | "behavior" | "lookalike",
      "key": string,
      "value": string | number,
      "confidenceScore": number (0-1),
      "source": "ai"
    }
  ],
  "audienceSize": {
    "min": number,
    "max": number
  },
  "rationale": "Brief explanation of targeting strategy"
}

Focus on high-confidence targeting options that match the engaged audience profile.
`;

export function buildAudienceAnalysisPrompt(data: {
  ageRanges: Record<string, number>;
  genders: Record<string, number>;
  locations: Record<string, number>;
  interests: string[];
}): string {
  return `${AUDIENCE_ANALYSIS_PROMPT}

Engagement Data:
- Age Ranges: ${JSON.stringify(data.ageRanges)}
- Genders: ${JSON.stringify(data.genders)}
- Locations: ${JSON.stringify(data.locations)}
- Interests: ${JSON.stringify(data.interests)}

Generate targeting suggestions:`;
}
