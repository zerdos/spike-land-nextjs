# TODO: Fix authentication bypass in CI - See GitHub issue
# Temporarily disabled until authentication bypass is fixed for Vercel preview deployments
@skip
Feature: App Creation Wizard - Step 1: Basic Info
  As an authenticated user
  I want to enter basic information about my app
  So that I can proceed to the next step of app creation

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  @fast @unit
  Scenario: Step 1 form fields are displayed
    Then I should see the wizard step "Basic Info"
    And I should see the "App Name" input field
    And I should see the "Description" textarea field
    And I should see the "Next" button

  @fast @unit
  Scenario: Progress bar shows 25% on Step 1
    Then the progress bar should show 25%
    And the progress text should say "Step 1 of 4"

  @fast @unit
  Scenario: Validation error for empty app name
    When I click the "Next" button
    Then I should see the error message "App name is required"
    And I should remain on step 1

  @fast @unit
  Scenario: Validation error for app name too short
    When I type "AB" in the "App Name" field
    And I click the "Next" button
    Then I should see the error message "App name must be at least 3 characters"
    And I should remain on step 1

  @fast @unit
  Scenario: Validation error for empty description
    When I type "My Awesome App" in the "App Name" field
    And I click the "Next" button
    Then I should see the error message "Description is required"
    And I should remain on step 1

  @fast @unit
  Scenario: Validation error for description too short
    When I type "My App" in the "App Name" field
    And I type "Short" in the "Description" field
    And I click the "Next" button
    Then I should see the error message "Description must be at least 10 characters"
    And I should remain on step 1

  @fast @unit
  Scenario: Next button disabled until valid data entered
    Then the "Next" button should be disabled
    When I type "My Test App" in the "App Name" field
    Then the "Next" button should be disabled
    When I type "This is a comprehensive description of my test app" in the "Description" field
    Then the "Next" button should be enabled

  @fast @integration
  Scenario: Successfully proceed to Step 2 with valid data
    When I type "My App" in the "App Name" field
    And I type "This is my app description that is long enough" in the "Description" field
    And I click the "Next" button
    Then I should see the wizard step "Requirements"
    And the progress bar should show 50%
