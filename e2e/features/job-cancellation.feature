Feature: Job Cancellation
  As an authenticated user
  I want to cancel pending enhancement jobs
  So that I can get my tokens refunded

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  @requires-db
  Scenario: Cancel a pending enhancement job
    Given I have an uploaded image
    And I have a pending enhancement job
    When I click the cancel button for the job
    Then I should see a confirmation dialog
    When I confirm the cancellation
    Then the job status should be "CANCELLED"
    And I should see a success message
    And my tokens should be refunded

  @requires-db
  Scenario: Cancel a processing enhancement job
    Given I have an uploaded image
    And I have a processing enhancement job
    When I click the cancel button for the job
    And I confirm the cancellation
    Then the job status should be "CANCELLED"
    And my tokens should be refunded

  @requires-db
  Scenario: Cannot cancel completed job
    Given I have an uploaded image
    And I have a completed enhancement job
    Then I should not see a cancel button for the job

  @requires-db
  Scenario: Cannot cancel failed job
    Given I have an uploaded image
    And I have a failed enhancement job
    Then I should not see a cancel button for the job

  @requires-db
  Scenario: Cancelled job displays correct status
    Given I have an uploaded image
    And I have a cancelled enhancement job
    When I view the image enhancement page
    Then I should see "CANCELLED" status in the version grid
    And the job should be marked as cancelled

  @requires-db
  Scenario: Cancel job with dialog dismiss
    Given I have an uploaded image
    And I have a pending enhancement job
    When I click the cancel button for the job
    Then I should see a confirmation dialog
    When I dismiss the cancellation dialog
    Then the job status should remain "PENDING"
    And my token balance should not change

  @requires-db
  Scenario: Token refund displays in transaction history
    Given I have an uploaded image
    And I have a pending enhancement job with 2 token cost
    And I have 10 tokens
    When I cancel the job
    Then my token balance should be 12 tokens
    And I should see a refund transaction in my history

  @requires-db
  Scenario: Cancel job error handling
    Given I have an uploaded image
    And I have a pending enhancement job
    And I mock a failed job cancellation
    When I attempt to cancel the job
    Then I should see an error message
    And the job status should remain "PENDING"
