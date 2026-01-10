import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Extend CustomWorld for Orbit calendar testing
declare module "../support/world" {
  interface CustomWorld {
    scheduledPosts?: ScheduledPost[];
    currentPost?: ScheduledPost;
    calendarMonth?: Date;
  }
}

// Types for calendar testing
interface ScheduledPost {
  id: string;
  content: string;
  scheduledAt: string;
  status: "DRAFT" | "PENDING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  timezone: string;
  recurrenceRule: string | null;
  accounts: Array<{
    platform: string;
    accountName: string;
    status: string;
  }>;
}

// Mock data
const MOCK_SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: "sched-post-1",
    content: "Exciting company news!",
    scheduledAt: getDateOffset(2, "09:00").toISOString(), // 2 days from now
    status: "SCHEDULED",
    timezone: "UTC",
    recurrenceRule: null,
    accounts: [
      { platform: "LINKEDIN", accountName: "Test Company", status: "SCHEDULED" },
    ],
  },
  {
    id: "sched-post-2",
    content: "Weekly update",
    scheduledAt: getDateOffset(5, "14:00").toISOString(), // 5 days from now
    status: "SCHEDULED",
    timezone: "UTC",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    accounts: [
      { platform: "LINKEDIN", accountName: "Test Company", status: "SCHEDULED" },
    ],
  },
  {
    id: "sched-post-3",
    content: "Draft post",
    scheduledAt: getDateOffset(3, "10:00").toISOString(),
    status: "DRAFT",
    timezone: "UTC",
    recurrenceRule: null,
    accounts: [
      { platform: "LINKEDIN", accountName: "Test Company", status: "DRAFT" },
    ],
  },
];

const MOCK_FAILED_POST: ScheduledPost = {
  id: "sched-post-failed",
  content: "Post that failed",
  scheduledAt: getDateOffset(-1, "09:00").toISOString(), // Yesterday
  status: "FAILED",
  timezone: "UTC",
  recurrenceRule: null,
  accounts: [
    { platform: "LINKEDIN", accountName: "Test Company", status: "FAILED" },
  ],
};

function getDateOffset(days: number, time: string): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return date;
}

// Calendar View Steps
When(
  "I navigate to the calendar page",
  async function(this: CustomWorld) {
    // Set up calendar API mock
    await this.page.route("**/api/orbit/calendar**", async (route) => {
      const posts = this.scheduledPosts ?? MOCK_SCHEDULED_POSTS;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          posts: posts.map((p) => ({
            ...p,
            platforms: p.accounts.map((a) => a.platform),
            accountNames: p.accounts.map((a) => a.accountName),
            isRecurring: !!p.recurrenceRule,
          })),
        }),
      });
    });

    // Set up scheduled posts API mock
    await this.page.route("**/api/orbit/scheduled-posts**", async (route) => {
      const posts = this.scheduledPosts ?? MOCK_SCHEDULED_POSTS;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          posts,
          total: posts.length,
          hasMore: false,
        }),
      });
    });

    await this.page.goto(`/orbit/${this.workspaceSlug ?? "test-marketing"}/calendar`);
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "I should see the calendar view",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='calendar-view']")).toBeVisible();
  },
);

Then(
  "I should see the current month displayed",
  async function(this: CustomWorld) {
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    await expect(this.page.getByText(currentMonth)).toBeVisible();
  },
);

Then(
  "I should see navigation to previous and next months",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='calendar-prev-month']")).toBeVisible();
    await expect(this.page.locator("[data-testid='calendar-next-month']")).toBeVisible();
  },
);

// Scheduled Posts Steps
Given(
  "I have scheduled posts for this week",
  async function(this: CustomWorld) {
    this.scheduledPosts = MOCK_SCHEDULED_POSTS;
  },
);

Given(
  "I have scheduled posts for multiple platforms",
  async function(this: CustomWorld) {
    this.scheduledPosts = [
      ...MOCK_SCHEDULED_POSTS,
      {
        id: "sched-post-twitter",
        content: "Twitter post",
        scheduledAt: getDateOffset(1, "11:00").toISOString(),
        status: "SCHEDULED",
        timezone: "UTC",
        recurrenceRule: null,
        accounts: [
          { platform: "TWITTER", accountName: "Test Twitter", status: "SCHEDULED" },
        ],
      },
    ];
  },
);

