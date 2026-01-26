@allocator @audit @skip
Feature: Allocator Audit Trail
  As an admin
  I want to see the audit trail of allocator decisions
  So that I can verify the autopilot actions

  Background:
    Given I log in as a user
    And I have a workspace "audit-workspace"
    And I switch to workspace "audit-workspace"

  Scenario: Viewing audit logs from autopilot execution
    Given I have a campaign "Audit Campaign 1" with budget 1000
    And I have enabled autopilot for "Audit Campaign 1"
    When I trigger the allocator autopilot cron job
    And I navigate to the Allocator Audit page
    Then I should see an audit log entry for "RECOMMENDATION_GENERATED"
    And the audit log trigger should be "CRON"
    And the audit log outcome should be "EXECUTED"

  Scenario: Filtering audit logs
    Given I see the audit log table
    When I search for "Audit Campaign 1"
    Then I should see "Audit Campaign 1" in the results
