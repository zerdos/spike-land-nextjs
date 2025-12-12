---
description: How to delegate subtasks to Claude agents via GitHub
---

# Delegate to Claude Workflow

This workflow describes how to plan complex tasks using Claude CLI locally and then delegate the execution to autonomous Claude agents via GitHub Issues and PRs.

## 1. Preparation & Visualization

If the task involves UI or specific visual requirements, generate a mockup or reference image first.

- Use `generate_image` to create the visual asset.
- Save the path to the image.

## 2. Planning with Claude CLI

Run Claude CLI locally to generate a detailed implementation plan.

```bash
claude "Plan the implementation of [Task Name]. Context: [Description]. Reference: [Path to Image]"
```

- Engage in the interactive session.
- Answer questions to refine the requirements.
- The plan will be saved to `/Users/z/.claude/plans/`. Find the latest `.md` file in that directory.

## 3. Delegation via GitHub

Create a GitHub issue with the generated plan.

```bash
gh issue create --title "[Task Name]" --body-file [Path to Plan File]
```

_Note: Ensure `gh` is authenticated._

## 4. Execution Trigger

Start the agent work by commenting on the newly created issue.

```bash
gh issue comment [Issue URL/Number] --body "@claude - please start to work on it"
```

- The agent will pick up the task and eventually create a Pull Request.

## 5. Review & Iteration

Monitoring the PR created by the agent.

- If changes are needed, comment on the PR:
  ```bash
  gh pr comment [PR Number] --body "@claude please do all the requested changes"
  ```
- If CI fails, ask for a fix:
  ```bash
  gh pr comment [PR Number] --body "@claude please fix the CI failures"
  ```

## 6. Merge

Once the PR is approved and CI passes, merge it.

```bash
gh pr merge [PR Number] --squash --delete-branch
```
