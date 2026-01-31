import { auth } from "@/auth";
import { createIssue, isGitHubAvailable } from "@/lib/agents/github-issues";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VALID_FEEDBACK_TYPES = ["BUG", "IDEA", "OTHER"] as const;

type FeedbackType = typeof VALID_FEEDBACK_TYPES[number];

interface FeedbackRequestBody {
  type: string;
  message: string;
  email?: string;
  page: string;
  userAgent?: string;
}

function isValidFeedbackType(type: string): type is FeedbackType {
  return VALID_FEEDBACK_TYPES.includes(type as FeedbackType);
}

function getLabelsForFeedbackType(type: FeedbackType): string[] {
  const labels = ["user-feedback"];
  switch (type) {
    case "BUG":
      labels.push("bug");
      break;
    case "IDEA":
      labels.push("enhancement");
      break;
  }
  return labels;
}

function formatIssueBody(options: {
  message: string;
  type: FeedbackType;
  page: string;
  userIdentifier: string;
  email?: string;
  userAgent?: string;
}): string {
  const { message, type, page, userIdentifier, email, userAgent } = options;
  const timestamp = new Date().toISOString();

  let body = `## Feedback

${message}

---

**Details**
- **Type**: ${type}
- **Page**: ${page}
- **User**: ${userIdentifier}`;

  if (email) {
    body += `\n- **Email**: ${email}`;
  }

  body += `\n- **Submitted**: ${timestamp}`;

  if (type === "BUG" && userAgent) {
    body += `\n- **Browser**: ${userAgent}`;
  }

  return body;
}

function getIssueTitlePrefix(type: FeedbackType): string {
  switch (type) {
    case "BUG":
      return "[Bug Report]";
    case "IDEA":
      return "[Feature Request]";
    default:
      return "[Feedback]";
  }
}

export async function POST(request: NextRequest) {
  // Check GitHub availability
  if (!isGitHubAvailable()) {
    console.error("GitHub API is not configured (GH_PAT_TOKEN missing)");
    return NextResponse.json(
      { error: "Feedback service is not configured" },
      { status: 503 },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch<FeedbackRequestBody>(
    request.json(),
  );

  if (parseError) {
    console.error("Error parsing request body:", parseError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Validate required fields
  if (!body.type || !isValidFeedbackType(body.type)) {
    return NextResponse.json(
      { error: "Invalid feedback type. Must be one of: BUG, IDEA, OTHER" },
      { status: 400 },
    );
  }

  if (!body.message || body.message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required and cannot be empty" },
      { status: 400 },
    );
  }

  if (!body.page || body.page.trim().length === 0) {
    return NextResponse.json(
      { error: "Page is required and cannot be empty" },
      { status: 400 },
    );
  }

  // Get session (optional - feedback can be anonymous)
  const { data: session } = await tryCatch(auth());
  const userId = session?.user?.id;
  const userIdentifier = userId ? `user_${userId.slice(0, 8)}` : "Anonymous";

  // Format issue content
  const titlePrefix = getIssueTitlePrefix(body.type as FeedbackType);
  const title = `${titlePrefix} ${body.message.trim().slice(0, 80)}${
    body.message.trim().length > 80 ? "..." : ""
  }`;
  const issueBody = formatIssueBody({
    message: body.message.trim(),
    type: body.type as FeedbackType,
    page: body.page.trim(),
    userIdentifier,
    email: body.email?.trim(),
    userAgent: body.userAgent?.trim(),
  });
  const labels = getLabelsForFeedbackType(body.type as FeedbackType);

  // Create GitHub issue
  const { data: issue, error: createError } = await createIssue({
    title,
    body: issueBody,
    labels,
  });

  if (createError || !issue) {
    console.error("Error creating GitHub issue:", createError);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, issueUrl: issue.url, issueNumber: issue.number },
    { status: 201 },
  );
}
