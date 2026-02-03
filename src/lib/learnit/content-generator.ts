import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import { z } from "zod";

const LearnItGeneratedSchema = z.object({
  title: z.string().describe("The main title of the topic/tutorial"),
  description: z.string().describe("A concise summary (1-2 sentences) of what this topic covers"),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string().describe(
      "The MDX content for this section. Use code blocks, standard markdown, and [[wiki links]] to other topics.",
    ),
  })).describe("The main content sections of the tutorial"),
  relatedTopics: z.array(z.string()).describe(
    "List of 3-5 related topics that would make good next steps, as simple strings (e.g. 'Advanced React', 'State Management')",
  ),
});

export type GeneratedLearnItContent = z.infer<typeof LearnItGeneratedSchema>;

export async function generateLearnItTopic(
  path: string[],
): Promise<GeneratedLearnItContent | null> {
  const topic = path.join(" > ");

  const prompt = `
    You are an expert technical educator creating a high-quality, interactive learning wiki called LearnIt.
    
    Your task is to generate a comprehensive tutorial for the topic: "${topic}".
    
    The content should be:
    1. **Beginner-friendly but deep**: targeted at developers learning this specific concept.
    2. **Structured**: Broken into clear sections with H2 headings.
    3. **Interactive**: Include code examples where relevant.
    4. **Interconnected**: Use [[Wiki Link]] syntax to link to related concepts. For example, if you mention "State Management", writ it as [[State Management]].
    
    Format requirements:
    - Return valid JSON matching the schema.
    - Content must be valid MDX (Markdown + React components if needed, but stick to standard MDX).
    - Do NOT include the main title in the sections, it will be rendered separately.
    - Ensure code blocks have language tags (e.g. \`\`\`typescript).
  `;

  try {
    // const jsonSchema = JSON.stringify(zodToJsonSchema(LearnItGeneratedSchema)); // We will need zod-to-json-schema or just stringify the description manually.
    // Since I don't want to add a dependency right now, I'll rely on the detailed prompt description I added previously, but I'll make it explicit.

    // Actually, simply constructing the prompt to be explicit about the JSON structure is better.
    const promptWithSchema = `${prompt}
    
    Expected JSON Structure:
    {
      "title": "string",
      "description": "string",
      "sections": [
        { "heading": "string", "content": "string (markdown)" }
      ],
      "relatedTopics": ["string", "string"]
    }
    `;

    const result = await generateStructuredResponse<GeneratedLearnItContent>({
      prompt: promptWithSchema,
      maxTokens: 8192,
      // responseSchema: LearnItGeneratedSchema, // REMOVED
      // schemaName: "LearnItContent", // REMOVED
      temperature: 0.3,
    });

    const parsedResult = LearnItGeneratedSchema.parse(result);
    return parsedResult;
  } catch (error) {
    console.error("Failed to generate LearnIt content:", error);
    return null;
  }
}
