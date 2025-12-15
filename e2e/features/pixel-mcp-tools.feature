Feature: Pixel MCP Tools Interface
  As a developer or power user
  I want to test the MCP API tools directly in the browser
  So that I can understand and integrate with the API

  @fast
  Scenario: View MCP tools page as guest
    Given I am not logged in
    When I visit "/apps/pixel/mcp-tools"
    Then I should see "MCP Tools" heading
    And I should see "Test the MCP API for image generation and modification" text
    And I should see "API Key Required" card
    And I should see "API Key" input field

  @fast @requires-db
  Scenario: View MCP tools page as authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    Then I should see "MCP Tools" heading
    And I should see "Authentication" card
    And I should see "Using session authentication (no API key needed)" text
    And I should see optional API key input

  @fast
  Scenario: MCP tools tabs are displayed
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    Then I should see "Generate" tab
    And I should see "Modify" tab
    And I should see "Job Status" tab
    And I should see "Balance" tab

  Scenario: Generate tab interface
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    Then I should see "Generate Image" heading
    And I should see "Prompt" textarea
    And I should see "Quality Tier" selector
    And I should see tier cost display
    And I should see "Generate" button

  Scenario: Modify tab interface
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Modify" tab
    Then I should see "Modify Image" heading
    And I should see "Upload Image" input
    And I should see "Modification Prompt" textarea
    And I should see "Quality Tier" selector
    And I should see "Modify" button

  Scenario: Job Status tab interface
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Job Status" tab
    Then I should see "Check Job Status" heading
    And I should see "Job ID" input
    And I should see "Check Status" button

  Scenario: Balance tab interface
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Balance" tab
    Then I should see "Token Balance" heading
    And I should see "Check Balance" button
    And I should see "Token Costs" card
    And I should see tier pricing information

  @requires-db
  Scenario: Check balance as authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    And I mock token balance of 100 tokens
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Balance" tab
    And I click "Check Balance" button
    Then I should see my current token balance displayed
    And the balance should show "100" tokens

  Scenario: Generate image without prompt shows disabled button
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    Then the "Generate" button should be disabled

  Scenario: Generate image with prompt enables button
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    And I enter "A beautiful sunset over mountains" in the prompt textarea
    Then the "Generate" button should be enabled

  @slow @requires-db
  Scenario: Generate image successfully
    Given I am logged in as "Test User" with email "test@example.com"
    And I have at least 10 tokens
    And I mock a successful MCP generate job
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    And I enter "A peaceful garden with flowers" in the prompt textarea
    And I select "TIER_1K" quality tier
    And I click "Generate" button
    Then I should see "Generating..." loading state
    When the job completes
    Then I should see the generated image in the result area
    And I should see "Completed" status badge
    And I should see the job details

  @slow @requires-db
  Scenario: Modify image successfully
    Given I am logged in as "Test User" with email "test@example.com"
    And I have at least 10 tokens
    And I mock a successful MCP modify job
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Modify" tab
    And I upload a test image
    And I enter "Add a rainbow in the sky" in the modification prompt textarea
    And I click "Modify" button
    Then I should see "Modifying..." loading state
    When the job completes
    Then I should see the modified image in the result area
    And I should see "Completed" status badge

  Scenario: Check job status by ID
    Given I am logged in as "Test User" with email "test@example.com"
    And I mock a job status response for job "test-job-123"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Job Status" tab
    And I enter "test-job-123" in the job ID input
    And I click "Check Status" button
    Then I should see the job details for "test-job-123"
    And I should see the job type badge
    And I should see the job status badge

  Scenario: Job status shows completed job with image
    Given I am logged in as "Test User" with email "test@example.com"
    And I mock a completed job status with output image
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Job Status" tab
    And I enter the job ID
    And I click "Check Status" button
    Then I should see the output image
    And I should see the image dimensions
    And I should see the tokens used

  Scenario: Job status shows failed job with error
    Given I am logged in as "Test User" with email "test@example.com"
    And I mock a failed job status with error message
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Job Status" tab
    And I enter the failed job ID
    And I click "Check Status" button
    Then I should see "Failed" status badge
    And I should see the error message

  Scenario: API documentation section
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    Then I should see "API Documentation" heading
    And I should see "Generate Image" API example
    And I should see "Modify Image" API example
    And I should see "Check Job Status" API example
    And I should see "Check Balance" API example

  @fast
  Scenario: Copy API documentation commands
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click the copy button for "Generate Image" API command
    Then the command should be copied to clipboard
    And I should see the copy confirmation icon

  Scenario: MCP Server installation command
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    Then I should see "MCP Server" documentation section
    And I should see the npx installation command
    And I should see "Manage API Keys" link

  Scenario: Guest user requires API key for operations
    Given I am not logged in
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Balance" tab
    And I click "Check Balance" button
    Then I should see an error "Please enter an API key to test the API"

  @requires-db
  Scenario: Guest user with API key can check balance
    Given I am not logged in
    And there is a valid API key "sk_test_abc123"
    When I visit "/apps/pixel/mcp-tools"
    And I enter "sk_test_abc123" in the API key input
    And I click on "Balance" tab
    And I click "Check Balance" button
    Then I should see the token balance for the API key

  Scenario: Quality tier selection affects cost display
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    Then the cost should show "2 tokens" for "TIER_1K"
    When I select "TIER_2K" quality tier
    Then the cost should show "5 tokens" for "TIER_2K"
    When I select "TIER_4K" quality tier
    Then the cost should show "10 tokens" for "TIER_4K"

  Scenario: Token costs card shows all tier pricing
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Balance" tab
    Then I should see "1K Quality" with "1024px resolution" and "2 tokens"
    And I should see "2K Quality" with "2048px resolution" and "5 tokens"
    And I should see "4K Quality" with "4096px resolution" and "10 tokens"

  @fast
  Scenario: Generate result area shows empty state
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    Then I should see "Generate an image to see the result here" text

  @fast
  Scenario: Modify result area shows empty state
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Modify" tab
    Then I should see "Modify an image to see the result here" text

  @fast
  Scenario: Job status result area shows empty state
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Job Status" tab
    Then I should see "Enter a job ID to see details" text

  Scenario: Error handling for generate API failure
    Given I am logged in as "Test User" with email "test@example.com"
    And I mock a failed MCP generate response
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Generate" tab
    And I enter "Test prompt" in the prompt textarea
    And I click "Generate" button
    Then I should see an error message in the generate form

  Scenario: Modify button disabled without image
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Modify" tab
    And I enter "Add some text" in the modification prompt textarea
    Then the "Modify" button should be disabled
    And I should not be able to submit the form

  Scenario: Image preview shown after upload
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click on "Modify" tab
    And I upload a test image
    Then I should see the image preview thumbnail

  @fast
  Scenario: Settings page link is accessible
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/mcp-tools"
    And I click "Manage API Keys" link
    Then I should be on the "/settings" page
