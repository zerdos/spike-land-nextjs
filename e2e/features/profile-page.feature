Feature: User Profile Page
  As an authenticated user
  I want to view my profile information
  So that I can see my account details

  Background:
    Given I am logged in as "Alice Smith" with email "alice@example.com"

  Scenario: Visit profile page when authenticated
    When I navigate to the profile page
    Then I should see the profile page title
    And the page URL should be "/profile"

  Scenario: User information is displayed correctly
    When I navigate to the profile page
    Then I should see my name "Alice Smith"
    And I should see my email "alice@example.com"

  Scenario: User ID is displayed
    When I navigate to the profile page
    Then I should see my user ID
    And the user ID should not be empty

  Scenario: User initials shown when no avatar image
    When I am logged in as "Bob Builder" without an avatar image
    And I navigate to the profile page
    Then I should see the avatar with initials "BB"

  Scenario: Custom avatar image displayed when available
    When I am logged in as "Charlie Brown" with avatar image "https://example.com/charlie.jpg"
    And I navigate to the profile page
    Then I should see the custom avatar image
    And the avatar should display the image from "https://example.com/charlie.jpg"

  Scenario: Profile page shows correct email format
    When I navigate to the profile page
    Then the displayed email should be a valid email format
    And the email should contain "@" symbol

  Scenario: Profile page is accessible via navigation
    Given I am on the home page
    When I click on the user avatar
    And I click the "Profile" option in the dropdown
    Then I should be on the profile page
    And I should see my profile information

  Scenario: Protected route redirects unauthenticated users
    Given I am not logged in
    When I navigate to the profile page
    Then I should be redirected to the home page
    And I should see the login options

  Scenario: Profile data persists across page reloads
    When I navigate to the profile page
    And I note my displayed information
    And I reload the page
    Then I should see the same profile information
    And my name should still be "Alice Smith"
    And my email should still be "alice@example.com"
