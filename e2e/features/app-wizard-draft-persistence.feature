# Authentication bypass fixed in src/auth.ts - See GitHub issue #435
# localStorage timing issues fixed in PR for issue #437
# @skip - Wizard UI was replaced with chat-based interface. See GitHub issue #775.
# These tests need to be rewritten for the new /my-apps/[codeSpace] chat flow.
@skip
Feature: App Creation Wizard - Draft Auto-Save & Persistence
  As an authenticated user
  I want my app creation progress to be automatically saved
  So that I don't lose my work if I leave the page

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  @fast @unit
  Scenario: Draft is saved to localStorage on Step 1 change
    When I type "Draft App" in the "App Name" field
    Then the draft should be saved to localStorage
    And the draft indicator should show "Draft saved"

  @slow @integration
  Scenario: Draft is saved when progressing between steps
    When I complete step 1 with name "Draft Test"
    And I navigate to step 2
    When I type "Draft requirements here for testing" in the "Requirements" field
    Then the draft should be saved to localStorage
    And the draft should contain step 1 and step 2 data

  @slow @integration
  Scenario: Draft is restored on page reload
    Given I complete step 1 with name "Restored App" and description "Will be restored"
    When I reload the page
    Then I should see the wizard step "Basic Info"
    And the "App Name" field should contain "Restored App"
    And the "Description" field should contain "Will be restored"

  @slow @integration
  Scenario: Draft is cleared after successful submission
    Given I complete all wizard steps with valid data
    When I click the "Create App" button
    Then the draft should be removed from localStorage
    And the draft indicator should not be visible

  @slow @integration
  Scenario: Multiple drafts do not interfere (isolation)
    Given I start creating an app as "User1" with name "User1 App"
    When I log out and log in as "User2"
    And I start creating an app with name "User2 App"
    Then the draft should only contain "User2 App"
    And the draft should not contain "User1 App"
