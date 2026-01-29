/**
 * Ralph Local Agent Spawner
 * Spawns Claude Code CLI agents as background processes
 *
 * Security Note: This module uses child_process.spawn() with argument arrays (not exec),
 * which is the recommended safe pattern. All inputs are validated before use.
 */

import { type ChildProcess, spawn } from "child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import type {
  AgentMarker,
  AgentRole,
  CodeWork,
  LocalAgent,
  MainBranchCIStatus,
  Plan,
  PRFixWork,
  RalphLocalConfig,
  ReviewWork,
} from "./types";

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
    .replaceAll("{{ISSUE_NUMBER}}", String(issueNumber))
    .replaceAll("{{ISSUE_TITLE}}", issueTitle)
    .replaceAll("{{ISSUE_BODY}}", issueBody)
    .replaceAll("{{REPO}}", config.repo)
    .replaceAll("{{PLAN_DIR}}", config.planDir);
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
    .replaceAll("{{ISSUE_NUMBER}}", String(plan.issueNumber))
    .replaceAll("{{TICKET_ID}}", plan.ticketId)
    .replaceAll("{{PLAN_CONTENT}}", planContent)
    .replaceAll("{{WORKTREE_PATH}}", worktreePath)
    .replaceAll("{{REPO}}", config.repo);
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
    .replaceAll("{{ISSUE_NUMBER}}", String(codeWork.issueNumber))
    .replaceAll("{{TICKET_ID}}", codeWork.ticketId)
    .replaceAll("{{BRANCH}}", codeWork.branch)
    .replaceAll("{{WORKTREE_PATH}}", codeWork.worktree)
    .replaceAll("{{PLAN_CONTENT}}", planContent)
    .replaceAll("{{REPO}}", config.repo);
}

/**
 * Build the prompt for a fixer agent (PR fixes)
 */
function buildFixerPrompt(
  prFix: PRFixWork,
  config: RalphLocalConfig,
): string {
  const template = getPromptTemplate("fixer", config);

  const reviewCommentsText = prFix.reviewComments.length > 0
    ? prFix.reviewComments.join("\n\n---\n\n")
    : "No specific review comments";

  return template
    .replaceAll("{{PR_NUMBER}}", String(prFix.prNumber))
    .replaceAll("{{TICKET_ID}}", prFix.ticketId)
    .replaceAll("{{BRANCH}}", prFix.branch)
    .replaceAll("{{WORKTREE_PATH}}", prFix.worktree)
    .replaceAll("{{FIX_REASON}}", prFix.reason)
    .replaceAll("{{REVIEW_COMMENTS}}", reviewCommentsText)
    .replaceAll("{{FAILURE_DETAILS}}", prFix.failureDetails || "No failure details available")
    .replaceAll("{{REPO}}", config.repo);
}

/**
 * Build the prompt for a reviewer agent
 */
function buildReviewerPrompt(
  review: ReviewWork,
  config: RalphLocalConfig,
): string {
  const promptPath = join(config.workDir, PROMPTS_DIR, "reviewer-agent.md");
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${promptPath}`);
  }
  const template = readFileSync(promptPath, "utf-8");

  const planContent = existsSync(review.planPath)
    ? readFileSync(review.planPath, "utf-8")
    : "Plan file not found";

  const previousFeedback = review.feedback
    ? `Previous review feedback:\n\n${review.feedback}`
    : "No previous feedback - this is the first review.";

  return template
    .replaceAll("{{ISSUE_NUMBER}}", String(review.issueNumber))
    .replaceAll("{{TICKET_ID}}", review.ticketId)
    .replaceAll("{{BRANCH}}", review.branch)
    .replaceAll("{{WORKTREE_PATH}}", review.worktree)
    .replaceAll("{{PLAN_CONTENT}}", planContent)
    .replaceAll("{{ITERATION}}", String(review.iterations))
    .replaceAll("{{MAX_ITERATIONS}}", String(review.maxIterations))
    .replaceAll("{{PREVIOUS_FEEDBACK}}", previousFeedback)
    .replaceAll("{{REPO}}", config.repo);
}

/**
 * Build the prompt for main branch build fixer
 */
function buildMainBuildFixerPrompt(
  mainBranchStatus: MainBranchCIStatus,
  config: RalphLocalConfig,
): string {
  const promptPath = join(config.workDir, PROMPTS_DIR, "main-build-fixer.md");
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${promptPath}`);
  }
  const template = readFileSync(promptPath, "utf-8");

  const failedWorkflowsText = mainBranchStatus.failedWorkflows
    .map((w) => `- ${w.name} (ID: ${w.id}): ${w.conclusion}\n  URL: ${w.url}`)
    .join("\n");

  const firstFailedRunId = mainBranchStatus.failedWorkflows[0]?.id || 0;

  return template
    .replaceAll("{{RUN_ID}}", String(firstFailedRunId))
    .replaceAll("{{FAILED_WORKFLOWS}}", failedWorkflowsText)
    .replaceAll("{{REPO}}", config.repo);
}

