---
active: false
iteration: 5
max_iterations: 50
completion_promise: "SPIKE-DONE"
started_at: "2026-01-02T19:47:26Z"
---

This is a guide designed for an AI Dev Agent (like Claude Code) equipped with MCP tools (specifically `puppeteer` or `playwright` for browser automation, and basic file system access) to perform End-to-End (E2E) testing on the local development environment.

This manual uses Cucumber-style Gherkin syntax to define the _scenarios_ and _success criteria_, but it leaves the specific implementation steps (the click-by-click operations) to the agent's discretion using its MCP tools.

---

# QA Agent Manual: `/my-apps` Feature E2E Testing

## 1. Environment Setup (Prerequisites)

Before starting these tests, ensure the local development environment is fully running. You (the QA agent) need to verify these services are active.

| Service                  | Expected State         | Verification Command (if applicable)                                                                      |
| ------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Database (Postgres)**  | Running & Migrated     | `npx prisma migrate status` should show up-to-date.                                                       |
| **Redis (Upstash)**      | Reachable via REST API | Ensure `.env` has correct Upstash credentials.                                                            |
| **Next.js Dev Server**   | Running on port 3000   | Visit `http://localhost:3000` in your headless browser.                                                   |
| **Backend Poller Agent** | **CRITICAL:** Running  | The script `yarn agent:poll` must be running in a separate terminal process to actually process the apps. |

## 2. Agent Tooling Requirements

You must have the following MCP server capabilities enabled:

- **Browser Automation:** `puppeteer` or `playwright` (to navigate pages, click elements, type text, assert DOM states).
- **FileSystem:** `fs` (to access fixture files for upload tests).

## 3. Testing Strategy & Scope

- **Base URL:** `http://localhost:3000/my-apps`
- **Authentication:** Assume you are testing as a logged-in user. If the local environment requires auth, perform the login flow first before navigating to `/my-apps`.
- **Asynchronous Nature:** This feature relies heavily on Server-Sent Events (SSE) and a background worker. You **must** use polling or waiting mechanisms in Playwright/Puppeteer (e.g., `page.waitForSelector`, `page.waitForFunction`) rather than fixed sleeps. Things will not happen instantly.

---

## Test Suite A: The Happy Path (Creation Loop)

**Goal:** Verify the core loop of creating a new app, handing it off to the backend agent, and receiving real-time updates.

### Scenario A1: Starting a new App

```gherkin
Feature: New App Init
  As a developer user
  I want to submit a prompt for a new app
  So that the AI agent can start building it

  Scenario: User submits initial prompt
    Given I am on the page "http://localhost:3000/my-apps/new"
    When I type "Create a simple landing page for a coffee shop with a hero image." into the main prompt textarea
    And I click the "Build App" submit button
    Then I should be redirected to a URL matching URL pattern "/my-apps/cle[a-zA-Z0-9]+" (a CUID based URL)
    And the App Status badge on the new page should show "WAITING" (indicating it's queued for the backend agent)
    And my initial prompt should appear in the chat history list on the left side.
```

### Scenario A2: Receiving Real-time Agent Feedback (Continues A1)

_Note: This scenario requires the `yarn agent:poll` script to be actually running and successfully processing the job created in A1._

```gherkin
Feature: Real-time Builder Feedback
  As a user waiting for my app
  I want to see the status update in real-time without refreshing
  So I know the agent is working

  Scenario: The backend agent picks up the job
    Given I am on the app workspace page created in Scenario A1
    And the current status is "WAITING"
    When I wait for up to 60 seconds (allow time for polling script to run)
    Then the App Status badge should automatically change to "DRAFTING" or "BUILDING"
    And a "Thinking..." or "Agent is working..." animated indicator should appear near the chat.
    And eventually, a new message from the "AI Agent" should appear in the chat list (e.g., "Okay, I'm starting a draft of the coffee shop page...").
```

### Scenario A3: The Iframe Preview Update (Continues A2)

_Note: This is the most complex test. It relies on the backend agent actually generating valid code and triggering a `code_updated` SSE event._

```gherkin
Feature: Live Preview Hot-Reload
  As a user
  I want the preview iframe to reload automatically when code changes
  So I can see progress instantly

  Scenario: Agent completes a build step
    Given I am on the app workspace page where the agent is "BUILDING"
    When the backend agent finishes a coding task and triggers a code update
    Then the right-hand iframe preview (pointing to `/live/[slug]`) should automatically reload.
    And the content inside the iframe should change (e.g., it should no longer show a 404 or blank page, but actual HTML content related to a coffee shop).
```

---

## Test Suite B: User Interaction & Iteration

**Goal:** Verify the user can interact with the chat interface during the build process.

### Scenario B1: Iterating via Chat

```gherkin
Feature: Chat Iteration
  As a user viewing my building app
  I want to provide feedback to the agent
  So it can refine the app

  Scenario: User sends a follow-up message
    Given I am on an app workspace page
    And the App Status is NOT "WAITING" (it is either PROMPTING, LIVE, or the agent has just finished a turn)
    When I type "Please make the background color darker." into the chat input box
    And I press enter or click send
    Then the chat input box should clear immediately
    And my message "Please make the background color darker." should appear at the bottom of the chat history
    And the App Status badge should immediately change to "WAITING".
```

### Scenario B2: Uploading Image Context

_Prerequisite: Have a small JPEG or PNG file ready on the local filesystem to use as a fixture._

```gherkin
Feature: Multimodal Input
  As a user
  I want to attach images to my prompts
  So the AI understands visual context

  Scenario: User uploads an image with text
    Given I am on an app workspace page
    When I click the attachment/paperclip icon near the chat input
    And I use the file picker to select my fixture image named "example-wireframe.png"
    Then a small preview thumbnail of "example-wireframe.png" should appear above the chat input box.
    
    When I add the text "Make it look like this wireframe." and click send
    Then the message in the chat history should contain both the text AND the image thumbnail.
```

---

## Test Suite C: Navigation & Dashboard

### Scenario C1: The My Apps Dashboard

```gherkin
Feature: Dashboard Gallery
  As a user
  I want to see a list of my existing apps
  So I can navigate back to them

  Scenario: Viewing the app list
    Given I have created at least one app previously (e.g., in Scenario A1)
    When I navigate to "http://localhost:3000/my-apps"
    Then I should see a grid or list of app cards.
    And one of the cards should contain the prompt text or title of the app created in Scenario A1.
    When I click on that card
    Then I should be navigated back to the app's workspace page (`/my-apps/[appId]`).
```

---

## QA Agent Execution Instructions (How to run these)

1. **State Management:** Since these tests build on each other (A1 -> A2 -> A3), you need to maintain state during your session. If A1 fails, A2 and A3 cannot be run.
2. **Identify Selectors:** Your first task is to inspect the DOM of the local application to identify reliable CSS selectors or XPath for:

- The new app prompt textarea.
- The "Build App" submit button.
- The chat message container list.
- The status badge element.
- The chat input textarea on the workspace page.
- The send button.
- The preview `<iframe>`.

3. **Handle Wait Times:** When testing Scenario A2 (waiting for agent), use a generous timeout in your Playwright automation (e.g., `page.waitForSelector('.agent-message', { timeout: 60000 })`). The local LLM processing can be slow.
4. **Reporting:** If a scenario fails, report:

- The scenario ID (e.g., A2).
- The step that failed.
- A screenshot of the browser state at the time of failure (using MCP browser screenshot capability).
- Logs from the browser console if available.

If you managed to test everything, and didn't find any issues, please commit and push your work and <promise>SPIKE-DONE</promise>!
