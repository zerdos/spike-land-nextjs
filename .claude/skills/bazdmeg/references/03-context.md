# Principle 3: Context Is Architecture

**Core idea:** What the model knows when you ask determines the quality of what it produces.

---

## The Skill That Matters Most

Nobody taught this in school. Nobody warned you in bootcamp. Nobody mentioned it in your CS degree.

Context engineering is the skill of giving AI everything it needs to succeed. You provide the history. You explain the patterns. You describe the constraints. You share the "why" behind every decision.

When you do this well, the assistant produces amazing work. When you do it poorly, you get AI slop -- code that looks correct but breaks everything.

---

## The 5-Layer Context Stack

| Layer | What It Provides | Example |
|-------|-----------------|---------|
| **Identity** | Who is the AI in this interaction | "Senior TypeScript developer on a Next.js 15 app with App Router" |
| **Knowledge** | What the model knows about your situation | Learning notes, codebase patterns, domain specifics |
| **Examples** | Calibration data for expected output | Skill prompts, reference implementations, matched by category |
| **Constraints** | Boundary conditions and rules | Output spec, fix rules, what NOT to do |
| **Tools** | What the AI can observe and act on | Transpiler, codespace API, MCP servers, test runners |

Each layer builds on the previous. Missing a layer means the AI fills the gap with assumptions -- and assumptions produce slop.

---

## CLAUDE.md: The Most Important File You Write All Week

Your CLAUDE.md contains everything the AI needs to know about the project:
- Directory structure
- Tech stack
- Testing requirements
- CI/CD pipeline
- Git workflow
- Coding conventions

When the AI reads this file, it stops guessing. It follows the playbook. It writes code that fits the codebase.

**This is context engineering.** Build the context once, and every interaction with the AI benefits.

---

## NotebookLM Accelerated Learning

For accelerating domain knowledge acquisition:

1. Feed all relevant documentation to NotebookLM (Confluence, code comments, API docs, architecture diagrams)
2. Generate:
   - **Tutorials** that walk through the domain step by step
   - **System diagrams** that visualize how pieces connect
   - **Flashcards** for memorizing key concepts
   - **Quizzes** to test understanding
3. Master domain knowledge in days instead of weeks

This technique was born from the basket API mistake -- if the developer had understood the domain, the AI's hallucination would have been caught immediately.

---

## Actionable Takeaways

1. Before asking the AI for code, check every layer of the context stack.
2. Invest time in CLAUDE.md -- it pays dividends on every interaction.
3. Use NotebookLM (or similar tools) to accelerate domain learning.
4. Bad context in = bad code out. Good context in = production code out.
5. Context engineering is now more important than coding itself.

---

*Sources: Blog posts 07 (Context Engineering Replaced Coding), 08 (How to Not Produce AI Slop), 09 (New Developer Onboarding AI Edition), Context Engineering Your Zero-Shot Prompt, How Claude Code Engineers Context*
