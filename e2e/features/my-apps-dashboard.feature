Feature: My Apps Dashboard
  As an authenticated user
  I want to view and manage my apps
  So that I can track my app portfolio

  Background:
    Given I am logged in as "John Developer" with email "john@dev.com"

  Scenario: View My Apps page when authenticated
    When I navigate to the My Apps page
    Then I should see the My Apps page title
    And the page URL should be "/my-apps"

  Scenario: Empty state displayed when no apps exist
    When I navigate to the My Apps page
    And I have no apps created
    Then I should see the empty state message
    And I should see "You haven't created any apps yet"
    And I should see the "Create New App" button

  Scenario: Create New App button is visible
    When I navigate to the My Apps page
    Then I should see the "Create New App" button
    And the button should be enabled

  Scenario: Click Create New App navigates to app creation wizard
    When I navigate to the My Apps page
    And I click the "Create New App" button
    Then I should be redirected to "/my-apps/new"
    And I should see the app creation wizard

  Scenario: Search functionality placeholder is visible
    When I navigate to the My Apps page
    Then I should see the search input field
    And the search input should have placeholder "Search apps..."

  Scenario: Search input accepts text input
    When I navigate to the My Apps page
    And I type "My Test App" in the search field
    Then the search field should contain "My Test App"

  Scenario: Filter buttons are displayed
    When I navigate to the My Apps page
    Then I should see the "All" filter button
    And I should see the "Active" filter button
    And I should see the "Draft" filter button

  Scenario: All filter is selected by default
    When I navigate to the My Apps page
    Then the "All" filter should be active
    And the "Active" filter should not be active
    And the "Draft" filter should not be active

  Scenario: Click Active filter changes active state
    When I navigate to the My Apps page
    And I click the "Active" filter button
    Then the "Active" filter should be active
    And the "All" filter should not be active

  Scenario: Click Draft filter changes active state
    When I navigate to the My Apps page
    And I click the "Draft" filter button
    Then the "Draft" filter should be active
    And the "All" filter should not be active

  Scenario: Click All filter after selecting another
    When I navigate to the My Apps page
    And I click the "Active" filter button
    And I click the "All" filter button
    Then the "All" filter should be active
    And the "Active" filter should not be active

  Scenario: Future - List of apps displayed when apps exist
    When I navigate to the My Apps page
    And I have 3 apps created
    Then I should see 3 app cards
    And I should not see the empty state message

  Scenario: Future - App card displays app information
    When I navigate to the My Apps page
    And I have an app named "Test App" with status "Active"
    Then I should see the app card for "Test App"
    And the app card should show status "Active"

  Scenario: Future - Click app card navigates to app details
    When I navigate to the My Apps page
    And I have an app named "My App"
    And I click on the app card for "My App"
    Then I should be redirected to the app details page

  Scenario: Protected route redirects unauthenticated users
    When I am not logged in
    And I navigate to the My Apps page
    Then I should be redirected to the home page
    And I should see the login options

  Scenario: Page displays user's apps only (isolation)
    When I am logged in as "Alice Developer" with email "alice@dev.com"
    And I navigate to the My Apps page
    And I have 2 apps created
    Then I should see 2 app cards
    When I log out and log in as "Bob Developer" with email "bob@dev.com"
    And I navigate to the My Apps page
    Then I should see the empty state message
