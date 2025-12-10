import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("Fetching available Gemini models...\n");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const models = await ai.models.list();

    console.log(`Found ${models.length} models:\n`);
    console.log("=".repeat(80));

    for (const model of models) {
      console.log(`\nModel: ${model.name}`);
      console.log(`  Display Name: ${model.displayName || "N/A"}`);
      console.log(`  Description: ${model.description || "N/A"}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(", ") || "N/A"}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit || "N/A"}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit || "N/A"}`);

      // Check if model supports image generation
      const supportsImages = model.supportedGenerationMethods?.includes("generateContent") ||
        model.name.includes("image") ||
        model.name.includes("imagen");

      if (supportsImages) {
        console.log(`  ✨ SUPPORTS IMAGE GENERATION`);
      }
    }

    console.log("\n" + "=".repeat(80));

    // Filter for image-related models
    const imageModels = models.filter((m) =>
      m.name.includes("image") ||
      m.name.includes("imagen") ||
      m.name.includes("vision") ||
      m.displayName?.toLowerCase().includes("image")
    );

    if (imageModels.length > 0) {
      console.log("\nImage-related models:");
      imageModels.forEach((m) => console.log(`  - ${m.name} (${m.displayName})`));
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    process.exit(1);
  }
}

main();
