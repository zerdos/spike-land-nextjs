# Authentication bypass fixed in src/auth.ts - See GitHub issue #435
Feature: App Creation Wizard - Step 3: Monetization
  As an authenticated user
  I want to choose a monetization model for my app
  So that I can decide how my app will generate revenue

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  @fast @unit
  Scenario: Step 3 monetization options are displayed
    Given I complete step 1 and 2 with valid data
    Then I should see the wizard step "Monetization"
    And I should see the "Free" monetization option
    And I should see the "Paid" monetization option
    And I should see the "Freemium" monetization option
    And I should see the "Subscription" monetization option
    And I should see the "Back" button
    And I should see the "Next" button

  @fast @unit
  Scenario: Progress bar shows 75% on Step 3
    Given I complete step 1 and 2 with valid data
    Then the progress bar should show 75%
    And the progress text should say "Step 3 of 4"

  @fast @unit
  Scenario: Select Free monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Free" monetization option
    Then the "Free" option should be selected
    And the "Next" button should be enabled

  @fast @unit
  Scenario: Select Paid monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Paid" monetization option
    Then the "Paid" option should be selected
    And I should see the price input field
    And the "Next" button should be enabled

  @fast @unit
  Scenario: Select Freemium monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Freemium" monetization option
    Then the "Freemium" option should be selected
    And the "Next" button should be enabled

  @fast @unit
  Scenario: Select Subscription monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Subscription" monetization option
    Then the "Subscription" option should be selected
    And I should see the price input field
    And the "Next" button should be enabled

  @fast @integration
  Scenario: Back button from Step 3 preserves previous data
    Given I complete step 1 and 2 with valid data
    When I click the "Back" button
    Then I should see the wizard step "Requirements"
    And the requirements data should be preserved

  @fast @integration
  Scenario: Successfully proceed to Step 4 Review
    Given I complete step 1 and 2 with valid data
    When I select the "Free" monetization option
    And I click the "Next" button
    Then I should see the wizard step "Review"
    And the progress bar should show 100%
