# How to Not Produce AI Slop: A Framework

_By Zoltan Erdos | Brighton, UK | January 2026_

In my last post, I confessed something embarrassing. When I joined a new team in 2025, my pull requests were pure AI slop. Even when I tried my best to avoid it.

Many of you asked me: "Okay, you messed up. But what do you do now? How do you use AI without producing garbage?"

Fair question. Here is my framework.

## What AI Slop Actually Looks Like

Let me paint the picture.

You open a PR. The code looks clean. The variable names are good. The structure seems professional. The tests pass. The linter is happy.

But something is wrong.

The code follows patterns that nobody uses anymore. It makes assumptions about the database that are not true. It calls a function in a way that "works" but breaks in edge cases that only your teammates know about.

This is AI slop. It is not broken code. It is code built on broken assumptions. It looks right. It feels right. But it does not fit.

The scary part? You cannot tell. Not when you are new. Not when you trusted the AI to understand the codebase better than you did.

## Why This Happens

Here is the core problem.

When you ask an AI to write code, it looks at your codebase. It sees patterns. It makes guesses. Then it writes code based on those guesses.

Most of the time, the AI is smart. It makes good guesses. The code works.

But sometimes the AI is wrong. And as a new developer on a legacy codebase, you have no way to verify what the AI assumed.

The AI sees an old function. It assumes that function still works the same way. But a teammate refactored it six months ago. The AI does not know. You do not know either.

The AI follows a pattern it found in one file. But that pattern is deprecated. The team moved on. The AI cannot tell. Neither can you.

This is the trap. The AI gives you confidence you have not earned.

## The Framework: Documentation First

After I realized my mistake, I built a system. It is simple but it works.

**Step one: Create documentation on your own machine.**

Before I write any code, I create a personal knowledge base. I document everything I learn about the codebase. Every conversation with a teammate. Every weird pattern I discover. Every "aha" moment.

This documentation lives on my machine. It is my safety net. When the AI makes a suggestion, I check it against my notes.

Why does this work? Because the AI does not have your context. It does not know what your teammates told you. It does not know the decisions made in yesterday's meeting. But you do. Write it down.

**Step two: Create small scripts to verify assumptions.**

I write tiny scripts that test my understanding. Quick checks. Simple validations.

Does this function actually return what I think it returns? Let me write a three-line script to find out.

Does this API behave the way the AI assumed? Let me call it and see.

These scripts take five minutes. They save hours of back-and-forth in code review.

## Testing as Your Defense

This is the biggest change I made. I now write tests before I write code.

Not because test-driven development is trendy. Because tests force me to understand the problem.

Think about it. To write a test, you must know what the code should do. You must understand the inputs. You must understand the outputs. You must think about edge cases.

If you cannot write the test, you do not understand the problem. And if you do not understand the problem, you should not ask the AI to write the solution.

**Unit tests catch the small lies.** They verify that each piece works alone.

**End-to-end tests catch the big lies.** They verify that the pieces work together.

When my tests pass, I have proof. Not hope. Proof.

Here is my rule now: No PR goes up without tests. Period. If I cannot test it, I do not ship it.

## TypeScript as Your Guardrail

Let me tell you about TypeScript.

I used to think strict TypeScript was annoying. All those type errors. All that extra work.

I was wrong.

Strict TypeScript is your first line of defense against AI slop. Here is why.

The AI writes code. The code looks correct. But the AI made an assumption about a data type. It assumed a field would always exist. It assumed an array would never be empty. It assumed a string would always be a valid UUID.

With loose typing, this code runs. It fails at runtime. In production. With angry users.

With strict TypeScript, the compiler catches this immediately. It says: "No, this field could be undefined. Handle that case."

The AI gets caught. Before the code review. Before the deployment. Before the incident report.

**If you have proper TypeScript setup and testing setup, you will not have AI slop issues.** I say this from experience. The types and tests catch what you miss.

Set TypeScript to strict mode. Enable all the rules that feel annoying. They are annoying because they are catching real problems.

## The Checklist: Before You Submit That PR

Here is what I check now, every single time.

**Before I ask the AI for help:**

- [ ] Can I explain the problem in my own words?
- [ ] Do I understand why the current code exists?
- [ ] Have I checked my documentation for relevant context?

**After the AI writes code:**

- [ ] Can I explain every line to a teammate?
- [ ] Have I verified the AI's assumptions with my scripts?
- [ ] Do I know why the AI chose this approach?

**Before I create the PR:**

- [ ] Do my unit tests prove the code works?
- [ ] Do my end-to-end tests prove the feature works?
- [ ] Does TypeScript pass with no errors in strict mode?
- [ ] Can I answer "why" for every decision?

If any answer is "no," I stop. I go back. I learn more.

## The Speed Paradox

You might think this framework makes you slow. All this documentation. All this testing. All this verification.

Actually, the opposite is true.

With the right level of testing and process, you can develop software at incredible speed with quality. Not just fast. Fast and good.

Here is why. When your PR is clean, it gets approved fast. No back-and-forth. No "why did you do this?" No "we stopped using that pattern last year."

One clean PR beats five sloppy ones. Every time.

## What I Want You to Take Away

AI coding tools are incredible. They have changed my work forever. I use them every single day.

But they are tools. Not magic. Not shortcuts.

The framework is simple:

1. Document what you learn
2. Write scripts to verify assumptions
3. Write tests before code
4. Use strict TypeScript
5. Check every assumption before you ship

Do this, and your PRs will not be AI slop. They will be your work, enhanced by AI.

That is the difference that matters.

---

_Zoltan Erdos is a developer based in Brighton, UK, building spike.land. He shares what he learns about working with AI coding tools._
