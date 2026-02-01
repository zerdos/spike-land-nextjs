@onboarding
Feature: Orbit Onboarding
  As a new user
  I want to create my first workspace
  So that I can start using the Orbit platform

  As an existing user
  I want to be redirected to my last workspace
  So that I can continue my work

  Background:
    Given I am on the home page

  Scenario: New user is redirected to onboarding
    When I am logged in as "New Orbit User" with email "newuser@example.com"
    And I navigate to "/orbit"
    Then I should be on the "/orbit/onboarding" page
    And I should see "Welcome to Orbit" heading

  Scenario: Onboarding page has correct elements
    When I am logged in as "New Orbit User" with email "newuser@example.com"
    And I navigate to "/orbit/onboarding"
    Then I should see "Welcome to Orbit" heading
    And I should see "Workspace Name" text
    And I should see the "Create Workspace" button

  @skip
  # SKIP REASON: Requires seeding workspaces via API or database to test redirect to dashboard
  # TRACKING: Add to backlog after workspace seeding utilities are implemented
  Scenario: Existing user is redirected to dashboard
    When I am logged in as "Existing User" with email "existing@example.com"
    And I visit "/orbit"
    Then I should be on the "/orbit" page
