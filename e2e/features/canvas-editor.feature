@requires-db
Feature: Canvas Smart Gallery
  As a user
  I want to use the canvas to view my album photos in a Smart Gallery
  So that I can browse thumbnails and view images in a fullscreen slideshow

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

  # Slideshow Entry Tests
  @fast
  Scenario: Enter slideshow via Start Slideshow button
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click a thumbnail to select an image
    And I click the Start Slideshow button
    Then the slideshow view should be visible
    And I should see the slideshow image
    And I should see the image counter

  @fast
  Scenario: Enter slideshow via Space bar
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click a thumbnail to select an image
    And I press the space bar
    Then the slideshow view should be visible

  # Slideshow Controls Visibility Tests
  @fast
  Scenario: Slideshow controls appear on mouse movement
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    Then the slideshow navigation controls should be visible

  @slow
  Scenario: Slideshow controls hide after inactivity
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    Then the slideshow navigation controls should be visible
    When I do not move the mouse for 4 seconds
    Then the slideshow navigation controls should be hidden

  # Slideshow Navigation Tests
  @fast
  Scenario: Navigate to next image in slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    And I click the slideshow next button
    Then the next image should be displayed
    And the image counter should update

  @fast
  Scenario: Navigate to previous image in slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    And I click the slideshow next button
    And I click the slideshow previous button
    Then the first image should be displayed

  @fast
  Scenario: Navigate using keyboard arrows in slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I press the right arrow key
    Then the next image should be displayed
    When I press the left arrow key
    Then the first image should be displayed

  @fast
  Scenario: Image counter shows current position in slideshow
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    Then I should see the image counter showing "1 of"
    When I move the mouse over the slideshow
    And I click the slideshow next button
    Then I should see the image counter showing "2 of"

  # Exit Slideshow Tests
  @fast
  Scenario: Exit slideshow with Escape key
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    Then the slideshow view should be visible
    When I press the "Escape" key
    Then the slideshow view should not be visible

  @fast @accessibility
  Scenario: Space bar toggles slideshow mode
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I click a thumbnail to select an image
    And I press the space bar
    Then the slideshow view should be visible
    When I press the space bar
    Then the slideshow view should not be visible

  # Rotation Controls Tests
  @fast
  Scenario: Rotate image clockwise in slideshow
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    And I click the rotate clockwise button
    Then the image should be rotated 90 degrees clockwise

  @fast
  Scenario: Rotate image counter-clockwise in slideshow
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    And I click the rotate counter-clockwise button
    Then the image should be rotated 90 degrees counter-clockwise

  # Touch Interactions (Mobile Simulation)
  @fast @mobile
  Scenario: Swipe to navigate images in slideshow
    Given I have an UNLISTED album with multiple images
    And I am using a touch device
    When I navigate to the canvas page for that album
    And I enter the slideshow via double-tap
    And I swipe left on the canvas
    Then the next image should be displayed
    When I swipe right on the canvas
    Then the first image should be displayed

  # Loading States Tests
  @fast
  Scenario: Loading indicator during image load
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then I should see the loading indicator briefly
    And the loading indicator should disappear when image loads

  @fast
  Scenario: Loading indicator during slideshow transition
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page for that album
    And I enter the slideshow
    And I move the mouse over the slideshow
    And I click the slideshow next button
    Then I should see the loading indicator during transition

  # Error Handling Tests
  @fast
  Scenario: Handle broken image gracefully
    Given I have an album with a broken image URL
    When I navigate to the canvas page for that album
    Then I should see the image error placeholder

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
  Scenario: Canvas respects order URL parameter
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page with order "random"
    Then the slideshow order should be set to random