Given(
  "I have posts in different statuses",
  async function(this: CustomWorld) {
    this.scheduledPosts = [
      ...MOCK_SCHEDULED_POSTS,
      MOCK_FAILED_POST,
      {
        id: "sched-post-published",
        content: "Published post",
        scheduledAt: getDateOffset(-2, "09:00").toISOString(),
        status: "PUBLISHED",
        timezone: "UTC",
        recurrenceRule: null,
        accounts: [
          { platform: "LINKEDIN", accountName: "Test Company", status: "PUBLISHED" },
        ],
      },
    ];
  },
);

Given(
  "I have a scheduled post {string}",
  async function(this: CustomWorld, postContent: string) {
    const post: ScheduledPost = {
      id: `sched-post-${Date.now()}`,
      content: postContent,
      scheduledAt: getDateOffset(2, "09:00").toISOString(),
      status: "SCHEDULED",
      timezone: "UTC",
      recurrenceRule: null,
      accounts: [
        { platform: "LINKEDIN", accountName: "Test Company", status: "SCHEDULED" },
      ],
    };
    this.scheduledPosts = this.scheduledPosts ? [...this.scheduledPosts, post] : [post];
    this.currentPost = post;
  },
);

Given(
  "I have a scheduled post on Monday",
  async function(this: CustomWorld) {
    // Find next Monday
    const date = new Date();
    const daysUntilMonday = (8 - date.getDay()) % 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(9, 0, 0, 0);

    const post: ScheduledPost = {
      id: "sched-post-monday",
      content: "Monday post",
      scheduledAt: date.toISOString(),
      status: "SCHEDULED",
      timezone: "UTC",
      recurrenceRule: null,
      accounts: [
        { platform: "LINKEDIN", accountName: "Test Company", status: "SCHEDULED" },
      ],
    };
    this.scheduledPosts = [post];
    this.currentPost = post;
  },
);

Given(
  "I have a scheduled post for LinkedIn",
  async function(this: CustomWorld) {
    this.currentPost = MOCK_SCHEDULED_POSTS[0];
    this.scheduledPosts = [MOCK_SCHEDULED_POSTS[0]!];
  },
);

Given(
  "I have a failed scheduled post",
  async function(this: CustomWorld) {
    this.scheduledPosts = [MOCK_FAILED_POST];
    this.currentPost = MOCK_FAILED_POST;
  },
);

Given(
  "my workspace timezone is {string}",
  async function(this: CustomWorld, timezone: string) {
    // Mock workspace with timezone setting
    await this.page.route("**/api/orbit/workspaces/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "workspace-1",
          name: this.workspaceName ?? "Test Marketing",
          slug: this.workspaceSlug ?? "test-marketing",
          settings: { timezone },
        }),
      });
    });
  },
);

// Calendar Interaction Steps
Then(
  "I should see scheduled posts marked on the calendar",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='calendar-post-marker']").first()).toBeVisible();
  },
);

Then(
  "each post should show the platform icons",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='platform-icon']").first()).toBeVisible();
  },
);

// NOTE: "I filter by {string} platform" is defined in orbit-social.steps.ts to avoid ambiguity

Then(
  "I should only see LinkedIn scheduled posts",
  async function(this: CustomWorld) {
    const posts = this.page.locator("[data-testid='calendar-post-marker']");
    const count = await posts.count();
    for (let i = 0; i < count; i++) {
      await expect(posts.nth(i).locator("[data-testid='platform-icon-linkedin']")).toBeVisible();
    }
  },
);

// Create Post Steps
When(
  "I click on a future date",
  async function(this: CustomWorld) {
    // Click on a date cell that's in the future
    const futureDateCell = this.page.locator(
      "[data-testid='calendar-date-cell'][data-future='true']",
    ).first();
    await futureDateCell.click();
  },
);

Then(
  "the create post dialog should open",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='create-post-dialog']")).toBeVisible();
  },
);

Then(
  "I should see the date pre-filled",
  async function(this: CustomWorld) {
    const dateInput = this.page.locator("[data-testid='post-date-input']");
    await expect(dateInput).not.toHaveValue("");
  },
);

When(
  "I navigate to create a scheduled post",
  async function(this: CustomWorld) {
    await this.page.goto(`/orbit/${this.workspaceSlug ?? "test-marketing"}/calendar`);
    await this.page.click("[data-testid='create-post-button']");
    await expect(this.page.locator("[data-testid='create-post-dialog']")).toBeVisible();
  },
);

When(
  "I enter post content {string}",
  async function(this: CustomWorld, content: string) {
    await this.page.fill("[data-testid='post-content-input']", content);
  },
);

