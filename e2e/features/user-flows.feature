Feature: Complete User Flows
  As a user
  I want to complete common workflows
  So that I can accomplish my goals efficiently

  # Complete Onboarding Flow
  Scenario: New user complete onboarding via GitHub
    Given I am on the home page
    When I am not logged in
    Then I should see sign-in options
    When I click the "Continue with GitHub" button
    And I complete GitHub authentication as "New User" with email "newuser@example.com"
    Then I should return to the homepage
    And I should see the user avatar
    When I click on the user avatar
    Then I should see "New User" in the dropdown
    And I should see "newuser@example.com" in the dropdown

  Scenario: New user complete onboarding via Google
    Given I am on the home page
    When I am not logged in
    Then I should see sign-in options
    When I click the "Continue with Google" button
    And I complete Google authentication as "Google User" with email "googleuser@example.com"
    Then I should return to the homepage
    And I should see the user avatar
    When I click on the user avatar
    Then I should see "Google User" in the dropdown
    And I should see "googleuser@example.com" in the dropdown

  Scenario: User explores My Apps section
    When I am logged in as "John Doe" with email "john@example.com"
    And I click on the user avatar
    And I click the "My Apps" option in the dropdown
    Then I should be on "/my-apps"
    And I should see "My Apps" heading

  Scenario: User views profile information
    When I am logged in as "Jane Smith" with email "jane@example.com"
    And I click on the user avatar
    And I click the "Profile" option in the dropdown
    Then I should be on "/profile"
    And I should see "Profile" heading

  Scenario: User accesses settings
    When I am logged in as "Alice Johnson" with email "alice@example.com"
    And I click on the user avatar
    And I click the "Settings" option in the dropdown
    Then I should be on "/settings"
    And I should see "Settings" heading

  Scenario: User logs out and returns to unauthenticated state
    When I am logged in as "Bob Builder" with email "bob@example.com"
    And I click on the user avatar
    And I click the "Log out" option in the dropdown
    Then I should be logged out
    And I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button
    And I should not see the user avatar

  Scenario: User session persists across page refreshes
    When I am logged in as "Charlie Brown" with email "charlie@example.com"
    And I navigate to "/my-apps"
    And I refresh the page
    Then I should still be logged in
    And I should be on "/my-apps"
    And I should see the user avatar

  Scenario: User navigates through multiple sections
    When I am logged in as "David Davis" with email "david@example.com"
    And I navigate to "/my-apps"
    Then I should see "My Apps" heading
    When I navigate to "/profile"
    Then I should see "Profile" heading
    When I navigate to "/settings"
    Then I should see "Settings" heading
    When I navigate to "/"
    Then I should be on the home page
    And I should still be logged in

  Scenario: Protected route redirects then returns after login
    When I am not logged in
    And I navigate to "/my-apps"
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fmy-apps"
    When I complete GitHub authentication as "Eve Evans" with email "eve@example.com"
    Then I should be redirected to "/my-apps"
    And I should see "My Apps" heading

  Scenario: User accesses protected route directly after login
    When I am not logged in
    And I navigate to "/"
    And I complete GitHub authentication as "Frank Foster" with email "frank@example.com"
    And I navigate to "/settings"
    Then I should be on "/settings"
    And I should see "Settings" heading

  Scenario: Multiple navigation interactions in one session
    When I am logged in as "Grace Green" with email "grace@example.com"
    And I click on the user avatar
    And I click the "My Apps" option in the dropdown
    Then I should be on "/my-apps"
    When I click the logo in the header
    Then I should be on "/"
    When I click on the user avatar
    And I click the "Settings" option in the dropdown
    Then I should be on "/settings"
    When I use the browser back button
    Then I should be on "/"

  Scenario: User identity persists across navigation
    When I am logged in as "Henry Hill" with email "henry@example.com"
    And I navigate to "/my-apps"
    And I click on the user avatar
    Then I should see "Henry Hill" in the dropdown
    When I navigate to "/settings"
    And I click on the user avatar
    Then I should see "Henry Hill" in the dropdown
    When I navigate to "/"
    And I click on the user avatar
    Then I should see "Henry Hill" in the dropdown
