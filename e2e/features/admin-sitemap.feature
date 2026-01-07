@requires-db
Feature: Admin Sitemap Preview
  As an admin user
  I want to preview all sitemap URLs
  So that I can visually verify page rendering and spot-check for errors

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  @fast @requires-db
  Scenario: Sitemap preview page loads successfully
    When I visit "/admin/sitemap"
    Then I should be on the "/admin/sitemap" page
    And I should see "Application Monitor" heading
    And I should see "Visual site monitor" text

  @fast @requires-db
  Scenario: Sitemap page displays health status bar
    When I visit "/admin/sitemap"
    Then I should see health status badges
    And I should see "Healthy" status count
    And I should see "visible / hidden" count text

  @fast @requires-db
  Scenario: Sitemap page displays action toolbar
    When I visit "/admin/sitemap"
    Then I should see "Show Hidden Paths" button
    And I should see "Refresh All" button
    And I should see "Add Custom Path" button

  @slow @requires-db
  Scenario: Sitemap displays route preview cards
    When I visit "/admin/sitemap"
    Then I should see a grid of route preview cards
    And each card should display the path name
    And each card should have a status indicator dot
    And each card should have an iframe preview

  @slow @requires-db
  Scenario: Route cards show loading state initially
    When I visit "/admin/sitemap"
    Then some cards should show "Loading..." text
    And loading cards should have a yellow status dot

  @slow @requires-db
  Scenario: Route cards show loaded state after iframe loads
    When I visit "/admin/sitemap"
    And I wait for pages to load
    Then loaded cards should have a green status dot
    And loaded cards should show the page content in iframe

  @slow @requires-db
  Scenario: Route cards show error state on load failure
    Given a sitemap route returns an error
    When I visit "/admin/sitemap"
    And I wait for pages to load
    Then error cards should have a red status dot
    And error cards should show "Failed to load" text

  @slow @requires-db
  Scenario: Sitemap includes all expected routes
    When I visit "/admin/sitemap"
    Then I should see preview card for "/"
    And I should see preview card for "/pricing"
    And I should see preview card for "/apps"
    And I should see preview card for "/apps/pixel"
    And I should see preview card for "/auth/signin"
    And I should see preview card for "/terms"
    And I should see preview card for "/privacy"
    And I should see preview card for "/admin"

  @slow @requires-db
  Scenario: Refresh single route card
    When I visit "/admin/sitemap"
    And I wait for pages to load
    And I click the refresh button on a route card
    Then that card should show loading state
    And the card should reload the iframe

  @slow @requires-db
  Scenario: Refresh all routes
    When I visit "/admin/sitemap"
    And I wait for pages to load
    And I click "Refresh All" button
    Then all cards should show loading or queued state
    And cards should reload progressively

  @slow @requires-db
  Scenario: Open route in new tab
    When I visit "/admin/sitemap"
    And I click the external link button on a route card
    Then the route should open in a new tab

  @slow @requires-db
  Scenario: Hide a route from the preview
    When I visit "/admin/sitemap"
    And I click the visibility toggle on a route card
    Then the card should show "Hidden" badge
    And the card should have reduced opacity
    And the hidden count should increase

  @slow @requires-db
  Scenario: Show hidden routes toggle
    Given there are hidden routes
    When I visit "/admin/sitemap"
    Then hidden routes should not be visible
    When I click "Show Hidden Paths" button
    Then hidden routes should become visible
    And the button should change to "Hide Hidden Paths"

  @slow @requires-db
  Scenario: Unhide a hidden route
    Given there are hidden routes
    When I visit "/admin/sitemap"
    And I click "Show Hidden Paths" button
    And I click the visibility toggle on a hidden route card
    Then the card should no longer show "Hidden" badge
    And the hidden count should decrease

  @slow @requires-db
  Scenario: Add custom path opens dialog
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    Then I should see the add custom path dialog
    And I should see "Add Custom Path" dialog title
    And I should see a path input field
    And I should see "Cancel" button
    And I should see "Add Path" button

  @slow @requires-db
  Scenario: Add custom path with valid path
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I enter "/custom-test-page" in the path input
    And I click "Add Path" button
    Then the dialog should close
    And I should see a new preview card for "/custom-test-page"

  @slow @requires-db
  Scenario: Add custom path with full URL extracts path
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I enter "https://example.com/full-url-path" in the path input
    And I click "Add Path" button
    Then the dialog should close
    And I should see a new preview card for "/full-url-path"

  @slow @requires-db
  Scenario: Add custom path without leading slash auto-fixes
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I enter "no-leading-slash" in the path input
    And I click "Add Path" button
    Then the dialog should close
    And I should see a new preview card for "/no-leading-slash"

  @slow @requires-db
  Scenario: Add custom path shows error for duplicate
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I enter "/" in the path input
    And I click "Add Path" button
    Then I should see "Path already exists in the list" error

  @slow @requires-db
  Scenario: Add custom path shows error for empty path
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I click "Add Path" button without entering path
    Then I should see "Path is required" error

  @slow @requires-db
  Scenario: Cancel add custom path dialog
    When I visit "/admin/sitemap"
    And I click "Add Custom Path" button
    And I enter "/test-path" in the path input
    And I click "Cancel" button
    Then the dialog should close
    And I should not see a preview card for "/test-path"

  @slow @requires-db
  Scenario: Remove custom path
    Given there is a custom tracked path
    When I visit "/admin/sitemap"
    And I click the delete button on a custom path card
    Then the custom path card should be removed
    And the path should no longer appear in the grid

  @slow @requires-db
  Scenario: Cannot remove sitemap default paths
    When I visit "/admin/sitemap"
    Then the delete button should not appear on sitemap default paths

  @slow @requires-db
  Scenario: Hidden state persists after refresh
    When I visit "/admin/sitemap"
    And I click the visibility toggle on a route card
    And I refresh the page
    Then the route should still be hidden
    And the hidden count should be correct

  @slow @requires-db
  Scenario: Staggered loading limits concurrent iframes
    When I visit "/admin/sitemap"
    Then at most 4 cards should be loading simultaneously
    And remaining cards should show "Queued..." text

  @slow @requires-db
  Scenario: Health stats update as pages load
    When I visit "/admin/sitemap"
    And I wait for pages to load
    Then the healthy count should increase
    And the loading count should decrease to zero

  @fast @requires-db
  Scenario: Non-admin user cannot access sitemap preview
    Given the user is not an admin
    When I visit "/admin/sitemap"
    Then I should be redirected to home page

  @fast @requires-db
  Scenario: Unauthenticated user cannot access sitemap preview
    Given I am not logged in
    When I visit "/admin/sitemap"
    Then I should be redirected to sign-in page
