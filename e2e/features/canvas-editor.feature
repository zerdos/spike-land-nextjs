@requires-db
Feature: Canvas Editor Tool
  As a user
  I want to use the canvas editor to view and interact with my album photos
  So that I can create engaging photo displays

  Background:
    Given I am authenticated as a user with albums

  # Canvas Page Load Tests
  @fast @smoke
  Scenario: Canvas page loads with valid album and token
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then the canvas container should be visible
    And I should see the first album image displayed
    And the canvas should have fullscreen styling

  @fast
  Scenario: Canvas page displays album title
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then I should see the album title in the header area
    And the title should be visible on hover

  @fast
  Scenario: Canvas page handles missing images gracefully
    Given I have an album with no images
    When I navigate to the canvas page for that album
    Then I should see an empty album message
    And I should see "Add photos to your album" text

  # Canvas Tools Visibility Tests
  @fast
  Scenario: Canvas toolbar appears on mouse movement
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I move the mouse over the canvas
    Then the canvas toolbar should be visible
    And I should see the zoom controls
    And I should see the navigation arrows

  @fast
  Scenario: Canvas toolbar hides after inactivity
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I move the mouse over the canvas
    Then the canvas toolbar should be visible
    When I do not move the mouse for 3 seconds
    Then the canvas toolbar should be hidden

  @fast
  Scenario: Canvas tools are displayed in fullscreen mode
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the fullscreen button
    Then I should see the exit fullscreen button
    And I should see the slideshow controls

  # Canvas Navigation Tests
  @fast
  Scenario: Navigate to next image using arrow button
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I click the next arrow button
    Then the next image should be displayed
    And the image counter should update

  @fast
  Scenario: Navigate to previous image using arrow button
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I click the next arrow button
    And I click the previous arrow button
    Then the first image should be displayed

  @fast
  Scenario: Navigate using keyboard arrows
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I press the right arrow key
    Then the next image should be displayed
    When I press the left arrow key
    Then the first image should be displayed

  @fast
  Scenario: Image counter shows current position
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    Then I should see the image counter showing "1 of 5"
    When I click the next arrow button
    Then I should see the image counter showing "2 of 5"

  # Canvas Zoom Controls Tests
  @fast
  Scenario: Zoom in on image
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the zoom in button
    Then the image should be zoomed in
    And I should see the zoom level indicator

  @fast
  Scenario: Zoom out on image
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the zoom in button
    And I click the zoom out button
    Then the image should return to original size

  @fast
  Scenario: Double-click to zoom
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I double-click on the image
    Then the image should be zoomed in
    When I double-click on the image again
    Then the image should return to original size

  @fast
  Scenario: Reset zoom button
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the zoom in button multiple times
    And I click the reset zoom button
    Then the image should return to original size
    And the zoom level should be "100%"

  # Slideshow Controls Tests
  @slow
  Scenario: Start and stop slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I click the play slideshow button
    Then the slideshow should start
    And the play button should change to pause
    When I wait for 6 seconds
    Then a different image should be displayed
    When I click the pause button
    Then the slideshow should stop

  @fast
  Scenario: Slideshow interval selector
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I open the slideshow settings
    Then I should see the interval selector
    And I should see options for "5s", "10s", "15s", "30s"

  @slow
  Scenario: Custom slideshow interval
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I open the slideshow settings
    And I select "10" second interval
    And I click the play slideshow button
    And I wait for 11 seconds
    Then the displayed image should have changed

  # Rotation Controls Tests
  @fast
  Scenario: Rotate image clockwise
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the rotate clockwise button
    Then the image should be rotated 90 degrees clockwise

  @fast
  Scenario: Rotate image counter-clockwise
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the rotate counter-clockwise button
    Then the image should be rotated 90 degrees counter-clockwise

  # Touch Interactions (Mobile Simulation)
  @fast @mobile
  Scenario: Swipe to navigate images
    Given I have an UNLISTED album with multiple images
    And I am using a touch device
    When I navigate to the canvas page for that album
    And I swipe left on the canvas
    Then the next image should be displayed
    When I swipe right on the canvas
    Then the first image should be displayed

  @fast @mobile
  Scenario: Pinch to zoom
    Given I have an UNLISTED album with images
    And I am using a touch device
    When I navigate to the canvas page for that album
    And I pinch to zoom in
    Then the image should be zoomed in

  # Keyboard Shortcuts Tests
  @fast @accessibility
  Scenario: Keyboard shortcuts are functional
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I press the "F" key
    Then the canvas should enter fullscreen mode
    When I press the "Escape" key
    Then the canvas should exit fullscreen mode

  @fast @accessibility
  Scenario: Space bar toggles slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I press the space bar
    Then the slideshow should start
    When I press the space bar again
    Then the slideshow should stop

  # Loading States Tests
  @fast
  Scenario: Loading indicator during image load
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then I should see the loading indicator briefly
    And the loading indicator should disappear when image loads

  @fast
  Scenario: Loading indicator during image transition
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I click the next arrow button
    Then I should see the loading indicator during transition

  # Error Handling Tests
  @fast
  Scenario: Handle broken image gracefully
    Given I have an album with a broken image URL
    When I navigate to the canvas page for that album
    Then I should see the image error placeholder
    And I should see "Image could not be loaded" text

  @fast
  Scenario: Retry loading failed image
    Given I have an album with a broken image URL
    When I navigate to the canvas page for that album
    And I see the image error placeholder
    And I click the "Retry" button
    Then the image should attempt to reload

  # Accessibility Tests
  @fast @accessibility
  Scenario: Canvas is screen reader accessible
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then the images should have alt text
    And navigation buttons should have aria-labels
    And the current image should be announced

  @fast @accessibility
  Scenario: Focus management in canvas
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I tab through the controls
    Then focus should move through controls in logical order
    And focused elements should have visible focus indicators

  # URL Parameter Tests
  @fast
  Scenario: Canvas respects rotation URL parameter
    Given I have an UNLISTED album with images
    When I navigate to the canvas page with rotation "180"
    Then the image should be rotated by 180 degrees

  @fast
  Scenario: Canvas respects interval URL parameter
    Given I have an UNLISTED album with images
    When I navigate to the canvas page with interval "20"
    And I open the slideshow settings
    Then the interval selector should show "20s" selected

  @fast
  Scenario: Canvas respects order URL parameter
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page with order "random"
    Then the slideshow order should be set to random

  # Share Functionality Tests
  @fast
  Scenario: Share button generates shareable URL
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the share button
    Then I should see the share dialog
    And I should see the shareable canvas URL
    And I should see the copy URL button

  @fast
  Scenario: Copy canvas URL to clipboard
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click the share button
    And I click the copy URL button
    Then I should see "Copied!" feedback text
