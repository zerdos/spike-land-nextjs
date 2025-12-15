@skip
Feature: API Error Handling
  As a user
  I want to see clear error messages when API requests fail
  So that I understand what went wrong and how to proceed

  Background:
    Given I am logged in as "David Jones" with email "david@example.com"

  # Authentication Errors
  @integration
  Scenario: Unauthorized API request shows error
    Given the API returns a 401 unauthorized error
    When I navigate to a protected API page
    Then I should see an authentication error message
    And I should see the option to sign in again

  @integration
  Scenario: Session expired shows re-login prompt
    Given my session has expired
    When I perform an API action
    Then I should see a session expired message
    And I should see the "Sign In" button

  # Rate Limiting
  @integration
  Scenario: Rate limit exceeded shows appropriate message
    Given the API returns a 429 rate limit error
    When I perform an API action
    Then I should see "Rate limit exceeded" message
    And I should see the retry after time

  @integration
  Scenario: Rate limit countdown displays correctly
    Given the API returns a 429 rate limit error with 60 seconds retry
    When I perform an API action
    Then I should see the rate limit error
    And I should see "Retry-After" information

  # Validation Errors
  @integration
  Scenario: Invalid input shows validation error
    Given I am on the settings page
    When I submit a form with invalid data
    Then I should see a validation error message
    And the error should indicate which field is invalid

  @integration
  Scenario: Missing required field shows error
    Given I am on the API Keys tab
    When I try to create an API key without a name
    Then the create button should be disabled
    And I should not be able to submit

  @integration
  Scenario: Name too long shows validation error
    Given I am on the API Keys tab
    When I click the "Create API Key" button
    And I enter a name longer than 50 characters
    Then I should see a validation error for name length

  # Server Errors
  @integration
  Scenario: Server error shows generic error message
    Given the API returns a 500 server error
    When I perform an API action
    Then I should see a server error message
    And I should see the "Try Again" button

  @integration
  Scenario: Service unavailable shows maintenance message
    Given the API returns a 503 service unavailable error
    When I perform an API action
    Then I should see a service unavailable message

  # Network Errors
  @integration
  Scenario: Network timeout shows timeout error
    Given the API request times out
    When I perform an API action
    Then I should see a timeout error message
    And I should see the "Retry" button

  @integration
  Scenario: Network disconnected shows offline message
    Given the network is disconnected
    When I perform an API action
    Then I should see an offline error message
    And I should see instructions to check connection

  # MCP API Specific Errors
  @integration
  Scenario: MCP generate fails with insufficient tokens
    Given I have 0 tokens
    When I attempt to generate an image via MCP
    Then I should see "Insufficient tokens" error
    And I should see the option to purchase tokens

  @integration
  Scenario: MCP generate fails with invalid prompt
    When I attempt to generate an image with empty prompt
    Then I should see a validation error for prompt

  @integration
  Scenario: MCP modify fails with invalid image URL
    When I attempt to modify an image with invalid URL
    Then I should see "Invalid image URL" error

  @integration
  Scenario: MCP job not found
    When I check status for a non-existent job
    Then I should see "Job not found" error
    And the response status should be 404

  # API Key Errors
  @integration
  Scenario: Invalid API key shows authentication error
    Given I use an invalid API key
    When I make an MCP API request
    Then I should see "Invalid API key" error
    And the response status should be 401

  @integration
  Scenario: Revoked API key shows error
    Given I use a revoked API key
    When I make an MCP API request
    Then I should see "API key has been revoked" error

  @integration
  Scenario: Exceeded max API keys shows error
    Given I have 10 API keys already
    When I try to create another API key
    Then I should see "Maximum API keys reached" error
    And I should see instructions to revoke an existing key

  # Error Recovery
  @integration
  Scenario: Retry after temporary failure succeeds
    Given the API fails once then succeeds
    When I perform an API action
    And I click the "Try Again" button
    Then the action should succeed
    And the error message should disappear

  @integration
  Scenario: Error toast auto-dismisses
    Given the API returns a non-critical error
    When I perform an API action
    Then I should see an error toast
    And the toast should auto-dismiss after timeout

  # Form Error States
  @integration
  Scenario: Form shows error state on invalid input
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    Then the create key button should be disabled initially
    When I enter a valid key name
    Then the create key button should be enabled

  @integration
  Scenario: Error clears when input becomes valid
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter a valid key name
    Then no error messages should be visible
