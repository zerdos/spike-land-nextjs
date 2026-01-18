# MCP Tools Reference

This document provides a complete reference for all MCP (Model Context Protocol)
tools available in the spike.land codeSpace system.

---

## Table of Contents

- [Overview](#overview)
- [Connection](#connection)
- [Read Tools](#read-tools)
- [Edit Tools](#edit-tools)
- [Find Tools](#find-tools)
- [Auto-Transpilation](#auto-transpilation)
- [Adding Custom Tools](#adding-custom-tools)
- [Error Handling](#error-handling)

---

## Overview

The MCP server implements the JSON-RPC 2.0 protocol, allowing AI agents to
interact with codeSpaces programmatically.

### Key Principles

1. **Read before write**: Always read current state before making changes
2. **Use edit_code for most changes**: More efficient than update_code
3. **Auto-transpilation**: All edit operations trigger automatic transpilation
4. **Atomic updates**: Changes are broadcast to all connected clients

### Tool Categories

| Category | Tools                                      | Purpose        |
| -------- | ------------------------------------------ | -------------- |
| Read     | read_code, read_html, read_session         | Retrieve data  |
| Edit     | edit_code, update_code, search_and_replace | Modify code    |
| Find     | find_lines                                 | Locate content |

---

## Connection

### Endpoint

```
POST https://testing.spike.land/live/{codeSpace}/mcp
Content-Type: application/json
```

### JSON-RPC Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "codeSpace": "your-codespace"
      // ... tool-specific arguments
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{...result JSON...}"
      }
    ]
  }
}
```

---

## Read Tools

### read_code

**Purpose**: Get the current source code from a codeSpace.

**When to use**: Before making any changes. Always read first to understand
the current state.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to read code from"
    }
  },
  "required": ["codeSpace"]
}
```

**Example Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_code",
    "arguments": {
      "codeSpace": "my-app"
    }
  }
}
```

**Response**:

```json
{
  "code": "export default function App() {\n  return <div>Hello</div>;\n}",
  "codeSpace": "my-app"
}
```

---

### read_html

**Purpose**: Get the current rendered HTML output.

**When to use**: To verify rendering results after making changes.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to read HTML from"
    }
  },
  "required": ["codeSpace"]
}
```

**Response**:

```json
{
  "html": "<div>Hello</div>",
  "codeSpace": "my-app"
}
```

---

### read_session

**Purpose**: Get complete session data (code, HTML, CSS).

**When to use**: Debugging or when you need all session information. Use
sparingly as it returns more data.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to read session from"
    }
  },
  "required": ["codeSpace"]
}
```

**Response**:

```json
{
  "code": "export default function App() {...}",
  "html": "<div>...</div>",
  "css": ".component { ... }",
  "codeSpace": "my-app"
}
```

---

## Edit Tools

### edit_code

**Purpose**: Make precise line-based edits to the code.

**When to use**: Most common tool for making changes. More efficient than
update_code for targeted modifications.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to edit code in"
    },
    "edits": {
      "type": "array",
      "description": "Array of line edits to apply",
      "items": {
        "type": "object",
        "properties": {
          "startLine": {
            "type": "number",
            "description": "Starting line number (1-based)"
          },
          "endLine": {
            "type": "number",
            "description": "Ending line number (1-based)"
          },
          "newContent": {
            "type": "string",
            "description": "New content for the specified lines"
          }
        },
        "required": ["startLine", "endLine", "newContent"]
      }
    }
  },
  "required": ["codeSpace", "edits"]
}
```

