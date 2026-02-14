import { getGeminiClient } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";

const FRIENDLY_ERROR_MESSAGE =
  "I'm having a bit of trouble right now. Please try again in a moment.";

interface CreateGeminiChatStreamParams {
  question: string;
  systemPrompt: string;
  maxTokens?: number;
  onComplete?: (fullAnswer: string) => void;
}

/**
 * Creates a ReadableStream that streams Gemini chat responses as SSE events.
 *
 * Emits events in the same format consumed by `useChatStream`:
 * - `{type: "text", text: "chunk"}` per text chunk
 * - `{type: "done", usage: {model: "gemini-3-flash-preview"}}` on completion
 * - `{type: "error", error: "friendly message"}` on any failure
 */
export function createGeminiChatStream(
  params: CreateGeminiChatStreamParams,
): ReadableStream {
  const { question, systemPrompt, maxTokens = 512, onComplete } = params;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullAnswer = "";

      try {
        const ai = await getGeminiClient();

        const response = await ai.models.generateContentStream({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: "user",
              parts: [{ text: question }],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        });

        for await (const chunk of response) {
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullAnswer += text;
            const data = JSON.stringify({ type: "text", text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        const doneData = JSON.stringify({
          type: "done",
          usage: { model: "gemini-3-flash-preview" },
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        logger.error("Gemini chat stream error", {
          error: error instanceof Error ? error.message : String(error),
        });
        const errData = JSON.stringify({
          type: "error",
          error: FRIENDLY_ERROR_MESSAGE,
        });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        controller.close();
        return;
      }

      if (onComplete) {
        try {
          onComplete(fullAnswer);
        } catch (cbError) {
          logger.error("Gemini chat onComplete callback error", {
            error:
              cbError instanceof Error ? cbError.message : String(cbError),
          });
        }
      }
    },
  });
}
