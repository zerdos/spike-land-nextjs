@requires-db @flaky
Feature: Browser Agent Box Management
  As a user
  I want to create and manage browser agent boxes
  So that I can run isolated browser environments for automation

  Background:
    Given I am logged in as a test user

  # Box Creation Page Tests
  @fast @smoke
  Scenario: Navigate to box creation page
    When I visit "/boxes/new"
    Then I should see "Create New Box" heading
    And I should see the tier selection cards

  @fast
  Scenario: Tier selection cards are displayed
    Given I visit "/boxes/new"
    Then I should see the "Standard" tier card
    And I should see the "Professional" tier card
    And I should see the "Enterprise" tier card
    And each tier card should display pricing information

  @fast
  Scenario: Select a tier and see configuration options
    Given I visit "/boxes/new"
    When I select the "Standard" tier
    Then the "Standard" tier should be highlighted
    And I should see the box configuration form
    And the "Box Name" input field should be visible

  @fast
  Scenario: Box name validation - required field
    Given I visit "/boxes/new"
    When I select the "Standard" tier
    And I leave the box name empty
    And I click the "Create Box" button
    Then I should see the validation error "Box name is required"

  @fast
  Scenario: Box name validation - minimum length
    Given I visit "/boxes/new"
    When I select the "Standard" tier
    And I enter "AB" into the box name field
    And I click the "Create Box" button
    Then I should see the validation error "Box name must be at least 3 characters"

  @requires-db @slow
  Scenario: Successfully create a new box
    Given I visit "/boxes/new"
    When I select the "Standard" tier
    And I enter "My Test Agent" into the box name field
    And I click the "Create Box" button
    Then I should be redirected to "/boxes"
    And I should see "My Test Agent" in the boxes list
    And I should see a success message

  # Box List Page Tests
  @fast @smoke
  Scenario: View boxes list page
    When I visit "/boxes"
    Then I should see "My Boxes" heading
    And I should see "Create New Box" button

  @fast
  Scenario: Empty boxes list shows helpful message
    Given I have no boxes created
    When I visit "/boxes"
    Then I should see the empty state message for boxes
    And I should see "Create your first box" text

  @requires-db
  Scenario: Boxes list displays existing boxes
    Given I have created a box named "Test Box 1"
    When I visit "/boxes"
    Then I should see "Test Box 1" in the boxes list
    And I should see the box status indicator
    And I should see the box tier badge

  # Box Detail/Management Page Tests
  @requires-db
  Scenario: View box detail page
    Given I have created a box named "My Agent Box"
    When I navigate to the box detail page for "My Agent Box"
    Then I should see "My Agent Box" heading
    And I should see the box control panel
    And I should see the "Start" button

  @requires-db @slow
  Scenario: Start and stop a box
    Given I have created a box named "Control Test Box"
    And I navigate to the box detail page for "Control Test Box"
    When I click the "Start" button
    Then I should see the box status change to "Starting"
    And I should see the "Stop" button appear
    When I click the "Stop" button
    Then I should see the box status change to "Stopped"

  @requires-db
  Scenario: View box connection details
    Given I have created a box named "Connection Test Box"
    And I navigate to the box detail page for "Connection Test Box"
    When I click the "Connection Details" tab
    Then I should see the connection URL
    And I should see the authentication token
    And I should see "Copy" button

  @requires-db
  Scenario: Delete a box
    Given I have created a box named "Box To Delete"
    And I navigate to the box detail page for "Box To Delete"
    When I click the "Delete Box" button
    Then I should see the delete confirmation dialog
    When I confirm the deletion
    Then I should be redirected to "/boxes"
    And I should not see "Box To Delete" in the boxes list

  @requires-db
  Scenario: Cancel box deletion
    Given I have created a box named "Box To Keep"
    And I navigate to the box detail page for "Box To Keep"
    When I click the "Delete Box" button
    Then I should see the delete confirmation dialog
    When I cancel the deletion confirmation
    Then the modal should close
    And I should still be on the box detail page

  # Box Configuration Tests
  @requires-db
  Scenario: Update box configuration
    Given I have created a box named "Config Test Box"
    And I navigate to the box detail page for "Config Test Box"
    When I click the "Settings" tab
    And I change the box name to "Updated Box Name"
    And I click the "Save Changes" button
    Then I should see a success message
    And I should see "Updated Box Name" heading

  # Tier Upgrade Flow
  @requires-db @slow
  Scenario: Upgrade box tier
    Given I have created a "Standard" box named "Upgrade Test Box"
    And I navigate to the box detail page for "Upgrade Test Box"
    When I click the "Upgrade" button
    Then I should see the tier upgrade modal
    And I should see the "Professional" upgrade option
    And I should see the "Enterprise" upgrade option

  # Search and Filter Tests
  @requires-db
  Scenario: Search boxes by name
    Given I have created multiple boxes
    When I visit "/boxes"
    And I type "Agent" in the search box
    Then I should only see boxes containing "Agent" in the name

  @requires-db
  Scenario: Filter boxes by status
    Given I have boxes with different statuses
    When I visit "/boxes"
    And I click the "Running" filter
    Then I should only see boxes with "Running" status

  # Error Handling Tests
  @fast
  Scenario: Handle network error during box creation
    Given I visit "/boxes/new"
    And the server will return an error
    When I select the "Standard" tier
    And I enter "Error Test Box" into the box name field
    And I click the "Create Box" button
    Then I should see an error message
    And I should remain on the creation page

  @requires-db
  Scenario: Handle invalid box ID in URL
    When I visit "/boxes/invalid-box-id-12345"
    Then I should see a 404 error page
    And I should see "Box not found" text
