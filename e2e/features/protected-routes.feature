@skip
Feature: Protected Routes
  As a user
  I want certain routes to require authentication
  So that my personal data remains secure

  Background:
    Given I am on the home page

  Scenario: Unauthenticated user accessing /my-apps redirects to home with callback
    When I am not logged in
    And I navigate to "/my-apps"
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fmy-apps"

  Scenario: Unauthenticated user accessing /settings redirects to home with callback
    When I am not logged in
    And I navigate to "/settings"
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fsettings"

  Scenario: Unauthenticated user accessing /profile redirects to home with callback
    When I am not logged in
    And I navigate to "/profile"
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fprofile"

  Scenario: Unauthenticated user accessing /my-apps/new redirects with callback
    When I am not logged in
    And I navigate to "/my-apps/new"
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fmy-apps%2Fnew"

  Scenario: After GitHub authentication redirects to callback URL
    When I am not logged in
    And I navigate to "/?callbackUrl=%2Fmy-apps"
    And I complete GitHub authentication as "John Doe" with email "john@example.com"
    Then I should be redirected to "/my-apps"

  Scenario: After Google authentication redirects to callback URL
    When I am not logged in
    And I navigate to "/?callbackUrl=%2Fsettings"
    And I complete Google authentication as "Jane Smith" with email "jane@example.com"
    Then I should be redirected to "/settings"

  Scenario: Authenticated user can access /my-apps
    When I am logged in as "Alice Johnson" with email "alice@example.com"
    And I navigate to "/my-apps"
    Then I should remain on "/my-apps"
    And I should see "My Apps" heading

  Scenario: Authenticated user can access /profile
    When I am logged in as "Bob Builder" with email "bob@example.com"
    And I navigate to "/profile"
    Then I should remain on "/profile"
    And I should see "Profile" heading

  Scenario: Authenticated user can access /settings
    When I am logged in as "Charlie Brown" with email "charlie@example.com"
    And I navigate to "/settings"
    Then I should remain on "/settings"
    And I should see "Settings" heading

  Scenario: Public routes accessible without authentication
    When I am not logged in
    And I navigate to "/"
    Then I should remain on "/"
    And I should not be redirected

  Scenario: Middleware correctly identifies protected paths
    When I am not logged in
    And I attempt to access the following protected routes:
      | /my-apps  |
      | /settings |
      | /profile  |
    Then all routes should redirect to home with callback URLs

  Scenario: Session expiry redirects to signin with callback
    When I am logged in as "David Davis" with email "david@example.com"
    And I navigate to "/my-apps"
    And my session expires
    Then I should be redirected to "/"
    And the URL should contain "callbackUrl=%2Fmy-apps"
