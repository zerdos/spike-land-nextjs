@requires-db @smart-gallery
Feature: Pixel Smart Gallery
  As a user viewing a shared album
  I want to browse images in a grid and slideshow view
  So that I can see enhanced photos and compare with originals

  Background:
    Given I have an album with gallery images

  # =====================================
  # GRID VIEW INTERACTIONS
  # =====================================

  @grid
  Scenario: Select image in grid shows enhanced version with green glow
    Given I am viewing an album gallery page
    When I click on an image thumbnail
    Then the image should have a green glow border
    And the image should have aria-selected true
    And the thumbnail should show the enhanced version if available

  @grid @keyboard
  Scenario: Navigate grid with right arrow key
    Given I am viewing an album gallery page
    And I have selected an image
    When I press the right arrow key
    Then the next image should be selected
    And the previously selected image should not have the green glow

  @grid @keyboard
  Scenario: Navigate grid with left arrow key
    Given I am viewing an album gallery page
    And I have selected an image
    When I press the left arrow key
    Then the previous image should be selected

  @grid @keyboard
  Scenario: Navigation wraps around at grid boundaries
    Given I am viewing an album gallery page
    And I have selected the first image
    When I press the left arrow key
    Then the last image should be selected
    When I press the right arrow key
    Then the first image should be selected again

  @grid @touch
  Scenario: Touch tap selects image in grid
    Given I am viewing an album gallery page on a touch device
    When I tap on an image thumbnail
    Then the image should have a green glow border
    And the image should have aria-selected true

  @grid
  Scenario: Auto-cycle advances selection in grid mode
    Given I am viewing an album gallery page with auto-cycle interval of 3 seconds
    And I have selected the first image
    When I wait for 4 seconds
    Then a different image should be selected

  # =====================================
  # GRID TO SLIDESHOW TRANSITIONS
  # =====================================

  @slideshow @keyboard
  Scenario: Spacebar enters slideshow from grid
    Given I am viewing an album gallery page
    And I have selected an image
    When I press the spacebar key
    Then I should see the slideshow view
    And the image should be displayed fullscreen
    And the slideshow should have role dialog

  @slideshow @keyboard
  Scenario: Enter key enters slideshow from grid
    Given I am viewing an album gallery page
    And I have selected an image
    When I press the Enter key
    Then I should see the slideshow view

  @slideshow @touch
  Scenario: Double-tap enters slideshow on touch device
    Given I am viewing an album gallery page on a touch device
    And I have selected an image
    When I double-tap on the selected image
    Then I should see the slideshow view
    And the image should be displayed fullscreen

  @slideshow
  Scenario: Hero animation expands image from grid position
    Given I am viewing an album gallery page
    And I have selected an image
    When I press the spacebar key
    Then the slideshow should animate from the grid position
    And the transition should complete within 400ms

  # =====================================
  # SLIDESHOW INTERACTIONS
  # =====================================

  @slideshow @keyboard
  Scenario: Navigate slideshow with right arrow key
    Given I am in slideshow mode
    When I press the right arrow key
    Then I should see the next image in the slideshow

  @slideshow @keyboard
  Scenario: Navigate slideshow with left arrow key
    Given I am in slideshow mode
    When I press the left arrow key
    Then I should see the previous image in the slideshow

  @slideshow @keyboard
  Scenario: Spacebar exits slideshow and returns to grid
    Given I am in slideshow mode
    When I press the spacebar key
    Then I should return to grid view
    And the previously viewed image should still be selected

  @slideshow @keyboard
  Scenario: Escape key exits slideshow
    Given I am in slideshow mode
    When I press the Escape key
    Then I should return to grid view

  @slideshow @keyboard
  Scenario: Peek at original with B key hold
    Given I am in slideshow mode viewing an enhanced image
    When I press and hold the B key
    Then I should see the original image version
    And the screen reader should announce showing original
    When I release the B key
    Then I should see the enhanced image version again

  @slideshow @touch
  Scenario: Swipe left navigates to next image
    Given I am in slideshow mode on a touch device
    When I swipe left on the slideshow
    Then I should see the next image in the slideshow

  @slideshow @touch
  Scenario: Swipe right navigates to previous image
    Given I am in slideshow mode on a touch device
    When I swipe right on the slideshow
    Then I should see the previous image in the slideshow

  @slideshow @touch
  Scenario: Long press shows original on touch device
    Given I am in slideshow mode on a touch device viewing an enhanced image
    When I long press on the slideshow image
    Then I should see the original image version
    When I release the long press
    Then I should see the enhanced image version again

  @slideshow
  Scenario: Navigation controls appear on mouse movement
    Given I am in slideshow mode
    When I move the mouse
    Then the navigation controls should be visible
    And the exit button should be visible

  @slideshow
  Scenario: Navigation controls hide after inactivity
    Given I am in slideshow mode
    And the navigation controls are visible
    When I do not move the mouse for 3 seconds
    Then the navigation controls should be hidden

  @slideshow
  Scenario: Click previous button navigates to previous image
    Given I am in slideshow mode
    And the navigation controls are visible
    When I click the previous button
    Then I should see the previous image in the slideshow

  @slideshow
  Scenario: Click next button navigates to next image
    Given I am in slideshow mode
    And the navigation controls are visible
    When I click the next button
    Then I should see the next image in the slideshow

  @slideshow
  Scenario: Click exit button returns to grid
    Given I am in slideshow mode
    And the navigation controls are visible
    When I click the exit button
    Then I should return to grid view

  # =====================================
  # EDGE CASES
  # =====================================

  @edge-case
  Scenario: Single image album disables navigation
    Given I have an album with only one image
    When I enter slideshow mode
    Then the previous button should be disabled
    And the next button should be disabled
    And the arrow keys should not change the image

  @edge-case
  Scenario: Empty album shows empty state message
    Given I have an empty album
    When I navigate to the album gallery page
    Then I should see the empty album message
    And I should see "No images in this album"

  @edge-case
  Scenario: Images without enhanced versions use original in grid
    Given I have an album with images that have no enhanced versions
    When I am viewing the album gallery page
    And I click on an image thumbnail
    Then the thumbnail should show the original version
    And the image should still have a green glow border

  @edge-case
  Scenario: Images without enhanced versions use original in slideshow
    Given I have an album with images that have no enhanced versions
    When I enter slideshow mode
    Then the slideshow should show the original image
    And the B key peek should have no visible effect

  @edge-case
  Scenario: Image load error shows fallback
    Given I have an album with an image that fails to load
    When I am viewing the album gallery page
    Then I should see an error fallback for the failed image
    And I should see "Failed to load" text

  # =====================================
  # ACCESSIBILITY
  # =====================================

  @accessibility
  Scenario: Grid has proper ARIA attributes
    Given I am viewing an album gallery page
    Then the grid should have role grid
    And the grid should have aria-label "Photo gallery"
    And each thumbnail should have role gridcell

  @accessibility
  Scenario: Grid thumbnails are keyboard focusable
    Given I am viewing an album gallery page
    When I press Tab to navigate
    Then focus should move to the first thumbnail
    And the focused thumbnail should have a visible focus ring

  @accessibility
  Scenario: Slideshow has proper ARIA attributes
    Given I am in slideshow mode
    Then the slideshow should have role dialog
    And the slideshow should have aria-modal true
    And the slideshow should have aria-label "Image slideshow"

  @accessibility
  Scenario: Slideshow announces image changes to screen readers
    Given I am in slideshow mode
    Then there should be a screen reader status region
    When I press the right arrow key
    Then the status region should announce the new image position

  @accessibility
  Scenario: Navigation buttons have accessible labels
    Given I am in slideshow mode
    And the navigation controls are visible
    Then the previous button should have aria-label "Previous image"
    And the next button should have aria-label "Next image"
    And the exit button should have aria-label "Exit slideshow"

  # =====================================
  # ROTATION SUPPORT
  # =====================================

  @rotation
  Scenario: Grid applies rotation transform
    Given I am viewing an album gallery page with rotation 90 degrees
    Then the grid should be rotated by 90 degrees

  @rotation
  Scenario: Slideshow applies rotation transform
    Given I am in slideshow mode with rotation 90 degrees
    Then the slideshow image should be rotated by 90 degrees
