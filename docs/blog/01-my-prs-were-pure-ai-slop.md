# My PRs Were Pure AI Slop: A Developer's Confession

_By Zoltan Erdos | Brighton, UK | January 2026_

I need to tell you something. Something I am not proud of.

For a brief period in 2025, when I joined a new team, my pull requests were pure AI slop. Even with my very best effort to avoid it.

Let me tell you exactly what happened.

## The New Job

I was excited. A new team. A new challenge. The tech stack looked interesting - a Next.js app for customer cancellations, an Angular app for the main e-commerce store. The people seemed smart. I was ready to prove myself.

The codebase was old. Very old. It had years of history. Thousands of files. Patterns I had never seen before. Decisions made long before I arrived.

But I had a secret weapon. Or so I thought.

AI coding tools had become incredibly powerful by 2025. Claude Code. These were not simple autocomplete tools anymore. They could understand complex codebases. They could write entire features. They could refactor large amounts of code.

I used them constantly. And they were fast. So fast.

My first PRs looked amazing. Clean code. Good structure. Proper error handling. The tests passed. The linter was happy. I felt like a hero.

I was not a hero. I was building on sand.

## The Basket API Incident

Let me tell you about the PR that changed everything.

The ticket seemed simple. Track analytics when a user accepts a retention offer. The flow was straightforward: user goes to cancel their account in the Next.js app, sees a retention offer with an ID in the URL, clicks it, goes to the Angular app, and checks out. I needed to track that checkout event.

I had never built an e-commerce site before. I assumed the frontend holds the basket in memory until checkout. That is how it worked in my head. The user adds things to their cart, the frontend stores it, then sends everything to the server when they click "buy."

So I asked Claude to help me implement the tracking. And Claude generated code. Beautiful code. It called the Basket API to fetch the basket data so we could track the checkout.

It looked perfect. It passed the tests. The linter was happy.

I submitted the PR.

## The Perfect Storm

Here is something I did not know at the time. Claude was having [documented technical issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) during this period. Context window routing errors affected 30% of Claude Code users. The model was producing responses that looked good but were actually degraded.

The tool I trusted was producing good-looking but low-quality output. And I had no way to know.

When AI hallucinates confidently, it makes you hallucinate too. Claude's output looked right. It felt right. So I felt confident. I submitted work I did not fully understand because the AI seemed to understand it.

## The Code Review

One colleague kept asking questions. Questions I could not answer.

"Why are you calling the Basket API here?"

I did not know. I thought it was necessary to get the basket data for tracking.

"The basket is already on the server. The ID in the URL is just for verification."

I did not understand.

Then a more senior developer reviewed the PR. She was direct. The PR was essentially garbage. Only tiny parts were useful.

The basket was server-side. That was the architecture. The backend was the single source of truth. The ID from the cancellation app was just for double-checking against what was already stored. There was no need to call the Basket API at all.

I sat there, staring at my screen. I had no answer for why I wrote this code. Because I did not write it. Claude did. And I approved it without understanding.

## The Root Cause

The AI is not the problem. I was the problem.

I did not know what I did not know. The ticket requirements were unclear, but I did not know enough to ask the right questions. I did not understand the architecture, so I could not verify what the AI assumed.

I was using AI as a shortcut instead of a tool. There is a big difference.

A shortcut replaces your work. A tool helps you do your work better. I was treating AI like a shortcut. I needed to treat it like a tool.

The AI makes assumptions. On a legacy codebase, as a new developer, I had no way to verify those assumptions. The AI saw patterns and made guesses. Sometimes those guesses were wrong. And I had no safety net to catch them.

## What Changed

After that incident, everything changed.

**First, I created comprehensive documentation.** I gathered everything - Confluence docs, code comments, API documentation, other team's codebases. I used NotebookLM to generate learning tutorials, system diagrams, flashcards, quizzes. In one weekend, I mastered the domain knowledge that I had been missing.

**Second, I encoded project patterns into Claude's instructions.** Custom skills. Team conventions. Coding standards. Now the AI follows our patterns automatically instead of guessing.

**Third - and this is the most important change - the agent now interviews me during planning.** Before any code is written, the agent asks me questions. It keeps asking until I have a full picture. If I cannot answer a question, I go back to the documentation. Or I run another agent to find out. This ensures I understand what I am building before I build it.

**Fourth, I test differently now.** The agent spins up a browser. Logs in with test credentials. Tries to pass the feature like a human tester would. Takes screenshots. Compares them with Figma designs. It catches bugs that manual testing would catch.

My effort distribution is completely different now. 30% planning. 50% testing. 20% quality improvement. The actual coding takes almost no time compared to understanding and verifying.

## The Aftermath

I stopped producing slop. My PRs are now high quality.

But my reputation at work is still damaged. My PRs still take longer to review than my colleagues' PRs. The trust I broke takes time to rebuild.

That is the hidden cost of AI slop. It is not just bad code. It is broken trust. And trust rebuilds slowly.

## My Advice to You

If you are new to a team and using AI tools, please hear me.

The AI will make you feel productive. You will ship code fast. Your PRs will look clean. But you might be building on assumptions you cannot verify.

Slow down. Ask questions. Read the old code. Talk to your teammates. Create documentation. Have the AI interview you about the problem before it writes any code.

AI coding tools are incredible. They have changed how I work forever. But they are not a replacement for understanding. They are a multiplier. And if you multiply zero understanding by a powerful AI, you still get zero.

I still use AI every day. More than ever. But now I use it as a partner that questions me, not a shortcut that lets me skip understanding.

My PRs are not AI slop anymore. They are my work, enhanced by AI.

That is the difference. And it matters.

---

_Zoltan Erdos is a developer based in Brighton, UK, building spike.land. He learned this lesson the hard way so you do not have to._
