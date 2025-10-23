Feature: User Settings Page
  As an authenticated user
  I want to manage my account settings
  So that I can customize my preferences and privacy

  Background:
    Given I am logged in as "David Jones" with email "david@example.com"

  Scenario: Visit settings page when authenticated
    When I navigate to the settings page
    Then I should see the settings page title
    And the page URL should be "/settings"

  Scenario: Three tabs are displayed on settings page
    When I navigate to the settings page
    Then I should see the "Profile" tab
    And I should see the "Preferences" tab
    And I should see the "Privacy" tab

  Scenario: Profile tab is active by default
    When I navigate to the settings page
    Then the "Profile" tab should be active
    And the "Preferences" tab should not be active
    And the "Privacy" tab should not be active

  Scenario: Click Preferences tab shows preferences content
    When I navigate to the settings page
    And I click the "Preferences" tab
    Then the "Preferences" tab should be active
    And I should see the preferences content
    And I should see notification settings

  Scenario: Click Privacy tab shows privacy content
    When I navigate to the settings page
    And I click the "Privacy" tab
    Then the "Privacy" tab should be active
    And I should see the privacy content
    And I should see privacy controls

  Scenario: Profile tab shows user information
    When I navigate to the settings page
    And I click the "Profile" tab
    Then I should see the profile content
    And I should see my name "David Jones"
    And I should see my email "david@example.com"
    And I should see my avatar

  Scenario: Preferences tab shows notification toggles
    When I navigate to the settings page
    And I click the "Preferences" tab
    Then I should see the email notifications toggle
    And I should see the push notifications toggle
    And I should see the marketing emails toggle

  Scenario: Toggle email notifications preference
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the email notifications setting
    Then the email notifications state should change
    And the change should be reflected in the UI

  Scenario: Toggle push notifications preference
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the push notifications setting
    Then the push notifications state should change

  Scenario: Privacy tab shows profile visibility options
    When I navigate to the settings page
    And I click the "Privacy" tab
    Then I should see the profile visibility setting
    And I should see the "Public" visibility option
    And I should see the "Private" visibility option
    And I should see the "Friends Only" visibility option

  Scenario: Privacy tab shows delete account button
    When I navigate to the settings page
    And I click the "Privacy" tab
    Then I should see the "Delete Account" button
    And the button should be styled as destructive action

  Scenario: Delete account dialog opens when button clicked
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I click the "Delete Account" button
    Then I should see the delete account confirmation dialog
    And I should see the confirmation message
    And I should see the "Confirm Delete" button
    And I should see the "Cancel" button

  Scenario: Cancel button closes delete account dialog
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I click the "Delete Account" button
    And I click the "Cancel" button in the dialog
    Then the delete account dialog should be closed
    And I should still be on the settings page

  Scenario: Save changes button is visible
    When I navigate to the settings page
    Then I should see the "Save Changes" button

  Scenario: Settings persist across tabs
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the email notifications setting
    And I click the "Profile" tab
    And I click the "Preferences" tab
    Then the email notifications state should be persisted

  Scenario: Protected route redirects unauthenticated users
    Given I am not logged in
    When I navigate to the settings page
    Then I should be redirected to the home page
    And I should see the login options

  Scenario: Settings page accessible via navigation
    Given I am on the home page
    When I click on the user avatar
    And I click the "Settings" option in the dropdown
    Then I should be on the settings page
    And I should see the settings tabs