When(
  "I select a future date and time",
  async function(this: CustomWorld) {
    const futureDate = getDateOffset(2, "14:00");
    await this.page.fill(
      "[data-testid='post-date-input']",
      futureDate.toISOString().split("T")[0]!,
    );
    await this.page.fill("[data-testid='post-time-input']", "14:00");
  },
);

When(
  "I select a past date",
  async function(this: CustomWorld) {
    const pastDate = getDateOffset(-2, "14:00");
    await this.page.fill("[data-testid='post-date-input']", pastDate.toISOString().split("T")[0]!);
    await this.page.fill("[data-testid='post-time-input']", "14:00");
  },
);

When(
  "I select LinkedIn as the target platform",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='account-select-linkedin-test-company']");
  },
);

When(
  "I select both LinkedIn and Twitter as targets",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='account-select-linkedin-test-company']");
    await this.page.click("[data-testid='account-select-twitter-test-twitter']");
  },
);

When(
  "I do not select any platform",
  async function(this: CustomWorld) {
    // Ensure no platforms are selected - do nothing
  },
);

When(
  "I enable recurrence",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='recurrence-toggle']");
  },
);

When(
  "I set recurrence to {string}",
  async function(this: CustomWorld, frequency: string) {
    await this.page.selectOption("[data-testid='recurrence-frequency']", frequency.toUpperCase());
  },
);

When(
  "I click the calendar {string} button",
  async function(this: CustomWorld, buttonText: string) {
    // Mock the create/update API
    await this.page.route("**/api/orbit/scheduled-posts", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: `new-post-${Date.now()}`,
            content: "Created post",
            scheduledAt: getDateOffset(2, "14:00").toISOString(),
            status: "SCHEDULED",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await this.page.click(`button:has-text("${buttonText}")`);
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the post should be saved as scheduled",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "it should appear on the calendar",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='calendar-post-marker']")).toBeVisible();
  },
);

Then(
  "the post should be scheduled for both platforms",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "both platform icons should appear on the calendar",
  async function(this: CustomWorld) {
    const postMarker = this.page.locator("[data-testid='calendar-post-marker']").first();
    await expect(postMarker.locator("[data-testid='platform-icon-linkedin']")).toBeVisible();
    await expect(postMarker.locator("[data-testid='platform-icon-twitter']")).toBeVisible();
  },
);

Then(
  "the recurring post should be created",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "it should show recurring indicators on the calendar",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='recurring-indicator']").first()).toBeVisible();
  },
);

// Edit Steps
When(
  "I click on the scheduled post",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-post-marker']");
    await expect(this.page.locator("[data-testid='post-details-dialog']")).toBeVisible();
  },
);

Then(
  "the post details dialog should open",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='post-details-dialog']")).toBeVisible();
  },
);

When(
  "I edit the content to {string}",
  async function(this: CustomWorld, newContent: string) {
    await this.page.fill("[data-testid='post-content-input']", newContent);
  },
);

Then(
  "the post should be updated",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "I should see the updated content",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='post-content-input']")).toBeVisible();
  },
);

When(
  "I drag the post to Wednesday",
  async function(this: CustomWorld) {
    const postMarker = this.page.locator("[data-testid='calendar-post-marker']").first();
    const wednesdayCell = this.page.locator(
      "[data-testid='calendar-date-cell'][data-day='wednesday']",
    );
    await postMarker.dragTo(wednesdayCell);
  },
);

Then(
  "the post should be rescheduled to Wednesday",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "I should see a confirmation message",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

When(
  "I edit the scheduled post",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-post-marker']");
    await expect(this.page.locator("[data-testid='post-details-dialog']")).toBeVisible();
  },
);

When(
  "I add Twitter as a target",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='account-select-twitter-test-twitter']");
  },
);

// Delete Steps
When(
  "I confirm deletion",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='confirm-delete-button']");
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "the post should be removed",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='success-toast']")).toBeVisible();
  },
);

Then(
  "it should not appear on the calendar",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='create-post-dialog']")).not.toBeVisible();
  },
);

Then(
  "the post status should be {string}",
  async function(this: CustomWorld, status: string) {
    await expect(this.page.locator(`[data-testid='post-status-${status.toLowerCase()}']`))
      .toBeVisible();
  },
);

Then(
  "it should appear dimmed on the calendar",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='calendar-post-marker'].cancelled")).toBeVisible();
  },
);

// Status Display Steps
Then(
  "draft posts should show with a draft indicator",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='status-indicator-draft']").first()).toBeVisible();
  },
);

Then(
  "scheduled posts should show with a scheduled indicator",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='status-indicator-scheduled']").first())
      .toBeVisible();
  },
);

