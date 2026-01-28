/**
 * Ralph Local Agent Spawner
 * Spawns Claude Code CLI agents as background processes
 *
 * Security Note: This module uses child_process.spawn() with argument arrays (not exec),
 * which is the recommended safe pattern. All inputs are validated before use.
 */

import { type ChildProcess, spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { AgentMarker, AgentRole, CodeWork, LocalAgent, Plan, RalphLocalConfig } from "./types";

// Prompt templates paths
const PROMPTS_DIR = "scripts/ralph-local/prompts";

/**
 * Validate ticket ID format
 */
function validateTicketId(ticketId: string): boolean {
  return /^#\d+$/.test(ticketId);
}

/**
 * Get prompt content for an agent role
 */
function getPromptTemplate(role: AgentRole, config: RalphLocalConfig): string {
  const promptPath = join(config.workDir, PROMPTS_DIR, `${role}-agent.md`);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${promptPath}`);
  }
  return readFileSync(promptPath, "utf-8");
}

/**
 * Build the prompt for a planning agent
 */
function buildPlanningPrompt(
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  config: RalphLocalConfig,
): string {
  const template = getPromptTemplate("planning", config);
  return template
    .replace("{{ISSUE_NUMBER}}", String(issueNumber))
    .replace("{{ISSUE_TITLE}}", issueTitle)
    .replace("{{ISSUE_BODY}}", issueBody)
    .replace("{{REPO}}", config.repo)
    .replace("{{PLAN_DIR}}", config.planDir);
}

/**
 * Build the prompt for a developer agent
 */
function buildDeveloperPrompt(
  plan: Plan,
  worktreePath: string,
  config: RalphLocalConfig,
): string {
  const template = getPromptTemplate("developer", config);
  const planContent = existsSync(plan.planPath)
    ? readFileSync(plan.planPath, "utf-8")
    : "Plan file not found";

  return template
    .replace("{{ISSUE_NUMBER}}", String(plan.issueNumber))
    .replace("{{TICKET_ID}}", plan.ticketId)
    .replace("{{PLAN_CONTENT}}", planContent)
    .replace("{{WORKTREE_PATH}}", worktreePath)
    .replace("{{REPO}}", config.repo);
}

/**
 * Build the prompt for a tester agent
 */
function buildTesterPrompt(
  codeWork: CodeWork,
  config: RalphLocalConfig,
): string {
  const template = getPromptTemplate("tester", config);
  const planContent = existsSync(codeWork.planPath)
    ? readFileSync(codeWork.planPath, "utf-8")
    : "Plan file not found";

  return template
    .replace("{{ISSUE_NUMBER}}", String(codeWork.issueNumber))
    .replace("{{TICKET_ID}}", codeWork.ticketId)
    .replace("{{BRANCH}}", codeWork.branch)
    .replace("{{WORKTREE_PATH}}", codeWork.worktree)
    .replace("{{PLAN_CONTENT}}", planContent)
    .replace("{{REPO}}", config.repo);
}

/**
 * Spawn a Claude CLI agent in the background
 * Uses spawn() with argument array for safety
 */
export function spawnAgent(
  agent: LocalAgent,
  prompt: string,
  workingDir: string,
  config: RalphLocalConfig,
): ChildProcess | null {
  console.log(`   🚀 Spawning agent ${agent.id}...`);

  // Ensure output directories exist
  ensureDir(dirname(agent.outputFile));
  ensureDir(dirname(agent.pidFile));

  // Write prompt to a temp file (safer than passing via command line)
  const promptFile = join(config.outputDir, `${agent.id}-prompt.md`);
  writeFileSync(promptFile, prompt);

  try {
    // Spawn claude CLI as background process using argument array (not shell string)
    const child = spawn(
      "claude",
      [
        "--print",
        "--dangerously-skip-permissions",
        "--output-format",
        "json",
      ],
      {
        cwd: workingDir,
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
        env: {
          ...process.env,
          CLAUDE_CODE_ENTRYPOINT: "cli",
        },
      },
    );

    // Write prompt to stdin
    child.stdin?.write(prompt);
    child.stdin?.end();

    // Capture output to file
    let output = "";
    child.stdout?.on("data", (data) => {
      output += data.toString();
      writeFileSync(agent.outputFile, output);
    });

    child.stderr?.on("data", (data) => {
      output += `[stderr] ${data.toString()}`;
      writeFileSync(agent.outputFile, output);
    });

    child.on("close", (code) => {
      console.log(`   Agent ${agent.id} exited with code ${code}`);
      // Append exit marker
      output += `\n[EXIT_CODE:${code}]`;
      writeFileSync(agent.outputFile, output);
    });

    // Write PID to file
    if (child.pid) {
      writeFileSync(agent.pidFile, String(child.pid));
      console.log(`   ✅ Agent ${agent.id} spawned with PID ${child.pid}`);
    }

    // Unref to allow parent to exit
    child.unref();

    return child;
  } catch (error) {
    console.error(`   ❌ Failed to spawn agent ${agent.id}:`, error);
    return null;
  }
}

/**
 * Spawn a planning agent for an issue
 */
export function spawnPlanningAgent(
  agent: LocalAgent,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  config: RalphLocalConfig,
): ChildProcess | null {
  if (!validateTicketId(`#${issueNumber}`)) {
    console.error(`Invalid issue number: ${issueNumber}`);
    return null;
  }

  const prompt = buildPlanningPrompt(issueNumber, issueTitle, issueBody, config);
  return spawnAgent(agent, prompt, config.workDir, config);
}

