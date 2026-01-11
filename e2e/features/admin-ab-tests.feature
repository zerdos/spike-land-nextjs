@requires-db
Feature: Admin A/B Testing
  As an admin user
  I want to create and manage A/B tests
  So that I can optimize marketing content and strategies

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"

  Scenario: Admin can create and manage A/B tests
    Given the user is an admin
    When I visit "/admin/marketing/ab-tests"
    Then I should be on the "/admin/marketing/ab-tests" page
    And I should see "A/B Tests" text

    When I click the "Create New Test" button
    Then I should see "Create New A/B Test" dialog

    When I fill in "Test Name" with "Homepage CTA Button Color"
    And I fill in "Description" with "Testing the color of the main CTA on the homepage"
    And I fill in the first "Variant Name" with "Blue Button"
    And I fill in the first "Split Percentage" with "50"
    And I fill in the second "Variant Name" with "Green Button"
    And I fill in the second "Split Percentage" with "50"
    And I click the "Create Test" button
    Then I should see "Homepage CTA Button Color" in the table

    When I click on the "Homepage CTA Button Color" row
    Then I should be on the "/admin/marketing/ab-tests/1" page
    And I should see "Homepage CTA Button Color" text
    And I should see "Blue Button" text
    And I should see "Green Button" text

    When I click the "Start Test" button
    Then I should see "RUNNING" status

    When I click the "End Test" button
    Then I should see "COMPLETED" status

    When I click the "Archive Test" button
    Then I should see "ARCHIVED" status