**Example - Single Line Edit**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "edit_code",
    "arguments": {
      "codeSpace": "my-app",
      "edits": [
        {
          "startLine": 5,
          "endLine": 5,
          "newContent": "const newValue = 'updated';"
        }
      ]
    }
  }
}
```

**Example - Multi-Line Replacement**:

```json
{
  "edits": [
    {
      "startLine": 10,
      "endLine": 15,
      "newContent": "// New function\nfunction helper() {\n  return 'refactored';\n}"
    }
  ]
}
```

**Example - Delete Lines**:

```json
{
  "edits": [
    {
      "startLine": 8,
      "endLine": 10,
      "newContent": ""
    }
  ]
}
```

**Example - Multiple Edits**:

```json
{
  "edits": [
    {
      "startLine": 1,
      "endLine": 1,
      "newContent": "// File header comment"
    },
    {
      "startLine": 20,
      "endLine": 22,
      "newContent": "// Refactored section\nif (condition) {\n  doSomething();\n}"
    }
  ]
}
```

**Response**:

```json
{
  "success": true,
  "message": "Code edited and transpiled successfully.",
  "codeSpace": "my-app",
  "diff": "@@ -1,3 +1,4 @@\n+// File header comment\n export default...",
  "linesChanged": 2,
  "requiresTranspilation": false
}
```

---

### update_code

**Purpose**: Replace ALL code with new content.

**When to use**: Only for complete rewrites. For smaller changes, use
edit_code or search_and_replace instead.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to update code in"
    },
    "code": {
      "type": "string",
      "description": "The complete new code to replace ALL existing code"
    }
  },
  "required": ["codeSpace", "code"]
}
```

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "update_code",
    "arguments": {
      "codeSpace": "my-app",
      "code": "export default function App() {\n  return <div className=\"p-4\">Completely new code</div>;\n}"
    }
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Code updated and transpiled successfully (142 chars).",
  "codeSpace": "my-app",
  "requiresTranspilation": false
}
```

---

### search_and_replace

**Purpose**: Replace patterns without needing line numbers.

**When to use**: Best for simple text replacements. Most efficient when you
know the exact text to find.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to perform search and replace in"
    },
    "search": {
      "type": "string",
      "description": "Text or pattern to search for"
    },
    "replace": {
      "type": "string",
      "description": "Replacement text"
    },
    "isRegex": {
      "type": "boolean",
      "description": "Whether search is a regular expression (default: false)"
    },
    "global": {
      "type": "boolean",
      "description": "Replace all occurrences (default: true)"
    }
  },
  "required": ["codeSpace", "search", "replace"]
}
```

