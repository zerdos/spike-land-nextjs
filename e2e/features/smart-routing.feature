@smart-routing
Feature: Smart Routing
  As a workspace administrator
  I want to configure smart routing settings and see messages analyzed and routed
  So that I can prioritize urgent customer inquiries

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And I have a workspace named "orbit-test-workspace"

  Scenario: Enable and Configure Smart Routing
    Given I navigate to the "Inbox Smart Routing" settings page for "orbit-test-workspace"
    Then I should see the "Enable Smart Routing" toggle
    When I toggle "Enable Smart Routing" to "on"
    And I toggle "Auto-Analysis" to "on"
    And I set "Negative Sentiment Threshold" to "-0.7"
    And I click the "Save Changes" button
    Then I should see a success toast "Settings saved successfully"

  Scenario: Verify Message Analysis Badges
    Given Smart Routing is enabled for "orbit-test-workspace"
    And I have an inbox item with:
      | content      | I love this product! It's amazing. |
      | sender       | happy_user                         |
    When I navigate to the Inbox for "orbit-test-workspace"
    Then I should see the inbox item "I love this product!"
    And I should see a "positive" sentiment badge on the item
    And I should see a priority badge on the item

  Scenario: Verify Negative Sentiment Escalation
    Given Smart Routing is enabled for "orbit-test-workspace"
    And I have configured auto-escalation for negative sentiment
    And I have an inbox item with:
      | content      | This is terrible service. I'm cancelling. |
      | sender       | angry_user                                |
    When I navigate to the Inbox for "orbit-test-workspace"
    Then I should see the inbox item "This is terrible service."
    And I should see a "negative" sentiment badge on the item
    And the item should be marked as "ESCALATED"

  Scenario: Manual Escalation
    Given Smart Routing is enabled for "orbit-test-workspace"
    And I have an inbox item with:
      | content      | Can I get some help? |
      | sender       | confused_user        |
    When I navigate to the Inbox for "orbit-test-workspace"
    And I click on the inbox item "Can I get some help?"
    And I click the "Escalate" button in the action panel
    Then the item status should change to "ESCALATED"
