@requires-db
Feature: Admin Jobs Queue Management
  As an admin user
  I want to view and manage enhancement jobs
  So that I can monitor processing status and troubleshoot issues

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  # Page load test is in smoke-tests.feature

  @fast @requires-db
  Scenario: Jobs page displays status tabs
    When I visit "/admin/jobs"
    Then I should see "All" tab
    And I should see "Queue" tab
    And I should see "Running" tab
    And I should see "Completed" tab
    And I should see "Failed" tab
    And I should see "Cancelled" tab
    And I should see "Refunded" tab

  @fast @requires-db
  Scenario: Jobs page displays search and refresh controls
    When I visit "/admin/jobs"
    Then I should see search input with placeholder "Search by Job ID or email..."
    And I should see "Search" button
    And I should see "Refresh" button

  @fast @requires-db
  Scenario: Jobs page displays two-column layout
    When I visit "/admin/jobs"
    Then I should see jobs list panel on the left
    And I should see job details panel on the right

  @slow @requires-db
  Scenario: Status tabs show job counts
    Given there are jobs in the system
    When I visit "/admin/jobs"
    Then each tab should display a job count badge
    And the "All" tab count should equal total jobs

  @slow @requires-db
  Scenario Outline: Filter jobs by status
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click the "<tab>" tab
    Then the jobs list should only show <status> status jobs
    And the "<tab>" tab should be active

    Examples:
      | tab       | status     |
      | Queue     | PENDING    |
      | Running   | PROCESSING |
      | Completed | COMPLETED  |
      | Failed    | FAILED     |
      | Cancelled | CANCELLED  |
      | Refunded  | REFUNDED   |

  @slow @requires-db
  Scenario: Jobs list displays items correctly
    Given there are jobs in the system
    When I visit "/admin/jobs"
    Then I should see the jobs list
    And each job should display a status badge
    And each job should display the enhancement tier
    And each job should display a relative timestamp
    And each job should display job ID preview
    And each job should display user email

  @slow @requires-db
  Scenario: Search jobs by job ID
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I enter a job ID in the search field
    And I click "Search" button
    Then the jobs list should show matching jobs

  @slow @requires-db
  Scenario: Search jobs by email
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I enter "user@example.com" in the search field
    And I click "Search" button
    Then the jobs list should only show jobs from that user

  @slow @requires-db
  Scenario: Search with Enter key
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I enter search text in the search field
    And I press Enter
    Then the search should execute

  @slow @requires-db
  Scenario: Refresh job list
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click "Refresh" button
    Then the jobs list should refresh
    And the job counts should update

  @slow @requires-db
  Scenario: Select job to view details
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click on a job in the list
    Then the job should be highlighted
    And the details panel should show job information

  @slow @requires-db
  Scenario: Job details shows status and timing
    Given there is a completed job in the system
    When I visit "/admin/jobs"
    And I click on the completed job
    Then the details panel should show "Status" section
    And the details panel should show "Processing Time" section
    And the details panel should show "Created" timestamp
    And the details panel should show "Completed" timestamp

  @slow @requires-db
  Scenario: Job details shows enhancement information
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click on a job in the list
    Then the details panel should show "Enhancement Details" section
    And I should see the tier information
    And I should see the tokens cost
    And I should see original image dimensions
    And I should see original image size
    And I should see retry count

  @slow @requires-db
  Scenario: Completed job details shows enhanced image info
    Given there is a completed job in the system
    When I visit "/admin/jobs"
    And I click on the completed job
    Then the details panel should show enhanced image dimensions
    And the details panel should show enhanced image size

  @slow @requires-db
  Scenario: Completed job shows before/after comparison
    Given there is a completed job in the system
    When I visit "/admin/jobs"
    And I click on the completed job
    Then the details panel should show image comparison slider
    And I should see "Original" label
    And I should see "Enhanced" label

  @slow @requires-db
  Scenario: Job details shows AI model information
    Given there is a job with AI model info in the system
    When I visit "/admin/jobs"
    And I click on that job
    Then the details panel should show "AI Model" section
    And I should see the model name
    And I should see the temperature setting

  @slow @requires-db
  Scenario: Job details shows prompt for processed jobs
    Given there is a job with a prompt in the system
    When I visit "/admin/jobs"
    And I click on that job
    Then the details panel should show "Prompt" section
    And the prompt should be displayed in a code block

  @slow @requires-db
  Scenario: Failed job details shows error message
    Given there is a failed job in the system
    When I visit "/admin/jobs"
    And I click on the failed job
    Then the details panel should show "Error" section in red
    And the error message should be displayed

  @slow @requires-db
  Scenario: Job details shows user information
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click on a job in the list
    Then the details panel should show "User" section
    And I should see the user name or "Unknown"
    And I should see the user email

  @slow @requires-db
  Scenario: Job details shows all IDs
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click on a job in the list
    Then the details panel should show "IDs" section
    And I should see the Job ID
    And I should see the Image ID

  @slow @requires-db
  Scenario: Job details shows workflow ID when present
    Given there is a job with workflow run ID
    When I visit "/admin/jobs"
    And I click on that job
    Then the details panel should show the Workflow ID

  @slow @requires-db
  Scenario: Empty job details when no job selected
    When I visit "/admin/jobs"
    Then the details panel should show "Select a job to view details" text

  # Badge color and tier label styling tests removed - use visual regression testing instead

  @slow @requires-db
  Scenario: Pagination displays when more than 20 jobs
    Given there are more than 20 jobs in the system
    When I visit "/admin/jobs"
    Then I should see pagination controls
    And I should see "Page 1 of" text
    And I should see "Previous" button disabled
    And I should see "Next" button enabled

  @slow @requires-db
  Scenario: Navigate to next page of jobs
    Given there are more than 20 jobs in the system
    When I visit "/admin/jobs"
    And I click "Next" button
    Then I should see "Page 2 of" text
    And I should see different jobs in the list

  @slow @requires-db
  Scenario: Navigate to previous page of jobs
    Given there are more than 20 jobs in the system
    When I visit "/admin/jobs"
    And I click "Next" button
    And I click "Previous" button
    Then I should see "Page 1 of" text

  @slow @requires-db
  Scenario: Tab change resets to page 1
    Given there are more than 20 jobs in the system
    When I visit "/admin/jobs"
    And I click "Next" button
    And I click the "Failed" tab
    Then I should see "Page 1 of" text

  @slow @requires-db
  Scenario: Selected job clears when switching tabs
    Given there are jobs in the system
    When I visit "/admin/jobs"
    And I click on a job in the list
    And I click the "Failed" tab
    Then the details panel should show "Select a job to view details" text

  @slow @requires-db
  Scenario: Jobs list shows loading state
    Given the jobs API is slow
    When I navigate quickly to "/admin/jobs"
    Then I should see loading skeleton placeholders

  @slow @requires-db
  Scenario: Empty state when no jobs found
    Given there are no jobs in the system
    When I visit "/admin/jobs"
    Then I should see "No jobs found" text

  @slow @requires-db
  Scenario: Empty state when no jobs match filter
    Given there are only completed jobs in the system
    When I visit "/admin/jobs"
    And I click the "Failed" tab
    Then I should see "No jobs found" text

  @slow @requires-db
  Scenario: Error state displays on API failure
    Given the jobs API returns an error
    When I visit "/admin/jobs"
    Then I should see an error message in red

  @slow @requires-db
  Scenario: Relative time displays correctly
    Given there is a job created just now
    When I visit "/admin/jobs"
    Then I should see "just now" timestamp

  @slow @requires-db
  Scenario: Processing duration formats correctly
    Given there is a completed job that took 45 seconds
    When I visit "/admin/jobs"
    And I click on the completed job
    Then I should see processing time formatted as seconds

  @slow @requires-db
  Scenario: File sizes format correctly
    Given there is a completed job with known file sizes
    When I visit "/admin/jobs"
    And I click on the completed job
    Then file sizes should be formatted with appropriate units

  @fast @requires-db
  Scenario: Non-admin user cannot access jobs management
    Given the user is not an admin
    When I visit "/admin/jobs"
    Then I should be redirected to home page

  @fast @requires-db
  Scenario: Unauthenticated user cannot access jobs management
    Given I am not logged in
    When I visit "/admin/jobs"
    Then I should be redirected to sign-in page
