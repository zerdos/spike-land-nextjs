@requires-db
Feature: Allocator Autopilot

  Background:
    Given I am logged in with email "test@spike.land"
    And I have a workspace "test-workspace"
    And I have connected ad accounts for the workspace

  Scenario: Enable and configure autopilot
    Given I am on the allocator dashboard for "test-workspace"
    When I click the "Autopilot" switch
    Then I should see a success message "Autopilot enabled"
    And I click the settings icon
    Then I should see the autopilot configuration panel
    When I select "Moderate" from the "Aggressiveness Mode" dropdown
    And I set "Max Daily Budget Change" to "15"
    And I set "Max Single Change" to "10"
    And I set "Require Approval Above" to "1000"
    And I click "Save Configuration"
    Then I should see a success message "Autopilot configuration updated"

  Scenario: Verify autopilot execution history and rollback
    Given I have existing autopilot executions for "test-workspace"
    When I am on the allocator dashboard for "test-workspace"
    And I open the autopilot configuration panel
    Then I should see a list of past executions
    When I click the rollback button for the most recent execution
    And I confirm the rollback action
    Then I should see a success message "Rollback successful"
    And the execution status should be updated to "Rolled back"

  Scenario: Safety limits prevention
    Given I have enabled autopilot with max daily change of 10%
    And I have a campaign with budget 100
    When a recommendation suggests increasing budget to 120
    Then the autopilot should skip execution with reason "exceeds single move limit"
    And I should see a "SKIPPED" record in the execution history


  Scenario: Prevent budget below floor
    Given I have enabled autopilot with min budget 500
    And I have a campaign with budget 600
    When a recommendation suggests decreasing budget to 400
    Then the autopilot should skip execution with reason "below floor"

  Scenario: Prevent budget above ceiling
    Given I have enabled autopilot with max budget 1000
    And I have a campaign with budget 900
    When a recommendation suggests increasing budget to 1100
    Then the autopilot should skip execution with reason "exceeds ceiling"

  Scenario: Prevent changes during cool-down
    Given I have enabled autopilot with cooldown of 60 minutes
    And I have a campaign that was updated 10 minutes ago
    When a recommendation suggests increasing budget
    Then the autopilot should skip execution with reason "Cool-down active"

  Scenario: Emergency Stop
    Given I have enabled autopilot
    And I activate emergency stop
    When a recommendation suggests increasing budget
    Then the autopilot should skip execution with reason "Emergency stop is active"
