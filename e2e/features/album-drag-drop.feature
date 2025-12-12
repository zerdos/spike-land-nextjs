Feature: Album Drag and Drop Organization
  As an authenticated user
  I want to drag and drop images within and between my albums
  So that I can organize my images efficiently

  Background:
    Given I am logged in as a test user
    And I have token balance of 50

  Scenario: Reorder images within album by dragging
    Given I have an album with 3 images
    When I navigate to my album detail page
    And I drag the first image to the third position
    Then the images should be reordered
    And the new order should be saved to the server
    And the new order should persist after page refresh

  Scenario: Visual feedback during drag operation
    Given I have an album with 3 images
    When I navigate to my album detail page
    And I start dragging the first image
    Then the dragged image should show reduced opacity
    And I should see the drag handle cursor
    When I drag over the second image
    Then the second image should show a drop indicator
    When I release the drag
    Then all visual indicators should be removed
    And the images should be in the new order

  Scenario: Drag multiple selected images
    Given I have an album with 5 images
    When I navigate to my album detail page
    And I enable selection mode
    And I select the first and second images
    And I disable selection mode
    And I drag one of the selected images to the fourth position
    Then both selected images should move together
    And the new order should be saved

  Scenario: Move images from one album to another
    Given I have two albums named "Vacation" and "Work"
    And the "Vacation" album has 3 images
    When I navigate to the "Vacation" album detail page
    And I enable selection mode
    And I select the first image
    And I click the Move button
    And I select the "Work" album from the dropdown
    And I confirm the move operation
    Then the image should appear in the "Work" album
    And the image should be removed from the "Vacation" album
    And the image counts should be updated correctly

  Scenario: Cancel drag operation with Escape key
    Given I have an album with 3 images
    When I navigate to my album detail page
    And I start dragging the first image
    And I press the Escape key
    Then the drag operation should be cancelled
    And the images should remain in their original order

  Scenario: Cannot drag images in selection mode
    Given I have an album with 3 images
    When I navigate to my album detail page
    And I enable selection mode
    Then the images should not be draggable
    And the drag handle should not be visible

  Scenario: Drag and drop saves order automatically
    Given I have an album with 4 images
    When I navigate to my album detail page
    And I drag the first image to the last position
    Then I should see a "Saving order..." indicator
    And the save operation should complete successfully
    And the indicator should disappear

  Scenario: Revert order on save failure
    Given I have an album with 3 images
    And the album order save endpoint will fail
    When I navigate to my album detail page
    And I drag the first image to the last position
    Then I should see an error message
    And the images should revert to their original order

  Scenario: Drag and drop on touch devices
    Given I am on a touch device
    And I have an album with 3 images
    When I navigate to my album detail page
    And I perform a touch drag on the first image to the third position
    Then the images should be reordered
    And the new order should be saved

  Scenario: Cannot drag images as viewer (non-owner)
    Given I am viewing a shared album that I do not own
    When I navigate to the shared album page
    Then the images should not be draggable
    And the drag handle should not be visible
    And I should not see the selection controls
