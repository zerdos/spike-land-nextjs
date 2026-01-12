# My PRs Were Pure AI Slop: A Developer's Confession

_By Zoltan Erdos | Brighton, UK | January 2026_

I need to tell you something. Something I am not proud of.

For a brief period in 2025, when I joined a new team, my pull requests were pure AI slop. Even with my very best effort to avoid it.

Let me explain what happened.

## The New Job

I was excited. A new team. A new challenge. The tech stack looked interesting. The people seemed smart. I was ready to prove myself.

The codebase was old. Very old. It had years of history. Thousands of files. Patterns I had never seen before. Decisions made long before I arrived.

But I had a secret weapon. Or so I thought.

AI coding tools had become incredibly powerful by 2025. Claude Code. Opus 4.5. These were not simple autocomplete tools anymore. They could understand complex codebases. They could write entire features. They could refactor large amounts of code.

I used them constantly. And they were fast. So fast.

My first PRs looked amazing. Clean code. Good structure. Proper error handling. The tests passed. The linter was happy. I felt like a hero.

I was not a hero. I was building on sand.

## The Problem Nobody Warned Me About

Here is what nobody told me about AI coding tools: they make assumptions.

When you ask an AI to help with code, it looks at the codebase. It sees patterns. It makes guesses about how things work. Then it writes code based on those guesses.

Usually, this is fine. The AI is smart. It makes good guesses.

But sometimes the AI is wrong. And as a new developer on a legacy codebase, I had no way to know.

The AI would see a function and assume it worked one way. But there was a comment from three years ago explaining why it actually worked differently. The AI missed that. I missed that too, because I trusted the AI.

The AI would follow a pattern it found in one part of the code. But that pattern was deprecated. The team had moved to a new approach six months ago. The AI did not know. I did not know either.

The AI would make my code look perfect. Professional. Clean. But it was built on wrong assumptions. It was beautiful nonsense.

## The Moment I Realized

It happened in a code review.

A senior developer left a comment. "Why did you use this approach? We stopped doing this last year."

I looked at my code. I had no answer. I did not remember making that decision. Because I did not make it. The AI did.

I went back to check. The AI had found old code that used this pattern. It assumed this was the right way. It wrote my code to match. I approved it without question because it looked right.

That was the moment I understood. My PRs were AI slop. Not because the code was bad. Not because the AI was stupid. But because I had outsourced my understanding to a machine that could not truly understand.

I felt ashamed. I had been copying code I did not comprehend. I had been submitting work I could not explain. I had been pretending to be a developer while acting as a human copy-paste button.

## What I Learned

The AI is not the problem. I was the problem.

I was using AI as a shortcut instead of a tool. There is a big difference.

A shortcut replaces your work. A tool helps you do your work better. I was treating AI like a shortcut. I needed to treat it like a tool.

Here is what changed for me:

**First, I started asking "why" before "how."** Before I asked the AI to write code, I asked it to explain the codebase. What patterns does it see? What assumptions is it making? Then I could verify those assumptions with the team.

**Second, I created documentation on my own machine.** Every time I learned something about the codebase, I wrote it down. When the AI made a suggestion, I checked it against my notes. This caught many mistakes.

**Third, I wrote tests first.** Not because TDD is trendy. Because tests forced me to understand what the code should do before I asked the AI to write it. If I could not write the test, I did not understand the problem.

**Fourth, I built small scripts to verify assumptions.** Quick checks. Simple validations. Ways to confirm that the code did what I thought it did. Not what the AI assumed it did.

**Fifth, I started reading the git history.** Old commits tell stories. They explain why code exists. They show how patterns evolved. The AI cannot read intent. But humans left clues in their commit messages.

## My Advice to You

If you are new to a team and using AI tools, please hear me.

The AI will make you feel productive. You will ship code fast. Your PRs will look clean. But you might be building on assumptions you cannot verify.

Slow down. Ask questions. Read the old code. Talk to your teammates. Understand before you generate.

AI coding tools are incredible. They have changed how I work forever. But they are not a replacement for understanding. They are a multiplier. And if you multiply zero understanding by a powerful AI, you still get zero.

I still use AI every day. But now I use it differently. I use it to explore. I use it to learn. I use it to write code I already understand.

My PRs are not AI slop anymore. They are my work, enhanced by AI.

That is the difference. And it matters.

---

_Zoltan Erdos is a developer based in Brighton, UK, building spike.land. He learned this lesson the hard way so you do not have to._
