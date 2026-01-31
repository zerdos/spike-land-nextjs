Feature: Competitor Tracking

  @skip
  # SKIP REASON: Missing step definitions for competitor page and actions
  # TRACKING: See docs/SKIPPED_TESTS.md - E2E Category G
  Scenario: Add and delete a competitor
    Given I am on the "/competitors" page
    When I fill in "platform" with "TWITTER"
    And I fill in "handle" with "@test"
    And I fill in "name" with "Test Competitor"
    And I click the "Add Competitor" button
    Then I should see "Test Competitor" in the table
    When I click the "Delete" button for "Test Competitor"
    Then I should not see "Test Competitor" in the table
