# TODO: Fix authentication bypass in CI - See GitHub issue
# Temporarily disabled until authentication bypass is fixed for Vercel preview deployments
@skip
Feature: App Creation Wizard - Navigation & Protected Routes
  As a user of the platform
  I want the wizard to be protected and only accessible when authenticated
  So that unauthorized users cannot create apps

  @fast @unit
  Scenario: Wizard redirects unauthenticated users
    Given I am not logged in
    When I navigate to the app creation wizard
    Then I should be redirected to the home page
    And I should see the login options
