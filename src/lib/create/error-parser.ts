export interface StructuredError {
  type: "transpile" | "runtime" | "type" | "import" | "unknown";
  message: string;
  library?: string;
  component?: string;
  lineNumber?: number;
  suggestion?: string;
}

/**
 * Parse a raw transpilation error string into a structured format.
 * Used for better note matching and more informative fix prompts.
 */
export function parseTranspileError(rawError: string): StructuredError {
  const error: StructuredError = {
    type: "unknown",
    message: rawError.slice(0, 500),
  };

  // Missing import / module not found
  if (
    /(?:Cannot find module|Could not resolve|Module not found|is not exported from)/i
      .test(rawError)
  ) {
    error.type = "import";
    const moduleMatch = rawError.match(/['"]([^'"]+)['"]/);
    if (moduleMatch) {
      error.library = moduleMatch[1];
    }
  } // Type errors
  else if (
    /(?:Type '.*' is not assignable|Property '.*' does not exist|Expected \d+ arguments)/i
      .test(rawError)
  ) {
    error.type = "type";
  } // JSX/syntax errors
  else if (
    /(?:Unexpected token|Unterminated|Expected|Parse error)/i.test(rawError)
  ) {
    error.type = "transpile";
  } // Undefined variable / runtime errors
  else if (
    /(?:is not defined|Cannot read propert)/i.test(rawError)
  ) {
    error.type = "runtime";
    const varMatch = rawError.match(/['"]?(\w+)['"]?\s+is not defined/);
    if (varMatch) {
      error.component = varMatch[1];
    }
  }

  // Extract line number
  const lineMatch = rawError.match(/(?:line\s+|:)(\d+)(?:[:\s]|$)/i);
  if (lineMatch) {
    error.lineNumber = parseInt(lineMatch[1]!, 10);
  }

  // Extract component name from JSX context
  const compMatch = rawError.match(/<(\w+)/);
  if (compMatch && !error.component) {
    error.component = compMatch[1];
  }

  // Extract suggestion if error message contains one
  const sugMatch = rawError.match(
    /(?:Did you mean|Try|Suggestion|Consider)[:\s]+(.+?)(?:\.|$)/i,
  );
  if (sugMatch) {
    error.suggestion = sugMatch[1]!.trim();
  }

  return error;
}

/**
 * Categorize an error for note creation — determines triggerType and tags.
 */
export function categorizeErrorForNote(error: StructuredError): {
  triggerType: string;
  tags: string[];
} {
  switch (error.type) {
    case "import":
      return {
        triggerType: "library",
        tags: ["imports", error.library || "unknown"].filter(Boolean),
      };
    case "type":
      return {
        triggerType: "pattern",
        tags: ["types", "typescript"],
      };
    case "transpile":
      return {
        triggerType: "error_class",
        tags: ["syntax", "transpile"],
      };
    case "runtime":
      return {
        triggerType: "pattern",
        tags: ["runtime", error.component || "unknown"].filter(Boolean),
      };
    default:
      return {
        triggerType: "error_class",
        tags: ["unknown"],
      };
  }
}