**Example - Text Replacement**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_and_replace",
    "arguments": {
      "codeSpace": "my-app",
      "search": "Hello World",
      "replace": "Welcome"
    }
  }
}
```

**Example - Regex Replacement**:

```json
{
  "search": "console\\.log\\([^)]+\\)",
  "replace": "// removed debug log",
  "isRegex": true,
  "global": true
}
```

**Response**:

```json
{
  "success": true,
  "message": "Made 3 replacement(s). Code transpiled and updated.",
  "replacements": 3,
  "search": "Hello World",
  "replace": "Welcome",
  "isRegex": false,
  "global": true,
  "codeSpace": "my-app",
  "requiresTranspilation": false
}
```

---

## Find Tools

### find_lines

**Purpose**: Find line numbers containing a search pattern.

**When to use**: Before using edit_code to locate the exact lines to modify.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "codeSpace": {
      "type": "string",
      "description": "The codeSpace identifier to search in"
    },
    "pattern": {
      "type": "string",
      "description": "Pattern to search for"
    },
    "isRegex": {
      "type": "boolean",
      "description": "Whether pattern is a regular expression (default: false)"
    }
  },
  "required": ["codeSpace", "pattern"]
}
```

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "find_lines",
    "arguments": {
      "codeSpace": "my-app",
      "pattern": "useState"
    }
  }
}
```

**Response**:

```json
{
  "pattern": "useState",
  "isRegex": false,
  "matches": [
    {
      "lineNumber": 3,
      "content": "  const [count, setCount] = useState(0);",
      "matchText": "useState"
    },
    {
      "lineNumber": 4,
      "content": "  const [name, setName] = useState('');",
      "matchText": "useState"
    }
  ],
  "totalMatches": 2,
  "codeSpace": "my-app"
}
```

---

## Auto-Transpilation

### How It Works

All edit operations automatically trigger transpilation:

1. **Code modified** via edit_code, update_code, or search_and_replace
2. **Server sends code** to js.spike.land transpiler
3. **Transpiled code** returned and stored in session
4. **Session broadcast** to all connected clients
5. **Live preview updates** immediately

### Transpilation Headers

```typescript
// Server-side transpilation request
const response = await fetch("https://js.spike.land", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "TR_ORIGIN": origin, // e.g., "https://testing.spike.land"
  },
  body: code,
});
```

### Response Indicators

```json
{
  "success": true,
  "requiresTranspilation": false // false = transpilation completed
}
```

If `requiresTranspilation` is `true`, transpilation failed but the code was
still saved. The client can trigger re-transpilation on next load.

---

## Adding Custom Tools

### Tool Definition Structure

**Location**: `packages/testing.spike.land/src/mcp/tools/`

```typescript
export const myCustomTool: McpTool = {
  name: "my_custom_tool",
  description: "Clear description of what this tool does",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier",
      },
      customParam: {
        type: "string",
        description: "Description of parameter",
      },
    },
    required: ["codeSpace", "customParam"],
  },
};
```

### Implementation Pattern

```typescript
export async function executeMyCustomTool(
  session: ICodeSession,
  codeSpace: string,
  customParam: string,
  updateSession: (session: ICodeSession) => Promise<void>,
  origin?: string,
): Promise<MyCustomResult> {
  // 1. Validate input
  if (!customParam) {
    throw new Error("customParam is required");
  }

  // 2. Perform operation
  const result = processCustomLogic(session, customParam);

  // 3. Update session if needed
  if (result.modified) {
    await updateSession({
      ...session,
      code: result.newCode,
    });
  }

  // 4. Return result
  return {
    success: true,
    message: "Operation completed",
    data: result.data,
    codeSpace,
  };
}
```

### Registration

Add to `mcp/handler.ts`:

```typescript
import { myCustomTool, executeMyCustomTool } from "./tools/my-tools";

// In tool list
const allTools = [...readTools, ...editTools, ...findTools, myCustomTool];

// In handler switch
case "my_custom_tool":
  return executeMyCustomTool(
    session,
    args.codeSpace,
    args.customParam,
    updateSession,
    origin,
  );
```

---

## Error Handling

### Common Errors

| Error                          | Cause                      | Solution                          |
| ------------------------------ | -------------------------- | --------------------------------- |
| `codeSpace is required`        | Missing codeSpace argument | Include codeSpace in all requests |
| `Line numbers must be 1-based` | Line number < 1            | Use 1-based line numbers          |
| `End line exceeds code length` | Line number too high       | Check code length first           |
| `Overlapping edits detected`   | Edit ranges overlap        | Ensure edits don't overlap        |
| `Invalid regex pattern`        | Bad regex syntax           | Validate regex before sending     |
| `Transpilation failed`         | Code syntax error          | Check code for syntax errors      |

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error: Line numbers must be 1-based and positive"
  }
}
```

### Validation Rules

**edit_code validations**:

- Line numbers must be positive (>= 1)
- startLine must be <= endLine
- endLine must not exceed total lines
- Edit ranges must not overlap

**search_and_replace validations**:

- Regex patterns must be valid
- Empty search strings are not allowed

---

## Workflow Examples

### Example 1: Add a New Function

```
1. read_code → Get current code
2. find_lines pattern="export default" → Find where to add
3. edit_code → Insert new function before export
```

### Example 2: Rename a Variable

```
1. read_code → Get current code
2. search_and_replace search="oldName" replace="newName" global=true
```

### Example 3: Refactor a Section

```
1. read_code → Get current code
2. find_lines pattern="// Section to refactor" → Get line numbers
3. edit_code startLine=X endLine=Y newContent="refactored code"
```

---

## Related Documentation

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) - MCP workflow overview
- [mcpExtensionGuide.md](../src/mcpExtensionGuide.md) - Original extension guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