/**
 * Spawn a Claude CLI agent in the background
 * Uses spawn() with argument array for safety
 * Uses file descriptors for output to ensure capture even after parent moves on
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

  // Create an empty output file to prevent stale detection on first iteration
  writeFileSync(agent.outputFile, "");

  // Open file descriptors for stdout/stderr (more reliable than event handlers for detached processes)
  const outFd = openSync(agent.outputFile, "a");
  const errFile = agent.outputFile.replace(".json", "-stderr.log");
  const errFd = openSync(errFile, "a");

  try {
    // Spawn claude CLI as background process using argument array (not shell string)
    // Use file descriptors directly for output capture (works with detached processes)
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
        stdio: ["pipe", outFd, errFd],
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

    // Close file descriptors in parent (child has its own copies)
    closeSync(outFd);
    closeSync(errFd);

    // Write PID to file
    if (child.pid) {
      writeFileSync(agent.pidFile, String(child.pid));
      console.log(`   ✅ Agent ${agent.id} spawned with PID ${child.pid}`);
    }

    // Unref to allow parent to exit
    child.unref();

    return child;
  } catch (error) {
    // Clean up file descriptors on error
    try {
      closeSync(outFd);
      closeSync(errFd);
    } catch {
      // Ignore cleanup errors
    }
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
 * Spawn a fixer agent for PR fixes
 */
export function spawnFixerAgent(
  agent: LocalAgent,
  prFix: PRFixWork,
  config: RalphLocalConfig,
): ChildProcess | null {
  if (!validateTicketId(prFix.ticketId)) {
    console.error(`Invalid ticket ID: ${prFix.ticketId}`);
    return null;
  }

  const prompt = buildFixerPrompt(prFix, config);
  return spawnAgent(agent, prompt, prFix.worktree, config);
}

/**
 * Spawn a reviewer agent for code review
 */
export function spawnReviewerAgent(
  agent: LocalAgent,
  review: ReviewWork,
  config: RalphLocalConfig,
): ChildProcess | null {
  if (!validateTicketId(review.ticketId)) {
    console.error(`Invalid ticket ID: ${review.ticketId}`);
    return null;
  }

  const prompt = buildReviewerPrompt(review, config);
  return spawnAgent(agent, prompt, review.worktree, config);
}

/**
 * Spawn a fixer agent for main branch build failures
 */