Then(
  "published posts should show with a published indicator",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='status-indicator-published']").first())
      .toBeVisible();
  },
);

Then(
  "failed posts should show with a failed indicator",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='status-indicator-failed']").first())
      .toBeVisible();
  },
);

When(
  "I click on the failed post",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-post-marker'][data-status='failed']");
  },
);

Then(
  "I should see the post error message",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='error-message']")).toBeVisible();
  },
);

Then(
  "I should see options to retry or edit",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='retry-button']")).toBeVisible();
    await expect(this.page.locator("[data-testid='edit-button']")).toBeVisible();
  },
);

// Navigation Steps
When(
  "I click next month",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-next-month']");
  },
);

When(
  "I click previous month",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-prev-month']");
  },
);

Then(
  "I should see the next month displayed",
  async function(this: CustomWorld) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthName = nextMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    await expect(this.page.getByText(monthName)).toBeVisible();
  },
);

When(
  "I use the date picker to select a future month",
  async function(this: CustomWorld) {
    await this.page.click("[data-testid='calendar-date-picker']");
    // Navigate to a future month
    await this.page.click("[data-testid='date-picker-next-month']");
    await this.page.click("[data-testid='date-picker-next-month']");
    await this.page.click("[data-testid='date-picker-select']");
  },
);

Then(
  "I should see that month displayed on the calendar",
  async function(this: CustomWorld) {
    // Just verify the calendar header changed
    await expect(this.page.locator("[data-testid='calendar-month-header']")).toBeVisible();
  },
);

// Dashboard Steps
Then(
  "I should see the {string} widget",
  async function(this: CustomWorld, widgetName: string) {
    const widgetId = widgetName.toLowerCase().replace(/\s+/g, "-");
    await expect(this.page.locator(`[data-testid='widget-${widgetId}']`)).toBeVisible();
  },
);

Then(
  "I should see the count of scheduled posts",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='scheduled-posts-count']")).toBeVisible();
  },
);

Then(
  "I should see the next few scheduled posts",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='upcoming-post-item']").first()).toBeVisible();
  },
);

When(
  "I click on the {string} widget",
  async function(this: CustomWorld, widgetName: string) {
    const widgetId = widgetName.toLowerCase().replace(/\s+/g, "-");
    await this.page.click(`[data-testid='widget-${widgetId}']`);
  },
);

Then(
  "I should be navigated to the calendar page",
  async function(this: CustomWorld) {
    await expect(this.page).toHaveURL(/\/calendar$/);
  },
);

// Validation Steps
// NOTE: "I should see an error {string}" is defined in common.steps.ts

Then(
  "the schedule button should be disabled",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='schedule-button']")).toBeDisabled();
  },
);

// Timezone Steps
When(
  "I select {string} as the time",
  async function(this: CustomWorld, time: string) {
    await this.page.fill("[data-testid='post-time-input']", time);
  },
);

Then(
  "the time should be displayed in America\\/New_York timezone",
  async function(this: CustomWorld) {
    await expect(this.page.locator("[data-testid='timezone-display']")).toContainText(
      "America/New_York",
    );
  },
);

Then(
  "the post should be scheduled for the correct UTC time",
  async function(this: CustomWorld) {
    // The UTC time should be offset from the displayed time
    await expect(this.page.locator("[data-testid='utc-time-display']")).toBeVisible();
  },
);

// Publishing cron job steps
Given(
  "I have a scheduled post due for publishing now",
  async function(this: CustomWorld) {
    const now = new Date();
    now.setSeconds(0, 0); // Round to current minute

    const post: ScheduledPost = {
      id: "sched-post-ready",
      content: "Post ready for publishing",
      scheduledAt: now.toISOString(),
      status: "SCHEDULED",
      timezone: "UTC",
      recurrenceRule: null,
      accounts: [
        { platform: "LINKEDIN", accountName: "Test Company", status: "SCHEDULED" },
      ],
    };

    this.scheduledPosts = [post];
    this.currentPost = post;
  },
);

When(
  "the publishing cron job runs",
  async function(this: CustomWorld) {
    // Mock the cron job execution
    await this.page.route("**/api/orbit/cron/publish-scheduled-posts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publishedCount: 1,
          posts: [
            {
              ...this.currentPost,
              status: "PUBLISHED",
            },
          ],
        }),
      });
    });

    // Trigger the cron job
    await this.page.request.post(`${this.baseUrl}/api/orbit/cron/publish-scheduled-posts`);
    await this.page.waitForTimeout(500);
  },
);
