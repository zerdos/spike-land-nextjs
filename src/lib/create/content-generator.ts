import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";
import { z } from "zod";

const GeneratedAppSchema = z.object({
  title: z.string().describe("The name of the app"),
  description: z.string().describe("A concise 1-sentence description of what the app does"),
  code: z.string().describe(
    "The complete, self-contained React component code (using Tailwind CSS)",
  ),
  relatedApps: z.array(z.string()).describe(
    "List of 3-5 related app paths that user might want to try next (e.g. 'cooking/french', 'games/tic-tac-toe')",
  ),
});

export type GeneratedAppContent = z.infer<typeof GeneratedAppSchema>;

export async function generateAppContent(
  path: string[],
): Promise<GeneratedAppContent | null> {
  const topic = path.join("/");

  const prompt = `
    You are a master React developer capable of building single-file, interactive micro-apps.
    
    The user wants an app based on this path: "/create/${topic}".
    Interpret this path as a user intent. For example:
    - "cooking/pasta" -> A pasta recipe generator or cooking timer.
    - "games/tictactoe" -> A Tic-Tac-Toe game.
    - "tools/calculator" -> A scientific calculator.
    - "finance/mortgage" -> A mortgage calculator.
    
    Your task:
    1. Generate a **fully functional, interactive React component**.
    2. Use **Tailwind CSS** for beautiful, modern styling.
    3. The component must be the **default export**.
    4. Do not use external libraries other than 'react', 'lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'.
    5. Ensure the code is self-contained.
    6. Suggest 3-5 related app paths for the "relatedApps" field. These should start with the logic path (e.g. "cooking/pizza").
    
    Format requirements:
    - Return valid JSON matching the schema.
    - The 'code' field must be a string containing the full source code.
    - Do NOT wrap the code in markdown blocks in the JSON string (it must be a raw string).
  `;

  try {
    const promptWithSchema = `${prompt}
    
    Expected JSON Structure:
    {
      "title": "string",
      "description": "string",
      "code": "string (the full react component source code)",
      "relatedApps": ["string", "string"]
    }
    `;

    const result = await generateStructuredResponse<GeneratedAppContent>({
      prompt: promptWithSchema,
      maxTokens: 8192,
      temperature: 0.7, // Higher creativity for apps
    });

    // Gemini sometimes returns markdown code blocks in the 'code' string even if asked not to.
    // Clean it up just in case.
    if (result && result.code) {
      result.code = result.code.replace(/^```tsx?/, "").replace(/^```/, "").replace(/```$/, "")
        .trim();
    }

    const parsedResult = GeneratedAppSchema.parse(result);
    return parsedResult;
  } catch (error) {
    logger.error("Failed to generate app content:", { error });
    return null;
  }
}
