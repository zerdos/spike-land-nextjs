@requires-db
Feature: Pixel Pipeline Management
  As an authenticated user
  I want to manage AI enhancement pipelines
  So that I can customize how my images are enhanced

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  @fast
  Scenario: View pipelines page
    When I visit "/apps/pixel/pipelines"
    Then I should see "Enhancement Pipelines" heading
    And I should see "Create and manage AI enhancement pipeline configurations" text
    And I should see "New Pipeline" button
    And I should see the pipeline search input

  @fast
  Scenario: View pipeline sections
    Given there are system default pipelines
    And I have custom pipelines
    When I visit "/apps/pixel/pipelines"
    Then I should see "My Pipelines" section
    And I should see "System Defaults" section
    And I should see "Public Pipelines" section

  Scenario: Navigate back to pixel app
    When I visit "/apps/pixel/pipelines"
    And I click "Back to Pixel" button
    Then I should be on the "/apps/pixel" page

  Scenario: Search pipelines by name
    Given there are multiple pipelines
    When I visit "/apps/pixel/pipelines"
    And I type "portrait" in the search input
    Then I should only see pipelines matching "portrait"

  Scenario: Search pipelines by description
    Given there are multiple pipelines
    When I visit "/apps/pixel/pipelines"
    And I type "landscape" in the search input
    Then I should only see pipelines with "landscape" in their description

  Scenario: Create new pipeline dialog
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    Then I should see the pipeline form dialog
    And I should see "Create Pipeline" title
    And I should see "Name" input field
    And I should see "Description" input field
    And I should see "Tier" selector
    And I should see "Visibility" selector

  Scenario: Create new pipeline successfully
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    And I fill in pipeline name "My Custom Pipeline"
    And I fill in pipeline description "A custom enhancement pipeline"
    And I select tier "TIER_2K"
    And I select visibility "Private"
    And I submit the pipeline form
    Then I should see "My Custom Pipeline" in "My Pipelines" section
    And the pipeline should show tier "TIER_2K"

  Scenario: Create pipeline with advanced configuration
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    And I fill in pipeline name "Advanced Pipeline"
    And I configure analysis settings
    And I configure auto-crop settings
    And I configure prompt settings
    And I configure generation settings
    And I submit the pipeline form
    Then the pipeline should be created with all configurations

  Scenario: Edit existing pipeline
    Given I have a custom pipeline named "My Pipeline"
    When I visit "/apps/pixel/pipelines"
    And I click the edit button on "My Pipeline"
    Then I should see the pipeline form dialog
    And I should see "Edit Pipeline" title
    And the form should be populated with existing values
    When I update the pipeline name to "Updated Pipeline"
    And I submit the pipeline form
    Then I should see "Updated Pipeline" in "My Pipelines" section

  Scenario: Cannot edit system default pipeline
    Given there are system default pipelines
    When I visit "/apps/pixel/pipelines"
    Then the system default pipelines should not have edit buttons

  Scenario: Fork system default pipeline
    Given there are system default pipelines
    When I visit "/apps/pixel/pipelines"
    And I click the fork button on a system default pipeline
    Then I should see the pipeline form dialog
    And I should see "Fork Pipeline" title
    And the form should be populated with the original pipeline values
    And the name should suggest "(Copy)"
    When I update the pipeline name
    And I submit the pipeline form
    Then I should see the forked pipeline in "My Pipelines" section

  Scenario: Fork public pipeline
    Given there is a public pipeline from another user
    When I visit "/apps/pixel/pipelines"
    And I click the fork button on the public pipeline
    Then I should see the pipeline form dialog
    And the form should be populated with the public pipeline values
    When I submit the pipeline form
    Then I should see the forked pipeline in "My Pipelines" section

  Scenario: Delete custom pipeline
    Given I have a custom pipeline named "Pipeline to Delete"
    When I visit "/apps/pixel/pipelines"
    And I click the delete button on "Pipeline to Delete"
    Then I should see the delete confirmation dialog
    And I should see "Are you sure you want to delete" text
    When I confirm the deletion
    Then "Pipeline to Delete" should be removed from "My Pipelines"

  Scenario: Cancel pipeline deletion
    Given I have a custom pipeline named "My Pipeline"
    When I visit "/apps/pixel/pipelines"
    And I click the delete button on "My Pipeline"
    And I click "Cancel" in the confirmation dialog
    Then the dialog should close
    And "My Pipeline" should still be in "My Pipelines" section

  Scenario: Cannot delete system default pipeline
    Given there are system default pipelines
    When I visit "/apps/pixel/pipelines"
    Then the system default pipelines should not have delete buttons

  Scenario: Pipeline card displays tier badge
    Given I have a custom pipeline with tier "TIER_4K"
    When I visit "/apps/pixel/pipelines"
    Then the pipeline card should display "TIER_4K" badge

  Scenario: Pipeline card displays visibility badge
    Given I have a public pipeline
    When I visit "/apps/pixel/pipelines"
    Then the pipeline card should display "Public" visibility badge

  Scenario: Pipeline card displays usage count
    Given I have a pipeline with 50 uses
    When I visit "/apps/pixel/pipelines"
    Then the pipeline card should display "50 uses"

  @slow
  Scenario: Create and use pipeline for enhancement
    Given I have an uploaded image
    When I visit "/apps/pixel/pipelines"
    And I create a new pipeline "Quick Enhance"
    Then the pipeline should be available in the enhancement settings
    When I visit my image detail page
    And I select the "Quick Enhance" pipeline
    And I start enhancement
    Then the enhancement should use the selected pipeline

  Scenario: Empty state when no custom pipelines
    Given I have no custom pipelines
    When I visit "/apps/pixel/pipelines"
    Then I should see "No pipelines found" in "My Pipelines" section

  @fast
  Scenario: Pipeline form validation - empty name
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    And I leave the name field empty
    And I try to submit the pipeline form
    Then I should see a validation error for the name field

  Scenario: Pipeline form tier options
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    And I click on the tier selector
    Then I should see "TIER_1K" option
    And I should see "TIER_2K" option
    And I should see "TIER_4K" option

  Scenario: Pipeline form visibility options
    When I visit "/apps/pixel/pipelines"
    And I click "New Pipeline" button
    And I click on the visibility selector
    Then I should see "Private" option
    And I should see "Public" option

  Scenario: Unauthenticated user redirected from pipelines page
    Given I am not logged in
    When I visit "/apps/pixel/pipelines"
    Then I should be on the "/auth/signin" page
    And the callback URL should be "/apps/pixel/pipelines"

  @fast
  Scenario: Pipeline cards are responsive
    When I visit "/apps/pixel/pipelines"
    Then the pipeline grid should be responsive
    And cards should stack on mobile viewport
    And cards should show in grid on desktop viewport
