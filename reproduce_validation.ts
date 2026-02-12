const VALID_ROLES = ["user", "assistant", "system"] as const;
type ValidRole = typeof VALID_ROLES[number];

function validateMessages(messages: unknown): string | null {
    if (!messages || !Array.isArray(messages)) {
      return "Messages must be an array";
    }

    if (messages.length === 0) {
      return "Messages array cannot be empty";
    }

    if (messages.length > 100) {
      return `Too many messages. Maximum allowed: 100`;
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!msg || typeof msg !== "object") {
        return `Message at index ${i} must be an object`;
      }

      const typedMsg = msg as Record<string, unknown>;

      if (
        !typedMsg.role || typeof typedMsg.role !== "string" ||
        !VALID_ROLES.includes(typedMsg.role as ValidRole)
      ) {
        return `Message at index ${i} must have a valid role (${VALID_ROLES.join(", ")})`;
      }

      // Support both 'content' and 'parts' fields
      const hasContent = typedMsg.content !== undefined;
      const hasParts = typedMsg.parts !== undefined;

      if (!hasContent && !hasParts) {
        return `Message at index ${i} must have either 'content' or 'parts'`;
      }

      // Validate content structure if present
      if (hasContent) {
        // ... (content validation skipped for brevity)
      }

      // Validate parts structure if present
      if (hasParts) {
        if (!Array.isArray(typedMsg.parts)) {
          return `Message at index ${i} parts must be an array`;
        }
        // ...
      }
    }

    return null;
}

const messages = [
  {
    role: "user",
    parts: "not an array",
  },
];

const result = validateMessages(messages);
console.log("Result:", result);
if (result === "Message at index 0 parts must be an array") {
    console.log("Test PASSED");
} else {
    console.log("Test FAILED");
}
