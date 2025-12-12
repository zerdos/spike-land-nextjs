
Feature: Browser Agent Boxes
  As a user
  I want to manage my browser agent boxes
  So that I can run isolated browser environments

  Background:
    Given I am logged in as a test user

  Scenario: View empty boxes list
    When I visit "/boxes"
    Then I should see "My Boxes" heading
    And I should see "Create New Box" button

  Scenario: Create a new box
    Given I visit "/boxes/new"
    When I select the "Standard" tier
    And I enter "My First Agent" into the box name field
    And I click the "Create Box" button
    Then I should be on the "/boxes" page
    And I should see "My First Agent" text
    And I should see "Standard Tier" text
