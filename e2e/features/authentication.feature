Feature: User Authentication
  As a user
  I want to authenticate with my account
  So that I can access personalized features

  Background:
    Given I am on the home page

  Scenario: Unauthenticated user sees login options
    When I am not logged in
    Then I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button
    And I should not see the user avatar

  Scenario: User can initiate GitHub login
    When I am not logged in
    And I click the "Continue with GitHub" button
    Then the GitHub authentication flow should be initiated

  Scenario: User can initiate Google login
    When I am not logged in
    And I click the "Continue with Google" button
    Then the Google authentication flow should be initiated

  Scenario: Authenticated user sees avatar
    When I am logged in as "John Doe" with email "john@example.com"
    Then I should see the user avatar
    And I should not see the "Continue with GitHub" button
    And I should not see the "Continue with Google" button

  Scenario: Authenticated user can open avatar dropdown
    When I am logged in as "Jane Smith" with email "jane@example.com"
    And I click on the user avatar
    Then I should see the dropdown menu
    And I should see "Jane Smith" in the dropdown
    And I should see "jane@example.com" in the dropdown
    And I should see "Profile" option in the dropdown
    And I should see "Settings" option in the dropdown
    And I should see "Log out" option in the dropdown

  Scenario: User can sign out from dropdown menu
    When I am logged in as "Alice Johnson" with email "alice@example.com"
    And I click on the user avatar
    And I click the "Log out" option in the dropdown
    Then I should be logged out
    And I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button
    And I should not see the user avatar

  Scenario: Loading state is displayed during authentication
    When authentication is loading
    Then I should see the loading spinner in the header

  Scenario: User avatar shows initials when no image is available
    When I am logged in as "Bob Builder" without an avatar image
    Then I should see the user avatar
    And the avatar should display "BB" as initials

  Scenario: User avatar shows custom image when available
    When I am logged in as "Charlie Brown" with avatar image "https://example.com/avatar.jpg"
    Then I should see the user avatar
    And the avatar should display the custom image
