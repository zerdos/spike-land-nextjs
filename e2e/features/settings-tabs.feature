@skip
Feature: Settings Page Tab Interactions
  As an authenticated user
  I want to interact with all settings tabs
  So that I can manage my account, API keys, preferences, and privacy

  Background:
    Given I am logged in as "David Jones" with email "david@example.com"

  # Profile Tab Scenarios
  @fast @requires-db
  Scenario: Profile tab shows user avatar
    When I navigate to the settings page
    Then I should see the user avatar in profile section
    And the avatar should display user initials if no image

  @slow @requires-db
  Scenario: Edit display name in profile tab
    When I navigate to the settings page
    And I click the "Profile" tab
    And I enter "New Display Name" in the display name field
    And I click the "Save Changes" button
    Then I should see the saving state
    And the save should complete

  @fast @requires-db
  Scenario: Email field is disabled in profile tab
    When I navigate to the settings page
    And I click the "Profile" tab
    Then the email field should be disabled
    And I should see the OAuth managed message

  # API Keys Tab Scenarios
  @fast @requires-db
  Scenario: API Keys tab shows create button
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see the "Create API Key" button
    And I should see the API key instructions

  @slow @requires-db
  Scenario: Create API key with valid name
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter "My Test Key" in the key name field
    And I click the "Create Key" button
    Then I should see the API key created success dialog
    And I should see the generated API key
    And I should see the copy warning message

  @slow @requires-db
  Scenario: Copy newly created API key
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter "Copy Key Test" in the key name field
    And I click the "Create Key" button
    And I click the copy API key button
    Then I should see the copy success indicator

  @fast @requires-db
  Scenario: API key name validation - empty name
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    Then the "Create Key" button should be disabled

  @slow @requires-db
  Scenario: Delete API key with confirmation
    Given I have created an API key named "Key To Delete"
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the delete button for "Key To Delete" key
    Then I should see the delete confirmation dialog
    When I confirm the deletion
    Then the key should be removed from the list

  @slow @requires-db
  Scenario: Cancel API key deletion
    Given I have created an API key named "Keep This Key"
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the delete button for "Keep This Key" key
    And I cancel the deletion confirmation
    Then the key should still be in the list

  @fast @requires-db
  Scenario: API Keys tab shows usage instructions
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see REST API usage instructions
    And I should see MCP Server usage instructions

  # Preferences Tab Scenarios
  @fast @requires-db
  Scenario: Preferences tab shows notification toggles
    When I navigate to the settings page
    And I click the "Preferences" tab
    Then I should see the email notifications toggle
    And I should see the push notifications toggle

  @slow @requires-db
  Scenario: Toggle email notifications
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the email notifications switch
    Then the email notifications should be toggled

  @slow @requires-db
  Scenario: Toggle push notifications
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the push notifications switch
    Then the push notifications should be toggled

  @slow @requires-db
  Scenario: Preference changes persist across tabs
    When I navigate to the settings page
    And I click the "Preferences" tab
    And I toggle the email notifications switch
    And I click the "Profile" tab
    And I click the "Preferences" tab
    Then the email notifications toggle should reflect the change

  # Privacy Tab Scenarios
  @fast @requires-db
  Scenario: Privacy tab shows profile visibility toggle
    When I navigate to the settings page
    And I click the "Privacy" tab
    Then I should see the public profile toggle
    And I should see the show activity toggle

  @slow @requires-db
  Scenario: Toggle public profile setting
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I toggle the public profile switch
    Then the public profile setting should be toggled

  @slow @requires-db
  Scenario: Toggle show activity setting
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I toggle the show activity switch
    Then the show activity setting should be toggled

  @fast @requires-db
  Scenario: Privacy tab shows danger zone
    When I navigate to the settings page
    And I click the "Privacy" tab
    Then I should see the "Danger Zone" section
    And I should see the "Delete Account" button
    And the delete button should be styled as destructive

  @slow @requires-db
  Scenario: Delete account confirmation dialog
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I click the "Delete Account" button
    Then I should see the delete account dialog
    And I should see the warning message about permanent deletion
    And I should see the "Cancel" button
    And I should see the "Delete Account" confirmation button

  @slow @requires-db
  Scenario: Cancel delete account dialog
    When I navigate to the settings page
    And I click the "Privacy" tab
    And I click the "Delete Account" button
    And I click the "Cancel" button
    Then the delete dialog should be closed
    And I should still be on the settings page

  # Tab Navigation Scenarios
  @fast @requires-db
  Scenario: All four tabs are visible
    When I navigate to the settings page
    Then I should see the "Profile" tab
    And I should see the "API Keys" tab
    And I should see the "Preferences" tab
    And I should see the "Privacy" tab

  @fast @requires-db
  Scenario: Profile tab is active by default
    When I navigate to the settings page
    Then the "Profile" tab should be active
    And the "API Keys" tab should not be active
    And the "Preferences" tab should not be active
    And the "Privacy" tab should not be active

  @slow @requires-db
  Scenario: Navigate through all tabs
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then the "API Keys" tab should be active
    When I click the "Preferences" tab
    Then the "Preferences" tab should be active
    When I click the "Privacy" tab
    Then the "Privacy" tab should be active
    When I click the "Profile" tab
    Then the "Profile" tab should be active
