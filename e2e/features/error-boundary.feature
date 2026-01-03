@fast
Feature: Error Pages and Error Boundaries
  As a user
  I want to see clear error messages when something goes wrong
  So that I understand the problem and can take appropriate action

  # Auth Error Page Tests
  Scenario: Auth error page displays for configuration error
    When I visit "/auth/error?error=Configuration"
    Then the page should load successfully
    And I should see "Authentication Error" text
    And I should see "Server Configuration Error" text
    And I should see "Try Again" text
    And I should see "Back to Home" text

  Scenario: Auth error page displays for access denied
    When I visit "/auth/error?error=AccessDenied"
    Then the page should load successfully
    And I should see "Authentication Error" text
    And I should see "Access Denied" text
    And I should see "You do not have permission to sign in" text

  Scenario: Auth error page displays for OAuth error
    When I visit "/auth/error?error=OAuthSignin"
    Then the page should load successfully
    And I should see "Authentication Error" text
    And I should see "OAuth Sign In Error" text

  Scenario: Auth error page displays default message for unknown error
    When I visit "/auth/error?error=SomeUnknownError"
    Then the page should load successfully
    And I should see "Authentication Error" text
    And I should see "An unexpected error occurred during authentication" text

  Scenario: Auth error page without error parameter shows default message
    When I visit "/auth/error"
    Then the page should load successfully
    And I should see "Authentication Error" text

  @requires-no-session
  Scenario: Auth error page Try Again button navigates to sign in
    When I visit "/auth/error?error=Configuration"
    And I click the "Try Again" link
    Then I should be on the "/auth/signin" page

  Scenario: Auth error page Back to Home button navigates to homepage
    When I visit "/auth/error?error=Configuration"
    And I click the "Back to Home" link
    Then I should be on the "/" page

  Scenario: Auth error page displays error code
    When I visit "/auth/error?error=OAuthCallback"
    Then the page should load successfully
    And I should see "OAuthCallback" text

  # 404 Error Page Tests
  Scenario: 404 page displays for non-existent route
    When I visit "/this-route-definitely-does-not-exist-12345"
    Then I should see a 404 or not found page

  Scenario: 404 page displays for invalid nested route
    When I visit "/admin/this-is-not-a-valid-admin-page"
    Then the page should load successfully

  # Error Recovery Tests
  @requires-no-session
  Scenario: Users can recover from auth error by trying again
    When I visit "/auth/error?error=Verification"
    Then the page should load successfully
    And I should see "Verification Error" text
    And I should see "Try Again" text
    When I click the "Try Again" link
    Then I should be on the "/auth/signin" page
    And I should see "Sign" text
