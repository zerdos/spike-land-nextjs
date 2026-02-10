/**
 * Sync Utilities
 *
 * Transformers and helpers for BridgeMind <-> GitHub Projects V2 sync.
 * Pure functions with no side effects.
 */

export interface BridgeMindCard {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
  metadata?: Record<string, unknown>;
}

export interface GitHubIssuePayload {
  title: string;
  body: string;
  labels: string[];
}

/**
 * Status mapping from BridgeMind statuses to GitHub Projects V2 statuses.
 * BridgeMind uses free-form strings; GitHub Projects V2 uses single-select fields.
 */
const BRIDGEMIND_TO_GITHUB_STATUS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  "to do": "Todo",
  "in progress": "In Progress",
  "in_progress": "In Progress",
  "in-progress": "In Progress",
  review: "In Review",
  "in review": "In Review",
  "in_review": "In Review",
  done: "Done",
  completed: "Done",
  closed: "Done",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  blocked: "Blocked",
};

/**
 * Map a BridgeMind status string to a GitHub Projects V2 status.
 * Returns the mapped status or the original string with title case if no mapping exists.
 */
export function mapBridgemindStatus(bridgemindStatus: string): string {
  if (!bridgemindStatus) {
    return "Backlog";
  }

  const normalized = bridgemindStatus.toLowerCase().trim();
  const mapped = BRIDGEMIND_TO_GITHUB_STATUS[normalized];

  if (mapped) {
    return mapped;
  }

  // Title case the original if no mapping exists
  return bridgemindStatus
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Transform a BridgeMind card into a GitHub issue payload.
 * The body includes a footer with the BridgeMind ID for traceability.
 */
export function bridgemindCardToGitHubIssue(card: BridgeMindCard): GitHubIssuePayload {
  const priorityLabel = card.priority ? `p-${card.priority.toLowerCase()}` : undefined;

  const labels: string[] = [];
  if (card.labels) {
    labels.push(...card.labels);
  }
  if (priorityLabel) {
    labels.push(priorityLabel);
  }
  labels.push("bridgemind-sync");

  const bodyParts: string[] = [];

  if (card.description) {
    bodyParts.push(card.description);
  }

  bodyParts.push("");
  bodyParts.push("---");
  bodyParts.push(`*Synced from BridgeMind | ID: \`${card.id}\` | Status: ${card.status}*`);

  if (card.assignee) {
    bodyParts.push(`*Assignee: ${card.assignee}*`);
  }

  if (card.sprintId) {
    bodyParts.push(`*Sprint: ${card.sprintId}*`);
  }

  return {
    title: card.title,
    body: bodyParts.join("\n"),
    labels,
  };
}

/**
 * Compare two version strings to determine if an update is needed.
 * Returns:
 *   -1 if versionA < versionB (A is older)
 *    0 if equal
 *    1 if versionA > versionB (A is newer)
 *
 * Supports ISO date strings, numeric versions, and arbitrary strings (lexicographic).
 */
export function compareVersions(
  versionA: string | null | undefined,
  versionB: string | null | undefined,
): number {
  // Null/undefined treated as oldest
  if (!versionA && !versionB) return 0;
  if (!versionA) return -1;
  if (!versionB) return 1;

  // Try ISO date comparison first (common for updatedAt timestamps)
  const dateA = Date.parse(versionA);
  const dateB = Date.parse(versionB);

  if (!isNaN(dateA) && !isNaN(dateB)) {
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  }

  // Try numeric version comparison (e.g., "1", "2", "42")
  const numA = Number(versionA);
  const numB = Number(versionB);

  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA < numB) return -1;
    if (numA > numB) return 1;
    return 0;
  }

  // Fallback to lexicographic comparison
  if (versionA < versionB) return -1;
  if (versionA > versionB) return 1;
  return 0;
}
