# Principle 4: Test The Lies

**Core idea:** If you cannot write the test, you do not understand the problem. And if you do not understand the problem, you should not ask the AI to write the solution.

---

## The Three Lies Framework

### Small Lies -- Unit Tests

Unit tests catch the small lies. They verify that each piece works alone.
- A function returns the right value
- A validation rejects the wrong input
- A calculation produces the correct result

### Big Lies -- End-to-End Tests

E2E tests catch the big lies. They verify that the pieces work together.
- The user can navigate from login to checkout
- The payment flow handles declined cards
- The email change requires confirmation

### Human Lies -- Agent-Based Tests

Agent-based tests catch the human lies. They verify that real users can actually use the feature.
- The agent spins up a browser
- Logs in with test credentials
- Navigates to the feature
- Clicks buttons, fills forms
- Takes screenshots, compares with Figma
- Catches bugs that unit tests miss because it tests like a human tests

**When all three types pass, you have proof. Not hope. Proof.**

---

## The Hourglass Testing Model

The testing pyramid was designed for humans writing code by hand. AI changes the economics.

```
         +---------------------+
         |   E2E Specs (heavy)  |  <-- Humans write these
         |   User flows as       |
         |   Given/When/Then     |
         +----------+-----------+
                    |
            +-------v-------+
            |  UI Code       |  <-- AI generates this
            |  (thin,        |    Disposable.
            |   disposable)  |    Regenerate, don't fix.
            +-------+-------+
                    |
    +---------------v---------------+
    |  Business Logic Tests (heavy)  |  <-- MCP tools + unit tests
    |  Validation, contracts, state   |    Bulletproof.
    |  transitions, edge cases        |    Never skip.
    +-------------------------------+
```

### Distribution

| Layer | Share | What to test |
|-------|-------|-------------|
| MCP tool tests | 70% | Every user story becomes an MCP tool with typed schema, handler, and structured response. Tests run in milliseconds. They never flake. No DOM, no network, no animation timing. |
| E2E specs | 20% | Written in Given/When/Then format. Verify full user flows through actual UI, but only verify wiring. Business logic is already proven. |
| UI component tests | 10% | Only what is unique to UI: accessibility, responsive layout, animation behavior, keyboard navigation. If the test asserts a business rule, it belongs in the MCP tool test. |

**You have not lost any coverage. You have lost the browser.**

---

## Test Type Decision Guide

| Question | If Yes | If No |
|----------|--------|-------|
| Does it test a business rule? | MCP tool test | Continue |
| Does it test a user flow end-to-end? | E2E spec | Continue |
| Does it test UI-specific behavior? | UI component test | It probably does not need a test |
| Is the test flaky? | Fix it or delete it | Keep it |
| Does the test assert on DOM structure? | Move logic to MCP tool test | Keep as UI test |

---

## Actionable Takeaways

1. To write a test, you must understand the code. Tests prove understanding.
2. Use the Three Lies Framework: unit (small), E2E (big), agent-based (human).
3. Follow the Hourglass Model: heavy on business logic, light on UI.
4. 70% MCP tool tests, 20% E2E, 10% UI component tests.
5. If a test is flaky, fix it or delete it. Flaky tests gaslight the AI.

---

*Sources: Blog posts 08 (How to Not Produce AI Slop), The Testing Pyramid Is Upside Down, Think Slowly Ship Fast*
