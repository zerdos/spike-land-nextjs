@learnit
Feature: LearnIt Interactive Wiki

  Background:
    When I directly access "/" via URL

  @learnit
  Scenario: Search and Navigate
    When I directly access "/learnit" via URL
    Then I should see "Learn anything."
    When I type "testing" in the "learnit-search" field
    And I click "Go" button
    Then I should be redirected to "/learnit/testing"

  @learnit
  Scenario: Generate Content (Mocked)
    Given I am logged in as a test user
    When I directly access "/learnit/new-topic" via URL
    Then I should see "Topic Not Found"
    When I click "Generate Tutorial" button
    Then I should see "Creating your tutorial"
    # Note: In real E2E, we'd need to mock the API or wait for generation
    # For now we just verify the UI flow up to generation
