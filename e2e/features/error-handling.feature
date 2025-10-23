Feature: Authentication Error Handling
  As a user
  I want to see clear error messages when authentication fails
  So that I understand what went wrong and how to proceed

  Background:
    Given I am on the home page

  Scenario: Configuration error displays appropriate message
    When I navigate to "/auth/error?error=Configuration"
    Then I should see an error page
    And I should see "There was a problem with the server configuration" message
    And I should see "Try Again" button
    And I should see "Back to Home" button

  Scenario: Access denied error displays appropriate message
    When I navigate to "/auth/error?error=AccessDenied"
    Then I should see an error page
    And I should see "Access denied" message
    And I should see "You do not have permission to sign in" message
    And I should see "Try Again" button
    And I should see "Back to Home" button

  Scenario: OAuth signin error displays appropriate message
    When I navigate to "/auth/error?error=OAuthSignin"
    Then I should see an error page
    And I should see "Error signing in with OAuth provider" message
    And I should see "There was a problem communicating with the authentication provider" message
    And I should see "Try Again" button
    And I should see "Back to Home" button

  Scenario: OAuth callback error displays appropriate message
    When I navigate to "/auth/error?error=OAuthCallback"
    Then I should see an error page
    And I should see "OAuth callback error" message
    And I should see "Try Again" button

  Scenario: OAuth create account error displays appropriate message
    When I navigate to "/auth/error?error=OAuthCreateAccount"
    Then I should see an error page
    And I should see "Could not create OAuth account" message
    And I should see "Try Again" button

  Scenario: Email create account error displays appropriate message
    When I navigate to "/auth/error?error=EmailCreateAccount"
    Then I should see an error page
    And I should see "Could not create email account" message
    And I should see "Try Again" button

  Scenario: Default error message for unknown error
    When I navigate to "/auth/error?error=UnknownError"
    Then I should see an error page
    And I should see "Authentication error" message
    And I should see "Try Again" button
    And I should see "Back to Home" button

  Scenario: Missing error parameter shows default message
    When I navigate to "/auth/error"
    Then I should see an error page
    And I should see "Authentication error" message
    And I should see "An unexpected error occurred during authentication" message
    And I should see "Try Again" button

  Scenario: Try Again button redirects to home page
    When I navigate to "/auth/error?error=Configuration"
    And I click the "Try Again" button
    Then I should be redirected to "/"
    And I should see the "Continue with GitHub" button
    And I should see the "Continue with Google" button

  Scenario: Back to Home button redirects to home page
    When I navigate to "/auth/error?error=AccessDenied"
    And I click the "Back to Home" button
    Then I should be redirected to "/"
    And I should see the "Continue with GitHub" button

  Scenario: Error page displays error code
    When I navigate to "/auth/error?error=Configuration"
    Then I should see an error page
    And I should see error code "Configuration" displayed

  Scenario: Multiple error parameters shows first error
    When I navigate to "/auth/error?error=AccessDenied&error=Configuration"
    Then I should see an error page
    And I should see "Access denied" message
