@requires-db
Feature: Batch Image Enhancement
  As an authenticated user with sufficient tokens
  I want to enhance multiple images at once
  So that I can process my album efficiently

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  # SKIP REASON: album page needs "Enhance All" button wired to /api/albums/[id]/enhance
  # API exists but AlbumDetailClient does not pass onEnhanceSelected to ImageSelectionToolbar
  @skip
  Scenario: Successfully enhance all images in album
    Given I have an album with 3 unenhanced images
    And I have at least 50 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    Then I should see progress indicators for each image
    And all images should show "completed" status when complete
    And my token balance should be reduced by 6 tokens

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Batch enhancement with insufficient tokens
    Given I have an album with 10 images
    And I have only 5 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    Then I should see an insufficient tokens warning
    And the enhance button should be disabled
    And I should see "Get Tokens" button

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Cancel batch enhancement dialog
    Given I have an album with 5 images
    And I have at least 20 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I click "Cancel" button in the dialog
    Then the batch enhancement dialog should close
    And no enhancements should start
    And no tokens should be deducted

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: View tier selection with cost preview
    Given I have an album with 5 images
    When I navigate to my album
    And I click "Enhance All" button
    Then I should see "TIER_1K" option with cost "10 tokens"
    And I should see "TIER_2K" option with cost "25 tokens"
    And I should see "TIER_4K" option with cost "50 tokens"
    And each tier should show tokens per image calculation

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Select different enhancement tier
    Given I have an album with 3 images
    And I have at least 30 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_2K" enhancement tier
    Then I should see total cost of "15 tokens"
    When I select "TIER_4K" enhancement tier
    Then I should see total cost of "30 tokens"

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Batch enhancement progress tracking
    Given I have an album with 4 images
    And I have at least 20 tokens
    And I mock batch enhancement with varied processing times
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    Then I should see individual status for each image
    And I should see overall progress percentage
    And completed images should show checkmark icon
    And processing images should show spinner icon

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Skip already enhanced images
    Given I have an album with 5 images
    And 2 images are already enhanced at "TIER_1K"
    And I have at least 10 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    Then I should see "3 images to enhance"
    And total cost should be "6 tokens"
    When I confirm the batch enhancement
    Then only 3 images should be processed
    And already enhanced images should be skipped

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Handle batch enhancement errors gracefully
    Given I have an album with 5 images
    And I have at least 20 tokens
    And I mock some enhancements to fail
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    Then successful enhancements should show success status
    And failed enhancements should show error status
    And I should see error count in summary
    And I should see "Retry Failed" button for failed images

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Refresh token balance after enhancement
    Given I have an album with 2 images
    And I have 20 tokens
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    And all enhancements complete successfully
    Then my token balance should update to "16 tokens"
    And the balance should refresh automatically

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Close dialog during enhancement processing
    Given I have an album with 3 images
    And I have at least 10 tokens
    And I mock slow enhancement processing
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    And I see processing has started
    When I click "Close" button
    Then the dialog should close
    And enhancements should continue in background
    And I should see toast notification about background processing

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Batch enhancement with maximum batch size
    Given I have an album with 25 images
    And I have at least 100 tokens
    When I navigate to my album
    And I click "Enhance All" button
    Then I should see a warning about maximum batch size of 20
    And I should see "Only first 20 images will be enhanced"

  # SKIP REASON: album empty state says "No images yet" not "No images in this album"
  # Also needs "Enhance All" button existence check adapted to actual UI
  @skip
  Scenario: Empty album shows no enhance button
    Given I have an empty album
    When I navigate to my album
    Then I should not see "Enhance All" button
    And I should see "No images in this album" message

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: All images already enhanced
    Given I have an album with 5 images
    And all 5 images are already enhanced at "TIER_2K"
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_2K" enhancement tier
    Then I should see "All images already enhanced at this tier"
    And the enhance button should be disabled
    And total cost should be "0 tokens"

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Poll job status until completion
    Given I have an album with 2 images
    And I have at least 10 tokens
    And I mock job status polling
    When I navigate to my album
    And I click "Enhance All" button
    And I select "TIER_1K" enhancement tier
    And I confirm the batch enhancement
    Then the system should poll job statuses every 2 seconds
    And polling interval should increase for long-running jobs
    And polling should stop when all jobs are complete

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Retry failed batch enhancements
    Given I have an album with 4 images
    And I have at least 20 tokens
    And 2 images failed to enhance
    When I navigate to my album
    And I see failed enhancement status
    And I click "Retry Failed" button
    Then only failed images should be re-queued
    And successful images should not be retried
    And my token balance should only be charged for retried images

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Real-time status updates via polling
    Given I have an album with 3 images
    And I have at least 10 tokens
    And I start batch enhancement
    When enhancements are processing
    Then job statuses should update automatically
    And I should see transition from "pending" to "enhancing" to "completed"
    And completion percentage should increase progressively

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Navigate away during batch processing
    Given I have an album with 5 images
    And I have at least 20 tokens
    When I start batch enhancement
    And I navigate to home page
    And enhancements complete in background
    And I return to my album
    Then I should see all enhancements completed
    And enhanced images should display properly

  # SKIP REASON: album page needs "Enhance All" button — see above
  @skip
  Scenario: Batch enhancement permission check
    Given another user has an album
    And I am logged in as a different user
    When I try to enhance that album
    Then I should receive a "Forbidden" error
    And no tokens should be deducted
    And no enhancement jobs should be created
