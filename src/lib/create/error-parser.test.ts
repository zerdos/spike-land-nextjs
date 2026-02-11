import { describe, it, expect } from "vitest";
import {
  parseTranspileError,
  categorizeErrorForNote,
  type StructuredError,
} from "./error-parser";

describe("parseTranspileError", () => {
  describe("import errors", () => {
    it("should parse 'Cannot find module' errors", () => {
      const error = parseTranspileError(
        "Cannot find module 'react-icons/fa'",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("react-icons/fa");
      expect(error.message).toBe("Cannot find module 'react-icons/fa'");
    });

    it("should parse 'Module not found' errors", () => {
      const error = parseTranspileError(
        "Module not found: 'lodash'",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("lodash");
    });

    it("should parse 'Could not resolve' errors", () => {
      const error = parseTranspileError(
        "Could not resolve '@/components/Button'",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("@/components/Button");
    });

    it("should parse 'is not exported from' errors", () => {
      const error = parseTranspileError(
        "'useHooks' is not exported from 'react'",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("useHooks");
    });

    it("should parse import errors with double quotes", () => {
      const error = parseTranspileError(
        'Cannot find module "axios"',
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("axios");
    });

    it("should handle missing module name in import errors", () => {
      const error = parseTranspileError("Cannot find module");
      expect(error.type).toBe("import");
      expect(error.library).toBeUndefined();
    });
  });

  describe("type errors", () => {
    it("should parse 'Type is not assignable' errors", () => {
      const error = parseTranspileError(
        "Type 'string' is not assignable to type 'number'",
      );
      expect(error.type).toBe("type");
      expect(error.message).toContain("Type 'string' is not assignable");
    });

    it("should parse 'Property does not exist' errors", () => {
      const error = parseTranspileError(
        "Property 'foo' does not exist on type 'Bar'",
      );
      expect(error.type).toBe("type");
    });

    it("should parse 'Expected arguments' errors", () => {
      const error = parseTranspileError(
        "Expected 2 arguments, but got 1",
      );
      expect(error.type).toBe("type");
    });

    it("should handle case-insensitive type error patterns", () => {
      const error = parseTranspileError(
        "type 'null' is not ASSIGNABLE to type 'string'",
      );
      expect(error.type).toBe("type");
    });
  });

  describe("transpile errors", () => {
    it("should parse 'Unexpected token' errors", () => {
      const error = parseTranspileError("Unexpected token '}'");
      expect(error.type).toBe("transpile");
    });

    it("should parse 'Unterminated' errors", () => {
      const error = parseTranspileError("Unterminated string constant");
      expect(error.type).toBe("transpile");
    });

    it("should parse 'Expected' syntax errors", () => {
      const error = parseTranspileError("Expected ';' but found '}'");
      expect(error.type).toBe("transpile");
    });

    it("should parse 'Parse error' messages", () => {
      const error = parseTranspileError("Parse error at line 42");
      expect(error.type).toBe("transpile");
    });
  });

  describe("runtime errors", () => {
    it("should parse 'is not defined' errors", () => {
      const error = parseTranspileError("ReferenceError: foo is not defined");
      expect(error.type).toBe("runtime");
      expect(error.component).toBe("foo");
    });

    it("should parse 'is not defined' with quotes", () => {
      const error = parseTranspileError("'React' is not defined");
      expect(error.type).toBe("runtime");
      expect(error.component).toBe("React");
    });

    it("should parse 'Cannot read property' errors", () => {
      const error = parseTranspileError(
        "Cannot read property 'map' of undefined",
      );
      expect(error.type).toBe("runtime");
    });

    it("should parse 'Cannot read propert' (typo variant)", () => {
      const error = parseTranspileError("Cannot read propert");
      expect(error.type).toBe("runtime");
    });
  });

  describe("line number extraction", () => {
    it("should extract line number with 'line' prefix", () => {
      const error = parseTranspileError("Error at line 42: Unexpected token");
      expect(error.lineNumber).toBe(42);
    });

    it("should extract line number with colon separator", () => {
      const error = parseTranspileError("file.js:123 Parse error");
      expect(error.lineNumber).toBe(123);
    });

    it("should extract line number case-insensitively", () => {
      const error = parseTranspileError("Error at LINE 99");
      expect(error.lineNumber).toBe(99);
    });

    it("should handle multiple numbers and extract first line number", () => {
      const error = parseTranspileError("file.js:10:5 Expected 2 arguments");
      expect(error.lineNumber).toBe(10);
    });

    it("should return undefined when no line number present", () => {
      const error = parseTranspileError("Generic error message");
      expect(error.lineNumber).toBeUndefined();
    });
  });

  describe("component name extraction", () => {
    it("should extract component name from JSX context", () => {
      const error = parseTranspileError("Error in <Button> component");
      expect(error.component).toBe("Button");
    });

    it("should extract component from JSX self-closing tag", () => {
      const error = parseTranspileError("Invalid prop in <Icon />");
      expect(error.component).toBe("Icon");
    });

    it("should not override component from runtime error", () => {
      const error = parseTranspileError(
        "React is not defined in <App>",
      );
      expect(error.component).toBe("React"); // From 'is not defined' pattern
    });

    it("should extract component when runtime error has no match", () => {
      const error = parseTranspileError("Cannot read property in <Card>");
      expect(error.component).toBe("Card");
    });

    it("should handle no component present", () => {
      const error = parseTranspileError("Syntax error");
      expect(error.component).toBeUndefined();
    });
  });

  describe("suggestion extraction", () => {
    it("should extract 'Did you mean' suggestions", () => {
      const error = parseTranspileError(
        "Module not found. Did you mean: 'react-dom'?",
      );
      expect(error.suggestion).toBe("'react-dom'?");
    });

    it("should extract 'Try' suggestions", () => {
      const error = parseTranspileError(
        "Import failed. Try installing the package.",
      );
      expect(error.suggestion).toBe("installing the package");
    });

    it("should extract 'Suggestion' prefix", () => {
      const error = parseTranspileError(
        "Suggestion: Use type annotation",
      );
      expect(error.suggestion).toBe("Use type annotation");
    });

    it("should extract 'Consider' prefix", () => {
      const error = parseTranspileError(
        "Consider using strict mode.",
      );
      expect(error.suggestion).toBe("using strict mode");
    });

    it("should handle suggestions with colon separator", () => {
      const error = parseTranspileError(
        "Did you mean: import { useState } from 'react'",
      );
      expect(error.suggestion).toBe("import { useState } from 'react'");
    });

    it("should trim whitespace from suggestions", () => {
      const error = parseTranspileError(
        "Try:   use const instead  ",
      );
      expect(error.suggestion).toBe("use const instead");
    });

    it("should return undefined when no suggestion present", () => {
      const error = parseTranspileError("Simple error message");
      expect(error.suggestion).toBeUndefined();
    });
  });

  describe("unknown/generic errors", () => {
    it("should default to unknown type for unrecognized errors", () => {
      const error = parseTranspileError("Something went wrong");
      expect(error.type).toBe("unknown");
    });

    it("should truncate message to 500 characters", () => {
      const longMessage = "Error: " + "x".repeat(600);
      const error = parseTranspileError(longMessage);
      expect(error.message.length).toBe(500);
      expect(error.message).toBe(longMessage.slice(0, 500));
    });

    it("should preserve short messages", () => {
      const shortMessage = "Short error";
      const error = parseTranspileError(shortMessage);
      expect(error.message).toBe(shortMessage);
    });
  });

  describe("complex real-world scenarios", () => {
    it("should parse complex import error with all features", () => {
      const error = parseTranspileError(
        "file.tsx:45 Cannot find module '@emotion/react'. Did you mean: '@emotion/core'?",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("@emotion/react");
      expect(error.lineNumber).toBe(45);
      expect(error.suggestion).toBe("'@emotion/core'?");
    });

    it("should parse runtime error with component and line", () => {
      const error = parseTranspileError(
        "line 123: useState is not defined in <App>",
      );
      expect(error.type).toBe("runtime");
      expect(error.component).toBe("useState");
      expect(error.lineNumber).toBe(123);
    });

    it("should parse type error with suggestion", () => {
      const error = parseTranspileError(
        "Type 'string' is not assignable to type 'number'. Consider using Number()",
      );
      expect(error.type).toBe("type");
      expect(error.suggestion).toBe("using Number()");
    });

    it("should handle error with multiple quotes", () => {
      const error = parseTranspileError(
        "'Button' is not exported from '@/components'",
      );
      expect(error.type).toBe("import");
      expect(error.library).toBe("Button"); // Matches first quoted string
    });
  });
});

describe("categorizeErrorForNote", () => {
  describe("import errors", () => {
    it("should categorize import errors with library", () => {
      const error: StructuredError = {
        type: "import",
        message: "Cannot find module 'react'",
        library: "react",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("library");
      expect(result.tags).toEqual(["imports", "react"]);
    });

    it("should categorize import errors without library", () => {
      const error: StructuredError = {
        type: "import",
        message: "Cannot find module",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("library");
      expect(result.tags).toEqual(["imports", "unknown"]);
    });

    it("should use 'unknown' for empty library names", () => {
      const error: StructuredError = {
        type: "import",
        message: "Cannot find module",
        library: "",
      };
      const result = categorizeErrorForNote(error);
      expect(result.tags).toEqual(["imports", "unknown"]);
    });
  });

  describe("type errors", () => {
    it("should categorize type errors", () => {
      const error: StructuredError = {
        type: "type",
        message: "Type 'string' is not assignable to 'number'",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("pattern");
      expect(result.tags).toEqual(["types", "typescript"]);
    });
  });

  describe("transpile errors", () => {
    it("should categorize transpile errors", () => {
      const error: StructuredError = {
        type: "transpile",
        message: "Unexpected token",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("error_class");
      expect(result.tags).toEqual(["syntax", "transpile"]);
    });
  });

  describe("runtime errors", () => {
    it("should categorize runtime errors with component", () => {
      const error: StructuredError = {
        type: "runtime",
        message: "React is not defined",
        component: "React",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("pattern");
      expect(result.tags).toEqual(["runtime", "React"]);
    });

    it("should categorize runtime errors without component", () => {
      const error: StructuredError = {
        type: "runtime",
        message: "Cannot read property",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("pattern");
      expect(result.tags).toEqual(["runtime", "unknown"]);
    });

    it("should use 'unknown' for empty component names", () => {
      const error: StructuredError = {
        type: "runtime",
        message: "Error",
        component: "",
      };
      const result = categorizeErrorForNote(error);
      expect(result.tags).toEqual(["runtime", "unknown"]);
    });
  });

  describe("unknown errors", () => {
    it("should categorize unknown errors", () => {
      const error: StructuredError = {
        type: "unknown",
        message: "Something went wrong",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("error_class");
      expect(result.tags).toEqual(["unknown"]);
    });
  });

  describe("edge cases", () => {
    it("should handle errors with all optional fields", () => {
      const error: StructuredError = {
        type: "import",
        message: "Error",
        library: "lodash",
        component: "Button",
        lineNumber: 42,
        suggestion: "Try this",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("library");
      expect(result.tags).toEqual(["imports", "lodash"]);
    });

    it("should handle missing optional fields", () => {
      const error: StructuredError = {
        type: "type",
        message: "Type error",
      };
      const result = categorizeErrorForNote(error);
      expect(result.triggerType).toBe("pattern");
      expect(result.tags).toEqual(["types", "typescript"]);
    });
  });
});
