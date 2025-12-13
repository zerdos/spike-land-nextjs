@skip
Feature: MCP API Key Management
  As an authenticated user
  I want to manage my API keys
  So that I can use the MCP server for programmatic access

  Background:
    Given I am logged in as "David Jones" with email "david@example.com"

  Scenario: Visit API Keys tab on settings page
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then the "API Keys" tab should be active
    And I should see the API Keys section title

  Scenario: API Keys tab shows usage instructions
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see REST API usage instructions
    And I should see MCP Server usage instructions
    And I should see a link to test API keys

  Scenario: Create API Key button is visible
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see the "Create API Key" button

  Scenario: Create API Key dialog opens when button clicked
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    Then I should see the create API key dialog
    And I should see the "Key Name" input field
    And I should see the "Cancel" button in the dialog
    And I should see the "Create Key" button in the dialog

  Scenario: Create Key button is disabled without name
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    Then the "Create Key" button should be disabled

  Scenario: Create Key button is enabled with name
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter "Test Key" in the key name field
    Then the "Create Key" button should be enabled

  @requires-db
  Scenario: Successfully create an API key
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter "Test Key" in the key name field
    And I click the "Create Key" button
    Then I should see the API key created dialog
    And I should see the new API key starting with "sk_live_"
    And I should see a warning to copy the key now

  @requires-db
  Scenario: Copy newly created API key to clipboard
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the "Create API Key" button
    And I enter "Copy Test Key" in the key name field
    And I click the "Create Key" button
    Then I should see the API key created dialog
    When I click the copy button for the new API key
    Then I should see a checkmark indicating the key was copied

  @requires-db
  Scenario: Created API key appears in list
    Given I have created an API key named "Test Key"
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see "Test Key" in the API keys list
    And I should see the masked API key format

  @requires-db
  Scenario: Delete API key confirmation
    Given I have created an API key named "Delete Me"
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the delete button for "Delete Me" key
    Then I should see a confirmation dialog
    And I should be able to cancel the deletion

  @requires-db
  Scenario: Successfully delete an API key
    Given I have created an API key named "Delete Me"
    When I navigate to the settings page
    And I click the "API Keys" tab
    And I click the delete button for "Delete Me" key
    And I confirm the deletion
    Then the "Delete Me" key should be removed from the list

  Scenario: No API keys message
    Given I have no API keys
    When I navigate to the settings page
    And I click the "API Keys" tab
    Then I should see "No API Keys" message
    And I should see instructions to create an API key
