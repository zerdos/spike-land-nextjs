@requires-db
Feature: Admin Agents Dashboard
  As an admin user
  I want to access the agents dashboard
  So that I can monitor and manage external AI agents like Jules

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"

  # Access Control Scenarios
  Scenario: Admin user can access agents dashboard
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should be on the "/admin/agents" page
    And I should see "Agents Dashboard" heading

  Scenario: Non-admin user cannot access agents dashboard
    Given the user is not an admin
    When I visit "/admin/agents"
    Then I should be on the "/" page

  Scenario: Unauthenticated user cannot access agents dashboard
    Given I am not logged in
    When I visit "/admin/agents"
    Then I should be on the "/" page

  # Dashboard Overview Scenarios
  Scenario: Dashboard shows status overview cards
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see status overview section
    And I should see "Total" status card
    And I should see "Active" status card
    And I should see "Completed" status card
    And I should see "Failed" status card

  Scenario: Dashboard shows sessions panel
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see "Agent Sessions" heading
    And I should see the sessions list or empty state

  # Session Management Scenarios
  Scenario: Dashboard shows active session details
    Given the user is an admin
    And there is an active Jules session
    When I visit "/admin/agents"
    Then I should see the session card
    And the session card should show status badge
    And the session card should show provider icon

  Scenario: Admin can view session with AWAITING_PLAN_APPROVAL status
    Given the user is an admin
    And there is a Jules session awaiting plan approval
    When I visit "/admin/agents"
    Then I should see "Approve Plan" button on the session card

  Scenario: Admin can view session activities
    Given the user is an admin
    And there is an active Jules session with activities
    When I visit "/admin/agents"
    And I expand the session card
    Then I should see session activity log

  # Resources Panel Scenarios
  Scenario: Dashboard shows resources panel
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see "Resources" heading
    And I should see resource status items

  Scenario: Resources panel shows dev server status
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see "Dev Server" resource item
    And the resource item should have a status indicator

  Scenario: Resources panel shows MCP servers status
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see MCP server status items

  # Git Info Panel Scenarios
  Scenario: Dashboard shows git info panel
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see "Git Info" heading
    And I should see current branch name

  Scenario: Git info shows changed files count
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see changed files information
    And I should see ahead/behind status

  # GitHub Issues Panel Scenarios
  Scenario: Dashboard shows GitHub issues panel
    Given the user is an admin
    And GitHub API is configured
    When I visit "/admin/agents"
    Then I should see "GitHub Issues" heading
    And I should see open issues list or empty state

  Scenario: GitHub issues panel shows workflow runs
    Given the user is an admin
    And GitHub API is configured
    When I visit "/admin/agents"
    Then I should see recent workflow runs
    And workflow runs should have status indicators

  Scenario: GitHub panel shows unconfigured message when token missing
    Given the user is an admin
    And GitHub API is not configured
    When I visit "/admin/agents"
    Then I should see GitHub configuration required message

  # Create Session Scenarios
  Scenario: Admin can open create session modal
    Given the user is an admin
    And Jules API is configured
    When I visit "/admin/agents"
    And I click "New Task" button
    Then I should see the create session modal
    And the modal should have title field
    And the modal should have task field

  # Note: This scenario cannot be tested via E2E because julesAvailable is determined
  # server-side by checking JULES_API_KEY environment variable. API route mocking
  # doesn't work for SSR data. This behavior is verified in unit tests.
  @skip
  Scenario: Create session button disabled when Jules not configured
    Given the user is an admin
    And Jules API is not configured
    When I visit "/admin/agents"
    Then the "New Task" button should be disabled or hidden

  # Polling and Refresh Scenarios
  Scenario: Dashboard auto-refreshes session data
    Given the user is an admin
    When I visit "/admin/agents"
    Then the dashboard should poll for updates
    And the timestamp should update periodically

  # Navigation Scenarios
  Scenario: Agents link appears in admin sidebar
    Given the user is an admin
    When I visit "/admin"
    Then I should see "Agents" link in the sidebar

  Scenario: Navigate to agents from sidebar
    Given the user is an admin
    And I am on the admin dashboard
    When I click "Agents" in the sidebar
    Then I should be on the "/admin/agents" page

  # Error Handling Scenarios
  Scenario: Dashboard handles API errors gracefully
    Given the user is an admin
    And the agents API returns an error
    When I visit "/admin/agents"
    Then I should see an error message
    And I should see a retry option

  Scenario: Dashboard shows loading state
    Given the user is an admin
    When I visit "/admin/agents"
    Then I should see loading indicators while data loads
