# Context Engineering: The Skill That Replaced Coding

_By Zoltan Erdos | Brighton, UK | January 2026_

Nobody taught you this in school. Nobody warned you in your bootcamp. Nobody mentioned it in your computer science degree.

But this skill now matters more than coding itself.

It is called context engineering. And in 2025, it quietly became the most important skill in software development.

## What Is Context Engineering?

Let me explain with a simple example.

Imagine you hire a brilliant assistant. This assistant can write code faster than any human. They know every programming language. They understand complex algorithms. They never get tired.

But there is a catch. This assistant knows nothing about your project. Nothing about your team. Nothing about the decisions you made last month. Nothing about why that strange function exists in line 47.

If you just say "write me a login feature," this brilliant assistant will write something. It might even look perfect. But it will probably be wrong. Wrong for your codebase. Wrong for your team's patterns. Wrong for your business needs.

Context engineering is the skill of giving this assistant everything it needs to succeed.

You provide the history. You explain the patterns. You describe the constraints. You share the "why" behind every decision.

When you do this well, the assistant produces amazing work. When you do it poorly, you get what we call "AI slop" - code that looks correct but breaks everything.

## The New Abstractions

2025 was the year everything changed. Not because AI got smarter. It did. But more importantly, we got new ways to give AI context.

Let me explain the new tools.

**MCP Servers** (Model Context Protocol) are like translators between AI and your systems. They let AI access your databases, your APIs, your documentation. The AI does not need to guess what data exists. It can look directly. This sounds simple. It changes everything.

**Tools and plugins** are actions the AI can take. Read a file. Run a test. Check a build. Deploy code. Instead of just writing text, the AI can actually do things. It can verify its own work.

**Subagents** are smaller AI workers that handle specific tasks. One might specialize in testing. Another in documentation. Another in security. They work together like a team. The main AI coordinates them.

**Skills** are packaged knowledge. A skill might contain everything needed to deploy to Cloudflare. Or everything needed to write proper database migrations. You give the AI a skill, and it knows how to handle that domain.

These are not just technical features. They are new ways to provide context. Each one lets you give AI more information about what you actually need.

## Why It Matters

Here is what I learned in 2025: coding agents outperform developers. But only if they have the right context and instructions.

Read that again. It is important.

The AI is already better at writing code than most humans. Faster. More consistent. Fewer typos. Better error handling.

But the AI can only work with what you give it.

If you give it vague requirements, you get vague code. If you give it wrong assumptions, you get wrong code. If you give it incomplete context, you get incomplete solutions.

When my AI agent makes mistakes now, I do not blame the AI. I ask myself: what context did I fail to provide? What requirement was unclear? What assumption did I leave unexplained?

The issue is never the AI's coding ability. The issue is always my context engineering.

This changes who succeeds in software development. The best developers are no longer the ones who type fastest. They are the ones who explain clearest.

## How to Get Good at Context Engineering

I have been practicing this skill every day for over a year. Here is what I learned.

**Write better requirements.** Before you ask AI to code anything, write down exactly what you need. Not how to build it. What it should do. What it should not do. What constraints exist. What edge cases matter. Be specific. Be complete.

**Document your decisions.** Every time you make an architectural choice, write it down. Not just what you decided. Why you decided it. AI reads your documentation. Make it useful.

**Create clear instructions.** Tell the AI about your patterns. What libraries do you use? What coding style do you prefer? What mistakes should it avoid? Put this in files the AI can reference. In my projects, I use a file called CLAUDE.md. It contains everything the AI needs to know.

**Test your context.** Give your AI a small task. Review the output carefully. Did it make assumptions you did not expect? Add that context. Did it miss a pattern? Explain that pattern. Treat it like onboarding a new team member.

**Use the new abstractions.** Set up MCP servers for your databases. Create tools for common tasks. Build skills for repeated workflows. The more context you can provide automatically, the less you need to explain manually.

**Iterate constantly.** Your context is never complete. Every mistake is a chance to improve. Every wrong assumption is a documentation gap. Every failure teaches you what to add.

## The Future of Programming

What does programming become when AI writes the code?

It becomes context engineering. It becomes requirements writing. It becomes system design. It becomes architecture.

The typing of code becomes the easy part. The thinking about code remains hard. The explaining of code becomes crucial.

This scares some developers. It should not. The best developers were never the best typists. They were the best thinkers. That has not changed. The output format changed.

I believe this is a good thing. We spent decades typing syntax. Memorizing APIs. Fighting with semicolons. AI freed us from that. Now we can focus on what matters: solving problems.

But you need to learn the new skill. You need to practice context engineering. You need to become excellent at explaining what you need.

The developers who adapt will thrive. They will build more, faster, better than ever before. They will work with AI as a partner, not fight against it.

The developers who refuse to adapt will struggle. They will compete against AI instead of using it. They will lose.

I know which group I want to be in. I hope you do too.

---

_Zoltan Erdos is a developer based in Brighton, UK, building spike.land. He believes the future of programming is not about writing code - it is about giving AI the context to write it for you._
