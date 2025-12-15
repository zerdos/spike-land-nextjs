@skip
Feature: MCP Usage History Page
  As an authenticated user
  I want to view my MCP API usage history
  So that I can track my image generation and modification jobs

  Background:
    Given I am logged in as "David Jones" with email "david@example.com"

  @fast @requires-db
  Scenario: Visit MCP history page when authenticated
    When I navigate to the MCP history page
    Then I should see the MCP history page title
    And the page URL should be "/settings/mcp-history"

  @fast @requires-db
  Scenario: MCP history page shows filter controls
    When I navigate to the MCP history page
    Then I should see the type filter dropdown
    And I should see the MCP Tools link

  @fast @requires-db
  Scenario: Filter dropdown shows all options
    When I navigate to the MCP history page
    And I click the type filter dropdown
    Then I should see "All Types" option
    And I should see "Generate" option
    And I should see "Modify" option

  @slow @requires-db
  Scenario: Filter by Generate type
    Given I have MCP job history
    When I navigate to the MCP history page
    And I select "Generate" from the type filter
    Then I should only see Generate type jobs
    And the filter should show "Generate"

  @slow @requires-db
  Scenario: Filter by Modify type
    Given I have MCP job history
    When I navigate to the MCP history page
    And I select "Modify" from the type filter
    Then I should only see Modify type jobs
    And the filter should show "Modify"

  @fast @requires-db
  Scenario: Empty history shows no jobs message
    Given I have no MCP job history
    When I navigate to the MCP history page
    Then I should see "No Jobs Found" message
    And I should see the Try MCP Tools button

  @slow @requires-db
  Scenario: View job details in modal
    Given I have MCP job history
    When I navigate to the MCP history page
    And I click on a job card
    Then I should see the job details modal
    And I should see the job ID
    And I should see the tier information
    And I should see the tokens used
    And I should see the prompt

  @slow @requires-db
  Scenario: Close job details modal
    Given I have MCP job history
    When I navigate to the MCP history page
    And I click on a job card
    And I close the job details modal
    Then the job details modal should be closed

  @slow @requires-db
  Scenario: Job card shows status badge
    Given I have MCP job history
    When I navigate to the MCP history page
    Then I should see job cards with status badges
    And completed jobs should show green badge
    And failed jobs should show red badge

  @slow @requires-db
  Scenario: Pagination appears when jobs exceed limit
    Given I have more than 12 MCP jobs
    When I navigate to the MCP history page
    Then I should see the pagination controls
    And I should see the "Previous" button disabled
    And I should see the "Next" button enabled

  @slow @requires-db
  Scenario: Navigate to next page
    Given I have more than 12 MCP jobs
    When I navigate to the MCP history page
    And I click the "Next" button
    Then I should be on page 2
    And I should see the "Previous" button enabled

  @slow @requires-db
  Scenario: Navigate to previous page
    Given I have more than 12 MCP jobs
    When I navigate to the MCP history page
    And I click the "Next" button
    And I click the "Previous" button
    Then I should be on page 1
    And I should see the "Previous" button disabled

  @fast @requires-db
  Scenario: Total jobs count is displayed
    Given I have MCP job history
    When I navigate to the MCP history page
    Then I should see the total jobs count

  @integration
  Scenario: Loading state is shown while fetching
    When I navigate to the MCP history page with slow API
    Then I should see the loading spinner
    And the loading spinner should disappear when data loads

  @integration
  Scenario: Error state is shown when API fails
    Given the MCP history API returns an error
    When I navigate to the MCP history page
    Then I should see the error message
    And I should see the "Try Again" button

  @integration
  Scenario: Retry after error
    Given the MCP history API returns an error
    When I navigate to the MCP history page
    And the API is fixed
    And I click the "Try Again" button
    Then I should see the job history

  @fast
  Scenario: Protected route redirects unauthenticated users
    Given I am not logged in
    When I navigate to the MCP history page
    Then I should be redirected to the signin page
