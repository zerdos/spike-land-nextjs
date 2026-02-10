@smoke @unauthenticated
Feature: Unauthenticated Smoke Tests
  As a tester
  I want to verify public pages load correctly without session interference
  So that I can ensure the application is accessible to new users

  @fast @requires-no-session
  Scenario: Sign in page loads
    Given I disable auth bypass
    And I have cleared all cookies
    When I visit "/auth/signin"
    Then the page should load successfully
    And I should see "Sign In" or "Sign in" text

  @fast @requires-no-session
  Scenario: Public landing page loads
    Given I have cleared all cookies
    When I visit "/"
    Then the page should load successfully
    And I should see "Sign In" or "Sign in" option
