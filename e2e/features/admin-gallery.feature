@requires-db
Feature: Admin Featured Gallery Management
  As an admin user
  I want to manage the featured gallery
  So that I can curate before/after image pairs for the landing page

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  @fast @requires-db
  Scenario: Gallery management page loads successfully
    When I visit "/admin/gallery"
    Then I should be on the "/admin/gallery" page
    And I should see "Featured Gallery" heading
    And I should see "Manage before/after image pairs displayed on the landing page" text

  @fast @requires-db
  Scenario: Gallery page displays Add New Item button
    When I visit "/admin/gallery"
    Then I should see "Add New Item" button

  @fast @requires-db
  Scenario: Empty gallery displays helpful message
    Given the gallery is empty
    When I visit "/admin/gallery"
    Then I should see "No gallery items yet" text
    And I should see "Add New Item" text

  @slow @requires-db
  Scenario: Gallery displays existing items in a grid
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    Then I should see the gallery grid
    And each gallery item should display a thumbnail
    And each gallery item should display a title
    And each gallery item should display a category badge

  @slow @requires-db
  Scenario: Gallery items show category badges with correct styling
    Given there are gallery items with different categories
    When I visit "/admin/gallery"
    Then I should see "PORTRAIT" category badge
    And I should see "LANDSCAPE" category badge
    And I should see "PRODUCT" category badge
    And I should see "ARCHITECTURE" category badge

  @slow @requires-db
  Scenario: Open image browser dialog to add new gallery item
    When I visit "/admin/gallery"
    And I click "Add New Item" button
    Then I should see the image browser dialog
    And the dialog should display available enhanced images

  @slow @requires-db
  Scenario: Select an image from browser and open add form
    Given there are enhanced images available
    When I visit "/admin/gallery"
    And I click "Add New Item" button
    And I select an image from the browser
    Then I should see the add gallery item form
    And I should see "Add Gallery Item" dialog title

  @slow @requires-db
  Scenario: Add a new gallery item with all fields
    Given there are enhanced images available
    When I visit "/admin/gallery"
    And I click "Add New Item" button
    And I select an image from the browser
    And I fill in the gallery item form with:
      | title       | Beautiful Portrait    |
      | description | A stunning portrait   |
      | category    | PORTRAIT              |
    And I submit the gallery item form
    Then I should see the new gallery item in the grid
    And the gallery item should display "Beautiful Portrait"

  @slow @requires-db
  Scenario: Edit an existing gallery item
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    And I click "Edit" on a gallery item
    Then I should see the edit gallery item form
    And I should see "Edit Gallery Item" dialog title
    When I change the title to "Updated Title"
    And I submit the gallery item form
    Then the gallery item should display "Updated Title"

  @slow @requires-db
  Scenario: Toggle gallery item active status
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    And I toggle the active switch on a gallery item
    Then the gallery item active status should change
    And the change should persist after page refresh

  @slow @requires-db
  Scenario: Move gallery item up in order
    Given there are at least 2 gallery items in the system
    When I visit "/admin/gallery"
    And I note the current gallery order
    And I click "Up" on the second gallery item
    Then the gallery order should change
    And the second item should now be first

  @slow @requires-db
  Scenario: Move gallery item down in order
    Given there are at least 2 gallery items in the system
    When I visit "/admin/gallery"
    And I note the current gallery order
    And I click "Down" on the first gallery item
    Then the gallery order should change
    And the first item should now be second

  @slow @requires-db
  Scenario: First item has disabled Up button
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    Then the "Up" button on the first item should be disabled

  @slow @requires-db
  Scenario: Last item has disabled Down button
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    Then the "Down" button on the last item should be disabled

  @slow @requires-db
  Scenario: Delete gallery item shows confirmation dialog
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    And I click "Delete" on a gallery item
    Then I should see the delete confirmation dialog
    And I should see "Delete Gallery Item" dialog title
    And I should see "This action cannot be undone" text

  @slow @requires-db
  Scenario: Confirm deletion removes gallery item
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    And I note the gallery item count
    And I click "Delete" on a gallery item
    And I confirm the deletion
    Then the gallery item should be removed
    And the gallery item count should decrease by 1

  @slow @requires-db
  Scenario: Cancel deletion keeps gallery item
    Given there are gallery items in the system
    When I visit "/admin/gallery"
    And I note the gallery item count
    And I click "Delete" on a gallery item
    And I cancel the deletion
    Then the gallery item count should remain the same
    And the delete dialog should close

  @slow @requires-db
  Scenario: Gallery shows loading state while fetching
    Given the gallery API is slow
    When I visit "/admin/gallery"
    Then I should see loading skeleton cards

  @slow @requires-db
  Scenario: Gallery shows error state on API failure
    Given the gallery API returns an error
    When I visit "/admin/gallery"
    Then I should see an error message
    And I should see "Retry" button

  @fast @requires-db
  Scenario: Non-admin user cannot access gallery management
    Given the user is not an admin
    When I visit "/admin/gallery"
    Then I should be redirected to home page

  @fast @requires-db
  Scenario: Unauthenticated user cannot access gallery management
    Given I am not logged in
    When I visit "/admin/gallery"
    Then I should be redirected to sign-in page
