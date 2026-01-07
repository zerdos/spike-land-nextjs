# TODO: Fix authentication testing in CI - See issue #23
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

  # TODO: Fix OAuth flow testing in CI - See issue #23
  @skip
  Scenario: User can initiate GitHub login
    When I am not logged in
    And I click the "Continue with GitHub" button
    Then the GitHub authentication flow should be initiated

  @skip
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

  # Navigation from Avatar Dropdown

  Scenario: Navigate to My Apps from avatar dropdown
    When I am logged in as "John Doe" with email "john@example.com"
    And I click on the user avatar
    And I click the "My Apps" option in the dropdown
    Then I should be on the "/my-apps" page
    And I should see "My Apps" heading

  Scenario: Navigate to Profile from avatar dropdown
    When I am logged in as "Jane Smith" with email "jane@example.com"
    And I click on the user avatar
    And I click the "Profile" option in the dropdown
    Then I should be on the "/profile" page
    And I should see "Profile" heading

  Scenario: Navigate to Settings from avatar dropdown
    When I am logged in as "Alice Johnson" with email "alice@example.com"
    And I click on the user avatar
    And I click the "Settings" option in the dropdown
    Then I should be on the "/settings" page
    And I should see "Settings" heading

  # Protected Route Redirection

  Scenario: Unauthenticated user redirected from My Apps
    When I am not logged in
    And I visit "/my-apps"
    Then I should be on the "/auth/signin" page

  Scenario: Unauthenticated user redirected from Settings
    When I am not logged in
    And I visit "/settings"
    Then I should be on the "/auth/signin" page

  Scenario: Unauthenticated user redirected from Profile with callbackUrl
    When I am not logged in
    And I visit "/profile"
    Then I should be on the "/auth/signin" page
    And the URL should contain "callbackUrl=/profile"

  Scenario: User redirected to callbackUrl after login
    When I am not logged in
    And I visit "/settings"
    And I am logged in as "Bob Builder" with email "bob@example.com"
    Then I should be on the "/settings" page

  # Sign-In Page

  Scenario: Visit sign-in page directly
    When I visit "/auth/signin"
    Then I should be on the "/auth/signin" page
    And I should see "Welcome to Spike Land" heading
    And I should see "Sign in to access your apps" text
    And I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button
    And I should see "Back to home" link
    And I should see "By signing in, you agree to our Terms of Service and Privacy Policy" text

  Scenario: Sign-in page displays error message for OAuthCallback error
    When I visit "/auth/signin?error=OAuthCallback"
    Then I should be on the "/auth/signin" page
    And I should see error message "Error during OAuth callback"

  Scenario: Sign-in page displays error message for SessionRequired error
    When I visit "/auth/signin?error=SessionRequired"
    Then I should be on the "/auth/signin" page
    And I should see error message "Please sign in to access this page"

  Scenario: Sign-in page displays error message for CredentialsSignin error
    When I visit "/auth/signin?error=CredentialsSignin"
    Then I should be on the "/auth/signin" page
    And I should see error message "Sign in failed. Check your credentials"

  Scenario: Sign-in page back to home link works
    When I visit "/auth/signin"
    And I click the "Back to home" link
    Then I should be on the "/" page

  # Auth Error Page

  Scenario: Auth error page displays Configuration error
    When I visit "/auth/error?error=Configuration"
    Then I should be on the "/auth/error" page
    And I should see "Authentication Error" heading
    And I should see error title "Server Configuration Error"
    And I should see error description containing "server configuration"
    And I should see "Try Again" button
    And I should see "Back to Home" button
    And I should see error code "Configuration"

  Scenario: Auth error page displays AccessDenied error
    When I visit "/auth/error?error=AccessDenied"
    Then I should be on the "/auth/error" page
    And I should see error title "Access Denied"
    And I should see error description containing "do not have permission"
    And I should see error code "AccessDenied"

  Scenario: Auth error page displays OAuthAccountNotLinked error
    When I visit "/auth/error?error=OAuthAccountNotLinked"
    Then I should be on the "/auth/error" page
    And I should see error title "Account Already Linked"
    And I should see error description containing "already associated with another account"
    And I should see error code "OAuthAccountNotLinked"

  Scenario: Auth error page displays default error when no error parameter
    When I visit "/auth/error"
    Then I should be on the "/auth/error" page
    And I should see error title "Authentication Error"
    And I should see error description containing "unexpected error"

  Scenario: Auth error page Try Again button navigates to sign-in
    When I visit "/auth/error?error=Configuration"
    And I click the "Try Again" button
    Then I should be on the "/auth/signin" page

  Scenario: Auth error page Back to Home button navigates to home
    When I visit "/auth/error?error=AccessDenied"
    And I click the "Back to Home" button
    Then I should be on the "/" page