/**
 * Spawn a developer agent for a plan
 */
export function spawnDeveloperAgent(
  agent: LocalAgent,
  plan: Plan,
  worktreePath: string,
  config: RalphLocalConfig,
): ChildProcess | null {
  if (!validateTicketId(plan.ticketId)) {
    console.error(`Invalid ticket ID: ${plan.ticketId}`);
    return null;
  }

  const prompt = buildDeveloperPrompt(plan, worktreePath, config);
  return spawnAgent(agent, prompt, worktreePath, config);
}

/**
 * Spawn a tester agent for code work
 */
export function spawnTesterAgent(
  agent: LocalAgent,
  codeWork: CodeWork,
  config: RalphLocalConfig,
): ChildProcess | null {
  if (!validateTicketId(codeWork.ticketId)) {
    console.error(`Invalid ticket ID: ${codeWork.ticketId}`);
    return null;
  }

  const prompt = buildTesterPrompt(codeWork, config);
  return spawnAgent(agent, prompt, codeWork.worktree, config);
}

/**
 * Check if an agent process is still running
 */
export function isAgentRunning(agent: LocalAgent): boolean {
  if (!agent.pid) {
    return false;
  }

  try {
    // Sending signal 0 checks if process exists
    process.kill(agent.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop an agent process
 */
export function stopAgent(agent: LocalAgent): boolean {
  if (!agent.pid) {
    return true;
  }

  try {
    process.kill(agent.pid, "SIGTERM");
    console.log(`   Sent SIGTERM to agent ${agent.id} (PID ${agent.pid})`);
    return true;
  } catch (error: unknown) {
    // ESRCH means process doesn't exist - this is fine for stale cleanup
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ESRCH") {
      console.log(`   Agent ${agent.id} process already terminated`);
      return true; // Process is gone, which is what we wanted
    }
    console.log(`   Failed to stop agent ${agent.id}:`, error);
    return false;
  }
}

/**
 * Get agent output from file
 */
export function getAgentOutput(agent: LocalAgent): string | null {
  if (!existsSync(agent.outputFile)) {
    return null;
  }

  try {
    return readFileSync(agent.outputFile, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Parse agent output for markers
 */
export function parseAgentMarkers(output: string): AgentMarker[] {
  const markers: AgentMarker[] = [];

  // Parse PLAN_READY markers
  const planReadyRegex = /<PLAN_READY\s+ticket="([^"]+)"\s+path="([^"]+)"\s*\/>/g;
  let match;
  while ((match = planReadyRegex.exec(output)) !== null) {
    markers.push({
      type: "PLAN_READY",
      ticketId: match[1],
      path: match[2],
    });
  }

  // Parse CODE_READY markers
  const codeReadyRegex = /<CODE_READY\s+ticket="([^"]+)"\s+branch="([^"]+)"\s*\/>/g;
  while ((match = codeReadyRegex.exec(output)) !== null) {
    markers.push({
      type: "CODE_READY",
      ticketId: match[1],
      branch: match[2],
    });
  }

  // Parse PR_CREATED markers
  const prCreatedRegex = /<PR_CREATED\s+ticket="([^"]+)"\s+pr_url="([^"]+)"\s*\/>/g;
  while ((match = prCreatedRegex.exec(output)) !== null) {
    const prUrl = match[2];
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    markers.push({
      type: "PR_CREATED",
      ticketId: match[1],
      prUrl,
      prNumber: prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0,
    });
  }

  // Parse BLOCKED markers
  const blockedRegex = /<BLOCKED\s+ticket="([^"]+)"\s+reason="([^"]+)"\s*\/>/g;
  while ((match = blockedRegex.exec(output)) !== null) {
    markers.push({
      type: "BLOCKED",
      ticketId: match[1],
      reason: match[2],
    });
  }

  // Parse ERROR markers
  const errorRegex = /<ERROR\s+ticket="([^"]+)"\s+error="([^"]+)"\s*\/>/g;
  while ((match = errorRegex.exec(output)) !== null) {
    markers.push({
      type: "ERROR",
      ticketId: match[1],
      error: match[2],
    });
  }

  return markers;
}

/**
 * Check if agent output indicates completion
 */
export function isAgentCompleted(output: string): boolean {
  return output.includes("[EXIT_CODE:") || output.includes("<PLAN_READY") ||
    output.includes("<CODE_READY") || output.includes("<PR_CREATED");
}

/**
 * Get the last heartbeat time for an agent (based on output file mtime)
 */
export function getAgentHeartbeat(agent: LocalAgent): Date | null {
  if (!existsSync(agent.outputFile)) {
    return null;
  }

  try {
    const stat = statSync(agent.outputFile);
    return stat.mtime;
  } catch {
    return null;
  }
}

/**
 * Check if an agent is stale (no heartbeat for a long time)
 */
export function isAgentStale(agent: LocalAgent, staleThresholdMs: number): boolean {
  const heartbeat = getAgentHeartbeat(agent);
  if (!heartbeat) {
    return agent.status === "running"; // Running but no output = stale
  }

  const now = Date.now();
  const heartbeatMs = heartbeat.getTime();
  return (now - heartbeatMs) > staleThresholdMs;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read PID from agent's PID file
 */
export function readAgentPid(agent: LocalAgent): number | null {
  if (!existsSync(agent.pidFile)) {
    return null;
  }

  try {
    const pidStr = readFileSync(agent.pidFile, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}
