
function validateMessages(messages: unknown): string | null {
    if (!messages || !Array.isArray(messages)) {
      return "Messages must be an array";
    }

    if (messages.length === 0) {
      return "Messages array cannot be empty";
    }

    const MAX_MESSAGES_COUNT = 100;
    const MAX_MESSAGE_LENGTH = 100000;
    const VALID_ROLES = ["user", "assistant", "system"] as const;

    if (messages.length > MAX_MESSAGES_COUNT) {
      return `Too many messages. Maximum allowed: ${MAX_MESSAGES_COUNT}`;
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!msg || typeof msg !== "object") {
        return `Message at index ${i} must be an object`;
      }

      const typedMsg = msg as Record<string, unknown>;

      if (
        !typedMsg.role || typeof typedMsg.role !== "string" ||
        !VALID_ROLES.includes(typedMsg.role as any)
      ) {
        return `Message at index ${i} must have a valid role (${VALID_ROLES.join(", ")})`;
      }

      // Support both 'content' and 'parts' fields
      const hasContent = typedMsg.content !== undefined;
      const hasParts = typedMsg.parts !== undefined;

      if (!hasContent && !hasParts) {
        return `Message at index ${i} must have either 'content' or 'parts'`;
      }

      // Check message size
      const messageSize = JSON.stringify(typedMsg).length;
      if (messageSize > MAX_MESSAGE_LENGTH) {
        return `Message at index ${i} exceeds maximum size limit`;
      }

      // Validate content structure if present
      if (hasContent) {
        if (
          typeof typedMsg.content !== "string" &&
          !Array.isArray(typedMsg.content)
        ) {
          return `Message at index ${i} content must be a string or array`;
        }

        if (Array.isArray(typedMsg.content)) {
          for (let j = 0; j < typedMsg.content.length; j++) {
            const part = typedMsg.content[j];
            if (!part || typeof part !== "object" || !("type" in part)) {
              return `Message at index ${i}, content part ${j} must have a type`;
            }
          }
        }
      }

      // Validate parts structure if present
      if (hasParts) {
        if (!Array.isArray(typedMsg.parts)) {
          return `Message at index ${i} parts must be an array`;
        }

        for (let j = 0; j < typedMsg.parts.length; j++) {
          const part = typedMsg.parts[j];
          if (!part || typeof part !== "object" || !("type" in part)) {
            return `Message at index ${i}, part ${j} must have a type`;
          }
        }
      }
    }

    return null;
  }

const messages = [
        {
          role: "user",
          parts: { // Object instead of array
            type: "text",
            text: "hello",
          },
        },
      ];

console.log(validateMessages(messages));
