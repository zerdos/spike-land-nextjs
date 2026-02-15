// MCP Domain Worker: Orchestration
// Handles: context-architect, sandbox, orchestrator, lie-detector, req-interview, codebase-explain, decisions

const TOOLS = [
  // ── Context Architect Tools ──
  {
    name: "context_index_repo",
    description: "Index a GitHub repository file tree for later context packing. Stores file paths, sizes, and types in memory for the session.",
    category: "context-architect",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: { type: "string", description: "GitHub repository URL (e.g. https://github.com/owner/repo)" },
        branch: { type: "string", description: "Branch to index (default: main)" },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "context_pack",
    description: "Given an indexed repository and a task description, select the most relevant files. Scores files by keyword matching, boosts source directories, and penalizes test/config files.",
    category: "context-architect",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: { type: "string", description: "GitHub repository URL (must be indexed first)" },
        task_description: { type: "string", description: "Description of the task to find relevant files for" },
        max_files: { type: "number", description: "Maximum files to return (default: 20)" },
      },
      required: ["repo_url", "task_description"],
    },
  },
  {
    name: "context_get_deps",
    description: "Get the import/dependency graph for a specific file in an indexed repository. Parses import/from statements and finds sibling files.",
    category: "context-architect",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: { type: "string", description: "GitHub repository URL (must be indexed first)" },
        file_path: { type: "string", description: "File path within the repository (e.g. src/lib/utils.ts)" },
      },
      required: ["repo_url", "file_path"],
    },
  },
  // ── Sandbox Tools ──
  {
    name: "sandbox_create",
    description: "Create an ephemeral sandbox environment for code execution. Returns a sandbox ID for subsequent operations.",
    category: "sandbox",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Sandbox name (auto-generated if omitted)" },
        language: { type: "string", enum: ["typescript", "javascript", "python"], description: "Default language for code execution" },
      },
      required: [],
    },
  },
  {
    name: "sandbox_exec",
    description: "Execute code in a sandbox. Returns stdout, stderr, and exit code.",
    category: "sandbox",
    inputSchema: {
      type: "object",
      properties: {
        sandbox_id: { type: "string", description: "The sandbox ID" },
        code: { type: "string", description: "Code to execute" },
        language: { type: "string", enum: ["typescript", "javascript", "python"], description: "Language override (defaults to sandbox language)" },
      },
      required: ["sandbox_id", "code"],
    },
  },
  {
    name: "sandbox_read_file",
    description: "Read a file from the sandbox virtual filesystem.",
    category: "sandbox",
    inputSchema: {
      type: "object",
      properties: {
        sandbox_id: { type: "string", description: "The sandbox ID" },
        file_path: { type: "string", description: "Path of the file to read" },
      },
      required: ["sandbox_id", "file_path"],
    },
  },
  {
    name: "sandbox_write_file",
    description: "Write a file to the sandbox virtual filesystem.",
    category: "sandbox",
    inputSchema: {
      type: "object",
      properties: {
        sandbox_id: { type: "string", description: "The sandbox ID" },
        file_path: { type: "string", description: "Path of the file to write" },
        content: { type: "string", description: "File content to write" },
      },
      required: ["sandbox_id", "file_path", "content"],
    },
  },
  {
    name: "sandbox_destroy",
    description: "Destroy a sandbox and free its resources. Returns summary statistics.",
    category: "sandbox",
    inputSchema: {
      type: "object",
      properties: {
        sandbox_id: { type: "string", description: "The sandbox ID to destroy" },
      },
      required: ["sandbox_id"],
    },
  },
  // ── Orchestrator Tools ──
  {
    name: "orchestrator_create_plan",
    description: "Create an execution plan from a task description with ordered subtasks and dependency tracking.",
    category: "orchestrator",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "High-level task description" },
        subtasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Subtask description" },
              dependencies: { type: "array", items: { type: "string" }, description: "IDs of subtasks this depends on" },
            },
            required: ["description"],
          },
          description: "List of subtasks to execute",
        },
        context: { type: "string", description: "Optional repo/project context" },
      },
      required: ["description", "subtasks"],
    },
  },
  {
    name: "orchestrator_dispatch",
    description: "Mark a plan's ready subtasks as dispatched. Only subtasks whose dependencies are all completed will be dispatched.",
    category: "orchestrator",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "orchestrator_status",
    description: "Get current status of all subtasks in a plan.",
    category: "orchestrator",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "orchestrator_submit_result",
    description: "Submit the result of a completed subtask. Updates subtask status and may auto-complete or auto-fail the plan.",
    category: "orchestrator",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan ID" },
        subtask_id: { type: "string", description: "The subtask ID" },
        status: { type: "string", enum: ["completed", "failed"], description: "Result status" },
        result: { type: "string", description: "The result text" },
        error: { type: "string", description: "Error message if failed" },
      },
      required: ["plan_id", "subtask_id", "status", "result"],
    },
  },
  {
    name: "orchestrator_merge",
    description: "Merge all completed subtask results into a final output in dependency order.",
    category: "orchestrator",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan ID" },
      },
      required: ["plan_id"],
    },
  },
  // ── Lie Detector Tools ──
  {
    name: "verify_syntax",
    description: "Check code for syntax errors using heuristic pattern analysis. Detects unbalanced brackets, unterminated strings, and common issues.",
    category: "lie-detector",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Source code to verify" },
        language: { type: "string", enum: ["typescript", "javascript"], description: "Programming language" },
      },
      required: ["code"],
    },
  },
  {
    name: "verify_tests",
    description: "Parse test runner output and extract structured results including pass/fail counts, duration, and failure details.",
    category: "lie-detector",
    inputSchema: {
      type: "object",
      properties: {
        test_output: { type: "string", description: "Raw output from vitest or jest" },
        format: { type: "string", enum: ["vitest", "jest"], description: "Test runner format" },
      },
      required: ["test_output"],
    },
  },
  {
    name: "verify_spec_match",
    description: "Compare code or output against a structured specification. Checks each requirement for keyword/pattern matches and returns a match score.",
    category: "lie-detector",
    inputSchema: {
      type: "object",
      properties: {
        spec: {
          type: "object",
          properties: {
            requirements: { type: "array", items: { type: "string" }, description: "List of requirements to check" },
          },
          required: ["requirements"],
          description: "Specification with requirements",
        },
        output: { type: "string", description: "The code or result to verify against the spec" },
        strict: { type: "boolean", description: "If true, require stronger matches" },
      },
      required: ["spec", "output"],
    },
  },
  // ── Requirements Interview Tools ──
  {
    name: "interview_start",
    description: "Start a BAZDMEG requirements interview session. Creates an interview with 7 structured questions that must be answered before a specification can be generated.",
    category: "req-interview",
    inputSchema: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "Name of the project being specified." },
        initial_description: { type: "string", description: "Brief description of what the project should accomplish." },
      },
      required: ["project_name", "initial_description"],
    },
  },
  {
    name: "interview_submit",
    description: "Submit answers to BAZDMEG interview questions. You may answer one or several questions at a time.",
    category: "req-interview",
    inputSchema: {
      type: "object",
      properties: {
        interview_id: { type: "string", description: "ID of the interview session." },
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_id: { type: "string", description: "The question ID to answer (e.g. 'problem', 'data')." },
              answer: { type: "string", description: "The answer text." },
            },
            required: ["question_id", "answer"],
          },
          description: "Array of answers to submit.",
        },
      },
      required: ["interview_id", "answers"],
    },
  },
  {
    name: "interview_generate_spec",
    description: "Generate a structured specification from a completed BAZDMEG interview. All 7 questions must be answered first.",
    category: "req-interview",
    inputSchema: {
      type: "object",
      properties: {
        interview_id: { type: "string", description: "ID of the completed interview session." },
      },
      required: ["interview_id"],
    },
  },
  // ── Codebase Explain Tools ──
  {
    name: "explain_overview",
    description: "Get a high-level codebase overview from file listing and package.json. Detects tech stack, analyzes directory structure, and provides statistics.",
    category: "codebase-explain",
    inputSchema: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string" }, description: "List of file paths in the repository" },
        package_json: { type: "string", description: "Contents of package.json if available" },
      },
      required: ["files"],
    },
  },
  {
    name: "explain_module",
    description: "Deep dive into a specific module. Analyzes purpose, exports, dependencies, and patterns from its files and optional entry content.",
    category: "codebase-explain",
    inputSchema: {
      type: "object",
      properties: {
        module_path: { type: "string", description: "Path to the module directory" },
        files: { type: "array", items: { type: "string" }, description: "Files within the module" },
        entry_content: { type: "string", description: "Content of the module's index/main file" },
      },
      required: ["module_path", "files"],
    },
  },
  {
    name: "explain_flow",
    description: "Trace execution flow from source code. Extracts imports, exports, function definitions, and builds a dependency chain.",
    category: "codebase-explain",
    inputSchema: {
      type: "object",
      properties: {
        file_content: { type: "string", description: "Source code content" },
        file_path: { type: "string", description: "File path for context" },
      },
      required: ["file_content", "file_path"],
    },
  },
  // ── Decisions ADR Tools ──
  {
    name: "decision_record",
    description: "Record an Architecture Decision Record (ADR) for tracking decisions made during development.",
    category: "decisions",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Decision title" },
        context: { type: "string", description: "Why this decision was needed" },
        decision: { type: "string", description: "What was decided" },
        consequences: { type: "string", description: "Positive and negative outcomes" },
        status: { type: "string", enum: ["proposed", "accepted", "deprecated", "superseded"], description: "Decision status" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
      },
      required: ["title", "context", "decision", "consequences"],
    },
  },
  {
    name: "decision_list",
    description: "List all Architecture Decision Records with optional filtering by status or tag.",
    category: "decisions",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["proposed", "accepted", "deprecated", "superseded"], description: "Filter by decision status" },
        tag: { type: "string", description: "Filter by tag" },
        limit: { type: "number", description: "Maximum results" },
      },
      required: [],
    },
  },
  {
    name: "decision_get",
    description: "Get full details of a specific Architecture Decision Record in markdown format.",
    category: "decisions",
    inputSchema: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "The decision ID" },
      },
      required: ["decision_id"],
    },
  },
  {
    name: "decision_query",
    description: "Search Architecture Decision Records by keyword across title, context, and decision fields.",
    category: "decisions",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword(s)" },
        limit: { type: "number", description: "Maximum results" },
      },
      required: ["query"],
    },
  },
];

// Build lookup
const TOOL_MAP = new Map(TOOLS.map(t => [t.name, t]));

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();

    if (body.method === "list_tools") {
      return Response.json({ tools: TOOLS });
    }

    if (body.method === "call_tool") {
      const { toolName, args, userId } = body;
      const tool = TOOL_MAP.get(toolName);
      if (!tool) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
            isError: true,
          },
        });
      }

      // Proxy to Next.js backend
      try {
        const nextUrl = env.NEXT_APP_URL || "https://spike.land";
        const response = await fetch(`${nextUrl}/api/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-mcp-user-id": userId || "",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: toolName, arguments: args || {} },
          }),
        });
        const data = await response.json();
        return Response.json({ result: data.result || data });
      } catch (err) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Error calling ${toolName}: ${err.message}` }],
            isError: true,
          },
        });
      }
    }

    return Response.json({ error: "Unknown method" }, { status: 400 });
  },
};
