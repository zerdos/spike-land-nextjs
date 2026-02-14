# Principle 5: Orchestrate, Do Not Operate

**Core idea:** You do not have a copilot anymore. You have a whole dev team. Coordinate agents, not keystrokes.

---

## The Production Pipeline

| Phase | Who Does It | Why |
|-------|------------|-----|
| **Planning** | Claude Code (multiple agents) | Explores codebase, interviews you, considers edge cases |
| **Implementation** | Jules | Follows the plan exactly, adds the tests the plan specifies |
| **CI/CD** | Your pipeline | Fast feedback, sharded tests, cached builds |
| **Code Review** | Claude Code (Opus) | Strict. Consistently catches real issues |
| **Fixes** | Jules | Iterates until CI and review both pass |
| **Merge** | Automated | When all checks are green |

**Your job:** Define what you want. Verify it works. That is it.

---

## BMAD: Agent Personas with Context Isolation

BMAD -- Breakthrough Method of Agile AI-Driven Development -- defines six agent personas:
1. **PM** -- Requirements and priorities
2. **Architect** -- Technical design and constraints
3. **Developer** -- Implementation
4. **QA** -- Testing and verification
5. **Scrum Master** -- Process and coordination
6. **Product Owner** -- User value and acceptance

Each persona gets a fresh context window with only the artifacts it needs. No accumulated junk. No 50K-token mega-prompts.

### Epic Sharding

Instead of stuffing an entire feature into one agent context, break it into vertical slices. Each slice gets its own ticket, its own context, its own agent.

**Token reduction: 74-90% fewer tokens** per agent context compared to monolithic prompts.

---

## Darwinian Fix Loops

The agent loop is natural selection for code:

1. **Generate** (mutation) -- AI produces code
2. **Transpile** (environmental test) -- Does it compile?
3. **Fix** (adaptation) -- Address errors
4. **Learn** (heritable memory) -- Extract and store lessons

Up to 3 iterations per request.

### Bayesian Memory System

The memory system prevents errors from recurring across all future generations:

1. Every error gets extracted as a learning note by Haiku
2. Each note starts as a **CANDIDATE** with 0.5 confidence
3. Notes that help get promoted: **ACTIVE** at >0.6 confidence after 3+ helps
4. Notes that fail get deprecated: **DEPRECATED** below 0.3 after 5+ observations

**Results:**
- First-try success rate: ~40% -> ~65%
- Success after retries: ~55% -> ~85%

Natural selection, running on softmax.

---

## Actionable Takeaways

1. Stop operating (typing code). Start orchestrating (defining and verifying).
2. Use the production pipeline: plan -> implement -> test -> review -> fix -> merge.
3. Give each agent persona its own context. Avoid mega-prompts.
4. Shard epics into vertical slices. Each slice = one ticket, one agent.
5. Let fix loops iterate. Up to 3 tries before escalating.
6. Build a learning memory system so errors do not recur.

---

*Sources: Blog posts 04 (2025: The Year Agents Outperformed), 07 (Context Engineering Replaced Coding), The Vibe Coding Paradox, How to Automate Your Dev Team with AI Agents*
