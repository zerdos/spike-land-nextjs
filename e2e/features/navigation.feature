Feature: Site Navigation
  As a user
  I want to navigate through the application
  So that I can access different features and pages

  Background:
    Given I am on the home page

  # Header Navigation
  Scenario: Logo link returns to homepage from any page
    When I am logged in as "John Doe" with email "john@example.com"
    And I navigate to "/my-apps"
    And I click the logo in the header
    Then I should be redirected to "/"

  Scenario: Title link returns to homepage
    When I am logged in as "Jane Smith" with email "jane@example.com"
    And I navigate to "/settings"
    And I click the site title in the header
    Then I should be redirected to "/"

  Scenario: Auth buttons visible when not logged in
    When I am not logged in
    Then I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button
    And I should not see the user avatar

  Scenario: Avatar visible when logged in
    When I am logged in as "Alice Johnson" with email "alice@example.com"
    Then I should see the user avatar
    And I should not see the "Continue with GitHub" button
    And I should not see the "Continue with Google" button

  # Avatar Dropdown Navigation
  Scenario: Click avatar opens dropdown menu
    When I am logged in as "Bob Builder" with email "bob@example.com"
    And I click on the user avatar
    Then the dropdown menu should be visible
    And I should see "My Apps" option in the dropdown
    And I should see "Profile" option in the dropdown
    And I should see "Settings" option in the dropdown
    And I should see "Log out" option in the dropdown

  Scenario: Click My Apps in dropdown navigates to /my-apps
    When I am logged in as "Charlie Brown" with email "charlie@example.com"
    And I click on the user avatar
    And I click the "My Apps" option in the dropdown
    Then I should be redirected to "/my-apps"

  Scenario: Click Profile in dropdown navigates to /profile
    When I am logged in as "David Davis" with email "david@example.com"
    And I click on the user avatar
    And I click the "Profile" option in the dropdown
    Then I should be redirected to "/profile"

  Scenario: Click Settings in dropdown navigates to /settings
    When I am logged in as "Eve Evans" with email "eve@example.com"
    And I click on the user avatar
    And I click the "Settings" option in the dropdown
    Then I should be redirected to "/settings"

  Scenario: Click outside dropdown closes it
    When I am logged in as "Frank Foster" with email "frank@example.com"
    And I click on the user avatar
    And the dropdown menu should be visible
    And I click outside the dropdown
    Then the dropdown menu should not be visible

  Scenario: Clicking avatar again closes dropdown
    When I am logged in as "Grace Green" with email "grace@example.com"
    And I click on the user avatar
    And the dropdown menu should be visible
    And I click on the user avatar
    Then the dropdown menu should not be visible

  # Browser Navigation
  Scenario: Browser back button works correctly
    When I am logged in as "Henry Hill" with email "henry@example.com"
    And I navigate to "/my-apps"
    And I navigate to "/settings"
    And I use the browser back button
    Then I should be on "/my-apps"

  Scenario: Browser forward button works correctly
    When I am logged in as "Iris Ivanov" with email "iris@example.com"
    And I navigate to "/my-apps"
    And I navigate to "/settings"
    And I use the browser back button
    And I use the browser forward button
    Then I should be on "/settings"

  Scenario: Deep linking works for authenticated users
    When I am logged in as "Jack Jackson" with email "jack@example.com"
    And I directly access "/my-apps" via URL
    Then I should be on "/my-apps"
    And I should see "My Apps" heading

  Scenario: Navigation preserves authentication state
    When I am logged in as "Karen King" with email "karen@example.com"
    And I navigate to "/my-apps"
    And I navigate to "/profile"
    And I navigate to "/settings"
    Then I should still be logged in
    And I should see the user avatar

  # Footer Navigation (if footer exists)
  Scenario: Footer links are accessible
    When I am on the home page
    Then the footer should be visible
    And all footer links should be clickable

  Scenario: Dropdown remains open during keyboard navigation
    When I am logged in as "Larry Lewis" with email "larry@example.com"
    And I click on the user avatar
    And I press the Tab key
    Then the dropdown menu should remain visible
