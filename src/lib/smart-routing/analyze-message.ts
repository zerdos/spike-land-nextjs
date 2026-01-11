import { InboxItem } from "@prisma/client";
import { z } from "zod";
import { getGeminiClient } from "../ai/gemini-client";
import { AnalyzeMessageResponseSchema } from "../validations/smart-routing";

const ANALYSIS_MODEL = "gemini-2.0-flash-exp";

export interface AnalysisInput {
  content: string;
  senderName?: string;
  senderHandle?: string;
  platform?: string;
  context?: string; // e.g. previous messages
}

export type AnalysisResult = z.infer<typeof AnalyzeMessageResponseSchema>;

export async function analyzeMessage(
  input: AnalysisInput,
  apiKey?: string, // Optional override
): Promise<AnalysisResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: ANALYSIS_MODEL });

  const prompt = `
You are an expert customer service AI agent. Analyze the following inbox message and provide structured routing data.

Message Content: "${input.content}"
Sender: ${input.senderName || "Unknown"} ${input.senderHandle ? `(@${input.senderHandle})` : ""}
Platform: ${input.platform || "Unknown"}
${input.context ? `Context: ${input.context}` : ""}

Analyze for:
1. Sentiment (POSITIVE, NEGATIVE, NEUTRAL, MIXED) - Be critical.
2. Sentiment Score (-1.0 to 1.0)
3. Urgency (low, medium, high, critical)
4. Category (e.g., support, sales, feedback, spam, other)
5. Intent (brief description of what the user wants)
6. Suggested Responses (3 distinct, professional options)
7. Reasoning (why you scored it this way)

Format the output as a valid JSON object matching this schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED",
  "sentimentScore": number,
  "urgency": "low" | "medium" | "high" | "critical",
  "category": "string",
  "intent": "string",
  "suggestedResponses": ["string", "string", "string"],
  "reasoning": "string"
}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temp for consistent analysis
      },
    });

    const responseText = result.response.text();
    const json = JSON.parse(responseText);

    // Validate with Zod
    return AnalyzeMessageResponseSchema.parse(json);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback? Or rethrow?
    // For now, rethrow so caller handles it
    throw error;
  }
}
