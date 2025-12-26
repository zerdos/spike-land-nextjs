# Authentication bypass fixed in src/auth.ts - See GitHub issue #435
# @skip due to monetization button issues - needs investigation (GitHub issue #437)
@skip
Feature: App Creation Wizard - Step 4: Review & Submit
  As an authenticated user
  I want to review my app details before submitting
  So that I can ensure everything is correct before creating the app

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  @fast @unit
  Scenario: Review step displays all entered data
    Given I complete all wizard steps with valid data
    Then I should see the wizard step "Review"
    And I should see the review section "Basic Info"
    And I should see the review section "Requirements"
    And I should see the review section "Monetization"
    And I should see the "Submit" button

  @fast @unit
  Scenario: Review shows correct Basic Info
    Given I complete all wizard steps with name "My App" and description "App Description"
    Then the review should show app name "My App"
    And the review should show description "App Description"

  @fast @integration
  Scenario: Edit button navigates back to Basic Info
    Given I complete all wizard steps with valid data
    When I click the edit button for "Basic Info"
    Then I should see the wizard step "Basic Info"
    And the form data should be preserved

  @fast @integration
  Scenario: Edit button navigates back to Requirements
    Given I complete all wizard steps with valid data
    When I click the edit button for "Requirements"
    Then I should see the wizard step "Requirements"
    And the form data should be preserved

  @fast @integration
  Scenario: Edit button navigates back to Monetization
    Given I complete all wizard steps with valid data
    When I click the edit button for "Monetization"
    Then I should see the wizard step "Monetization"
    And the form data should be preserved

  @slow @integration
  Scenario: Submit button creates app and redirects
    Given I complete all wizard steps with valid data
    When I click the "Submit" button
    Then I should see a success message
    And I should be redirected to "/my-apps"
    And the new app should appear in my apps list

  @slow @integration
  Scenario: App is saved to localStorage after submit
    Given I complete all wizard steps with valid data
    When I click the "Submit" button
    Then the app should be saved in localStorage
    And the localStorage should contain the app data
