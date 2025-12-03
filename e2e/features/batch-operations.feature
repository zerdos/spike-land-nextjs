@requires-db
Feature: Batch Image Operations
  As an authenticated user
  I want to upload and enhance multiple images at once
  So that I can process images more efficiently

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  Scenario: Upload multiple images at once
    Given I am on the enhance page
    When I select multiple valid image files for upload
    Then I should see multiple images queued for upload
    And each image should show an upload progress indicator

  Scenario: Batch upload displays file names
    Given I am on the enhance page
    When I select 3 images for batch upload
    Then I should see all 3 image file names listed
    And each file should have a status indicator

  Scenario: Batch upload shows individual progress
    Given I am on the enhance page
    And I mock batch upload with varying speeds
    When I upload 3 images in batch
    Then each image should show individual upload progress
    And faster uploads should complete before slower ones

  Scenario: Cancel individual upload in batch
    Given I am on the enhance page
    And I have started a batch upload
    When I cancel one image from the batch
    Then that image should be removed from the queue
    And other images should continue uploading

  Scenario: Batch upload handles mixed success and failure
    Given I am on the enhance page
    And I mock some uploads to fail
    When I upload 5 images in batch
    Then successful uploads should show success status
    And failed uploads should show error status
    And I should see a summary of results

  Scenario: Batch upload validates file sizes
    Given I am on the enhance page
    When I select images where some exceed 50MB
    Then oversized images should be rejected
    And valid images should proceed to upload
    And I should see size validation errors for rejected files

  Scenario: Batch upload validates file types
    Given I am on the enhance page
    When I select mixed files including non-images
    Then only valid image files should be queued
    And non-image files should show validation errors

  Scenario: View batch uploaded images in list
    Given I have uploaded 5 images in a batch
    When I visit "/enhance"
    Then I should see all 5 images in the images list
    And images should be sorted by upload date

  Scenario: Select multiple images for batch enhancement
    Given I have uploaded multiple images
    When I visit "/enhance"
    And I select 3 images using checkboxes
    Then I should see "3 selected" indicator
    And I should see "Enhance Selected" button

  Scenario: Batch enhance with tier selection
    Given I have 5 uploaded images
    And I have selected 3 images for enhancement
    When I click "Enhance Selected" button
    Then I should see a tier selection modal
    And I should see "TIER_1K" option
    And I should see "TIER_2K" option
    And I should see "TIER_4K" option
    And each tier should show total token cost for 3 images

  Scenario: Confirm batch enhancement with sufficient tokens
    Given I have 3 images selected for enhancement
    And I have 100 tokens
    When I select "TIER_1K" tier for batch enhancement
    And I confirm the batch enhancement
    Then all 3 images should start processing
    And my token balance should decrease by the total cost

  Scenario: Batch enhancement shows insufficient tokens warning
    Given I have 5 images selected for enhancement
    And I have 5 tokens
    When I try to batch enhance with "TIER_2K"
    Then I should see insufficient tokens warning
    And the enhancement should not proceed
    And I should see "Get Tokens" button

  Scenario: Cancel batch enhancement
    Given I have images selected for batch enhancement
    And the tier selection modal is open
    When I click "Cancel" button
    Then the modal should close
    And no enhancements should start
    And images should remain selected

  Scenario: Batch enhancement progress tracking
    Given I have started batch enhancement for 4 images
    When the enhancements are processing
    Then I should see individual progress for each image
    And I should see overall batch progress
    And completed enhancements should show before pending ones

  Scenario: Deselect all images in batch
    Given I have 5 images selected
    When I click "Deselect All" button
    Then no images should be selected
    And the "Enhance Selected" button should be disabled

  Scenario: Select all images in batch
    Given I have 10 uploaded images
    When I click "Select All" button
    Then all 10 images should be selected
    And I should see "10 selected" indicator

  Scenario: Batch delete multiple images
    Given I have 6 uploaded images
    And I have selected 3 images
    When I click "Delete Selected" button
    And I confirm the batch deletion
    Then all 3 selected images should be removed
    And I should see 3 images remaining

  Scenario: Cancel batch deletion
    Given I have 4 images selected for deletion
    When I click "Delete Selected" button
    And I cancel the deletion confirmation
    Then all 4 images should remain in the list
    And images should remain selected

  Scenario: Batch operations show loading state
    Given I have started batch enhancement
    When the batch is processing
    Then the "Enhance Selected" button should be disabled
    And I should see "Processing batch..." indicator

  Scenario: Batch upload maximum file limit
    Given I am on the enhance page
    When I select more than 20 images for upload
    Then I should see a warning about the limit
    And only the first 20 images should be queued

  Scenario: Resume failed batch enhancements
    Given I had a batch enhancement that partially failed
    When I visit "/enhance"
    Then I should see which images failed
    And I should see "Retry Failed" button
    When I click "Retry Failed" button
    Then only failed images should be re-queued for enhancement

  Scenario: View batch enhancement history
    Given I have completed several batch enhancements
    When I visit "/enhance"
    Then I should see batch enhancement completion times
    And I should see which images were processed together

  Scenario: Batch enhancement tier cost preview
    Given I have 5 images selected
    When I open the tier selection modal
    Then "TIER_1K" should show "10 tokens (2 × 5 images)"
    And "TIER_2K" should show "20 tokens (4 × 5 images)"
    And "TIER_4K" should show "40 tokens (8 × 5 images)"
