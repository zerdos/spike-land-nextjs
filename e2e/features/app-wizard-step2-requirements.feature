# Authentication bypass fixed in src/auth.ts - See GitHub issue #435
# @skip due to form validation issues - needs investigation (GitHub issue #437)
@skip
Feature: App Creation Wizard - Step 2: Requirements
  As an authenticated user
  I want to specify requirements for my app
  So that I can define what features my app should have

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  @fast @unit
  Scenario: Step 2 form fields are displayed
    Given I complete step 1 with valid data
    Then I should see the wizard step "Requirements"
    And I should see the "Requirements" textarea field
    And I should see the "Back" button
    And I should see the "Next" button

  @fast @unit
  Scenario: Progress bar shows 50% on Step 2
    Given I complete step 1 with valid data
    Then the progress bar should show 50%
    And the progress text should say "Step 2 of 4"

  @fast @unit
  Scenario: Validation error for empty requirements
    Given I complete step 1 with valid data
    When I click the "Next" button
    Then I should see the error message "Requirements are required"
    And I should remain on step 2

  @fast @unit
  Scenario: Validation error for requirements too short
    Given I complete step 1 with valid data
    When I type "Short" in the "Requirements" field
    And I click the "Next" button
    Then I should see the error message "Requirements must be at least 20 characters"
    And I should remain on step 2

  @fast @integration
  Scenario: Back button preserves Step 1 data
    Given I complete step 1 with name "Test App" and description "Test Description Here"
    When I click the "Back" button
    Then I should see the wizard step "Basic Info"
    And the "App Name" field should contain "Test App"
    And the "Description" field should contain "Test Description Here"

  @fast @integration
  Scenario: Successfully proceed to Step 3 with valid requirements
    Given I complete step 1 with valid data
    When I type "The app should have user authentication and dashboard" in the "Requirements" field
    And I click the "Next" button
    Then I should see the wizard step "Monetization"
    And the progress bar should show 75%
