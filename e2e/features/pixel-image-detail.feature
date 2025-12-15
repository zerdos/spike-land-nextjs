@requires-db
Feature: Pixel Image Detail View
  As an authenticated user
  I want to view and manage my enhanced images in detail
  So that I can compare versions, download, and share my work

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  @fast
  Scenario: View single image detail page
    Given I have an uploaded image with id "test-image-001"
    When I visit "/apps/pixel/test-image-001"
    Then I should see "Pixel Image Enhancement" heading
    And I should see "Original Image" text
    And I should see the token balance display
    And I should see "Back to Images" button

  @fast
  Scenario: View image with enhancement history
    Given I have an image with completed enhancements
    When I visit the image detail page
    Then I should see "Enhancement History" heading
    And I should see the enhancement versions grid
    And I should see at least one completed enhancement

  Scenario: Navigate back to images list
    Given I have an uploaded image with id "test-image-001"
    When I visit "/apps/pixel/test-image-001"
    And I click "Back to Images" button
    Then I should be on the "/apps/pixel" page

  Scenario: View before and after comparison
    Given I have an image with a completed enhancement
    When I visit the image detail page
    And I select the completed enhancement version
    Then I should see "Before & After Comparison" text
    And I should see the comparison view toggle
    And I can switch between comparison modes

  Scenario: Select different enhancement version
    Given I have an image with multiple enhancement versions
    When I visit the image detail page
    And I click on a different version in the enhancement grid
    Then the comparison view should update to show the selected version
    And the selected version should be highlighted

  Scenario: Download enhanced image
    Given I have an image with a completed enhancement
    When I visit the image detail page
    And I select the completed enhancement version
    Then I should see the export selector
    When I click on the export options
    Then I should see download format options

  Scenario: Share image functionality
    Given I have an uploaded image with id "test-image-001"
    When I visit "/apps/pixel/test-image-001"
    Then I should see "Share" button
    When I click the share button
    Then I should see the share dialog
    And I should be able to copy the share link

  Scenario: Share link enables public access
    Given I have an image with a share token
    When I visit the shared image link
    Then the image should be visible without authentication

  Scenario: Low balance warning on detail page
    Given I have an uploaded image with id "test-image-001"
    And I have less than 5 tokens
    When I visit "/apps/pixel/test-image-001"
    Then I should see the low balance banner
    And I should see "Your token balance is running low" text
    And I should see "Get Tokens" button

  Scenario: Enhancement settings panel
    Given I have an uploaded image with id "test-image-001"
    When I visit "/apps/pixel/test-image-001"
    Then I should see the enhancement tier options
    And I should see "TIER_1K" option with token cost
    And I should see "TIER_2K" option with token cost
    And I should see "TIER_4K" option with token cost

  Scenario: Start new enhancement from detail page
    Given I have an uploaded image with id "test-image-001"
    And I have at least 10 tokens
    And I mock a successful enhancement
    When I visit "/apps/pixel/test-image-001"
    And I select "TIER_1K" enhancement tier
    And I click the enhance button
    Then I should see the processing indicator
    And the enhancement should be added to the history

  Scenario: Cancel pending enhancement job
    Given I have an image with a processing enhancement
    When I visit the image detail page
    And I click the cancel button on the processing job
    And I confirm the cancellation
    Then the job should be removed from the history
    And my tokens should be refunded

  Scenario: Delete completed enhancement version
    Given I have an image with multiple completed enhancements
    When I visit the image detail page
    And I click the delete button on a completed version
    And I confirm the deletion
    Then the version should be removed from the history

  @slow
  Scenario: Real-time job status updates via SSE
    Given I have an uploaded image with id "test-image-001"
    And I have at least 10 tokens
    When I visit "/apps/pixel/test-image-001"
    And I start a new enhancement with "TIER_1K"
    Then I should see the job status update to "Processing"
    And I should see the current stage progress
    When the enhancement completes
    Then the status should update to "Completed"
    And the enhanced image should be displayed

  Scenario: Unauthorized access redirects to pixel home
    Given I am logged in as "User A" with email "usera@example.com"
    And another user owns an image with id "other-user-image"
    When I try to access "/apps/pixel/other-user-image"
    Then I should be redirected to "/apps/pixel"

  Scenario: Non-existent image shows 404
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel/non-existent-image-id"
    Then I should see a not found error

  @fast
  Scenario: Image actions section displays correctly
    Given I have an image with a completed enhancement
    When I visit the image detail page
    And I select the completed enhancement version
    Then I should see "Actions" text
    And I should see the export selector
    And I should see "Share" button

  Scenario: Comparison view toggle modes
    Given I have an image with a completed enhancement
    When I visit the image detail page
    And I select the completed enhancement version
    Then I should see the comparison view toggle
    And I can toggle between slider and side-by-side modes

  Scenario: Token balance updates after enhancement
    Given I have an uploaded image with id "test-image-001"
    And I have 20 tokens
    And I mock a successful enhancement with 2 token cost
    When I visit "/apps/pixel/test-image-001"
    And I start a new enhancement with "TIER_1K"
    And the enhancement completes
    Then my displayed token balance should decrease by 2