export function spawnMainBuildFixerAgent(
  agent: LocalAgent,
  mainBranchStatus: MainBranchCIStatus,
  config: RalphLocalConfig,
): ChildProcess | null {
  const prompt = buildMainBuildFixerPrompt(mainBranchStatus, config);
  return spawnAgent(agent, prompt, config.workDir, config);
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
 * Extract text content from agent output
 * Handles both raw text and JSON output format from Claude CLI
 */
function extractTextFromOutput(output: string): string {
  // Try to parse as JSON first (Claude CLI --output-format json)
  try {
    const json = JSON.parse(output);
    // Extract result field which contains the text output
    if (json.result && typeof json.result === "string") {
      return json.result;
    }
    // Fallback to full JSON as string if no result field
    return output;
  } catch {
    // Not JSON, return as-is (raw text output)
    return output;
  }
}

/**
 * Parse agent output for markers
 */
export function parseAgentMarkers(output: string): AgentMarker[] {
  const markers: AgentMarker[] = [];

  // Extract text content (handles JSON output format)
  const text = extractTextFromOutput(output);

  // Parse PLAN_READY markers
  const planReadyRegex = /<PLAN_READY\s+ticket="([^"]+)"\s+path="([^"]+)"\s*\/>/g;
  let match;
  while ((match = planReadyRegex.exec(text)) !== null) {
    markers.push({
      type: "PLAN_READY",
      ticketId: match[1],
      path: match[2],
    });
  }

  // Parse CODE_READY markers
  const codeReadyRegex = /<CODE_READY\s+ticket="([^"]+)"\s+branch="([^"]+)"\s*\/>/g;
  while ((match = codeReadyRegex.exec(text)) !== null) {
    markers.push({
      type: "CODE_READY",
      ticketId: match[1],
      branch: match[2],
    });
  }

  // Parse REVIEW_PASSED markers
  const reviewPassedRegex =
    /<REVIEW_PASSED\s+ticket="([^"]+)"\s+iterations="(\d+)"\s+force="(true|false)"\s*\/>/g;
  while ((match = reviewPassedRegex.exec(text)) !== null) {
    markers.push({
      type: "REVIEW_PASSED",
      ticketId: match[1],
      iterations: parseInt(match[2], 10),
      force: match[3] === "true",
    });
  }

  // Parse REVIEW_CHANGES_REQUESTED markers (feedback may contain quotes, so match until closing " iteration=)
  const reviewChangesRegex =
    /<REVIEW_CHANGES_REQUESTED\s+ticket="([^"]+)"\s+feedback="([\s\S]*?)"\s+iteration="(\d+)"\s*\/>/g;
  while ((match = reviewChangesRegex.exec(text)) !== null) {
    markers.push({
      type: "REVIEW_CHANGES_REQUESTED",
      ticketId: match[1],
      feedback: match[2],
      iteration: parseInt(match[3], 10),
    });
  }

  // Parse PR_CREATED markers
  const prCreatedRegex = /<PR_CREATED\s+ticket="([^"]+)"\s+pr_url="([^"]+)"\s*\/>/g;
  while ((match = prCreatedRegex.exec(text)) !== null) {
    const prUrl = match[2];
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    markers.push({
      type: "PR_CREATED",
      ticketId: match[1],
      prUrl,
      prNumber: prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0,
    });
  }

  // Parse BLOCKED markers (reason may contain quotes, so match until closing " />)
  const blockedRegex = /<BLOCKED\s+ticket="([^"]+)"\s+reason="([\s\S]*?)"\s*\/>/g;
  while ((match = blockedRegex.exec(text)) !== null) {
    markers.push({
      type: "BLOCKED",
      ticketId: match[1],
      reason: match[2],
    });
  }

  // Parse ERROR markers (error may contain quotes, so match until closing " />)
  const errorRegex = /<ERROR\s+ticket="([^"]+)"\s+error="([\s\S]*?)"\s*\/>/g;
  while ((match = errorRegex.exec(text)) !== null) {
    markers.push({
      type: "ERROR",
      ticketId: match[1],
      error: match[2],
    });
  }

  // Parse PR_FIXED markers
  const prFixedRegex = /<PR_FIXED\s+pr_number="(\d+)"\s+ticket="([^"]+)"\s*\/>/g;
  while ((match = prFixedRegex.exec(text)) !== null) {
    markers.push({
      type: "PR_FIXED",
      prNumber: parseInt(match[1], 10),
      ticketId: match[2],
    });
  }

  // Parse MAIN_BUILD_FIX markers
  const mainBuildFixRegex = /<MAIN_BUILD_FIX\s+run_id="(\d+)"\s+fixed="(true|false)"\s*\/>/g;
  while ((match = mainBuildFixRegex.exec(text)) !== null) {
    markers.push({
      type: "MAIN_BUILD_FIX",
      runId: parseInt(match[1], 10),
      fixed: match[2] === "true",
    });
  }

  return markers;
}

/**
 * Check if agent output indicates completion
 */
export function isAgentCompleted(output: string): boolean {
  // Check for JSON format completion (Claude CLI --output-format json)
  try {
    const json = JSON.parse(output);
    // Claude CLI JSON output has type: "result" when complete
    if (json.type === "result") {
      return true;
    }
  } catch {
    // Not JSON, check for text markers
  }

  // Check for text markers
  const text = extractTextFromOutput(output);
  return text.includes("[EXIT_CODE:") || text.includes("<PLAN_READY") ||
    text.includes("<CODE_READY") || text.includes("<PR_CREATED");
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
