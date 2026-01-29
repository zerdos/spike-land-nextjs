# Phase 2: Navigation Restructure - Orbit Onboarding
Feature: Orbit Onboarding and Workspace Creation
  As a new user
  I want to be guided through workspace creation
  So that I can start using Orbit immediately

  Background:
    Given I am not logged in

  # Post-Login Redirect to Orbit
  Scenario: New user redirected to Orbit after sign-in
    When I sign in as a new user with email "newuser@example.com"
    Then I should be redirected to "/orbit"

  Scenario: Existing user without workspaces sees welcome screen
    Given I am logged in as "NoWorkspace User" with email "noworkspace@example.com"
    When I navigate to "/orbit"
    Then I should see "Welcome to Orbit"
    And I should see "Get started by creating your first workspace"
    And I should see a "Create Workspace" button

  # Workspace Creation Flow
  Scenario: Create first workspace successfully
    Given I am logged in as "New User" with email "createworkspace@example.com"
    And I navigate to "/orbit"
    When I click the "Create Workspace" button
    Then I should see a workspace creation dialog
    When I fill in "Workspace Name" with "My Brand"
    And I fill in "Description (optional)" with "My first workspace"
    And I click the "Create Workspace" button in the dialog
    Then I should be redirected to a workspace dashboard URL matching "/orbit/[a-z0-9-]+/dashboard"
    And I should see "My Brand" in the workspace header

  Scenario: Workspace creation validation - name required
    Given I am logged in as "Validator User" with email "validator@example.com"
    And I navigate to "/orbit"
    When I click the "Create Workspace" button
    And I leave "Workspace Name" empty
    And I click the "Create Workspace" button in the dialog
    Then I should see an error "Workspace name is required"
    And the dialog should remain open

  Scenario: Workspace creation - description is optional
    Given I am logged in as "Optional User" with email "optional@example.com"
    And I navigate to "/orbit"
    When I click the "Create Workspace" button
    And I fill in "Workspace Name" with "Test Workspace"
    And I leave "Description (optional)" empty
    And I click the "Create Workspace" button in the dialog
    Then I should be redirected to a workspace dashboard URL matching "/orbit/[a-z0-9-]+/dashboard"

  # Workspace Selection for Existing Workspaces
  Scenario: User with existing workspaces auto-redirected to last workspace
    Given I am logged in as "Existing User" with email "existing@example.com"
    And I have a workspace with slug "my-workspace"
    When I navigate to "/orbit"
    Then I should be redirected to "/orbit/my-workspace/dashboard"

  Scenario: Orbit button in header navigates to workspace
    Given I am logged in as "Header User" with email "header@example.com"
    And I have a workspace with slug "test-workspace"
    And I am on the home page
    When I click the "Orbit" button in the header
    Then I should be redirected to "/orbit"
    And I should be redirected to "/orbit/test-workspace/dashboard"

  # Navigation Priority
  Scenario: Orbit is prominently featured in header
    Given I am on the home page
    Then I should see the "Orbit" button in the header
    And the "Orbit" button should be styled as a primary CTA
    And the "Orbit" button should appear before "Features"
    And the "Orbit" button should appear before "Pricing"

  Scenario: My Apps is de-emphasized in navigation
    Given I am on the home page
    Then I should see "My Apps" in the header
    And "My Apps" should have lower visual prominence than "Orbit"
    And "My Apps" should appear after "Orbit"
    And "My Apps" should appear after "Pricing"

  # Mobile Navigation
  Scenario: Orbit button visible in mobile menu
    Given I am on the home page
    And I am using a mobile device
    When I open the mobile menu
    Then I should see the "Orbit - AI Marketing Team" button
    And it should be the first item in the menu
    And it should be styled as a primary button

  # Loading States
  Scenario: Loading indicator while fetching workspaces
    Given I am logged in as "Loading User" with email "loading@example.com"
    When I navigate to "/orbit"
    Then I should see "Loading your workspace..." while workspaces are being fetched
    And I should see a loading spinner

  # Error Handling
  Scenario: Error state when workspace fetch fails
    Given I am logged in as "Error User" with email "error@example.com"
    When I navigate to "/orbit"
    And the workspace API returns an error
    Then I should see "Error Loading Orbit"
    And I should see a "Try Again" button
    When I click the "Try Again" button
    Then the page should reload

  # Back Navigation
  Scenario: Back to home from workspace welcome screen
    Given I am logged in as "Back User" with email "back@example.com"
    And I navigate to "/orbit"
    When I click the "Back to Home" button
    Then I should be redirected to "/"

  # Accessibility
  Scenario: Workspace creation dialog is accessible
    Given I am logged in as "A11y User" with email "a11y@example.com"
    And I navigate to "/orbit"
    When I click the "Create Workspace" button
    Then the dialog should have proper ARIA labels
    And the dialog should trap focus
    And pressing Escape should close the dialog

  # LocalStorage Persistence
  Scenario: Last workspace remembered across sessions
    Given I am logged in as "Storage User" with email "storage@example.com"
    And I have two workspaces "workspace-a" and "workspace-b"
    When I navigate to "/orbit/workspace-b/dashboard"
    And I navigate to "/"
    And I click the "Orbit" button in the header
    Then I should be redirected to "/orbit/workspace-b/dashboard"
