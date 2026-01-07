@requires-db
Feature: Canvas Smart Photo Frame Display
  As a user
  I want to display my album photos on any browser-based device
  So that I can use TVs and tablets as smart photo frames

  Background:
    Given I am authenticated as a user with albums

  # Canvas Display Page Tests
  @canvas
  Scenario: Canvas page loads with valid album
    Given I have an UNLISTED album with images
    When I navigate to the canvas page for that album
    Then I should see a fullscreen black background
    And I should see the first album image displayed

  @canvas
  Scenario: Canvas page shows 404 for invalid album
    When I navigate to "/canvas/invalid-album-id?token=invalid-token"
    Then I should see a 404 error page

  @canvas
  Scenario: Canvas page requires token for UNLISTED album
    Given I have an UNLISTED album with images
    When I navigate to the canvas page without token
    Then I should see a 404 error page

  @canvas
  Scenario: Canvas page applies rotation transform
    Given I have an UNLISTED album with images
    When I navigate to the canvas page with rotation "90"
    Then I should see the image rotated by 90 degrees

  @canvas
  Scenario: Canvas page shows slideshow settings from URL
    Given I have an UNLISTED album with images
    When I navigate to the canvas page with interval "15" and order "random"
    Then the slideshow should be configured with those settings

  # QR Panel Tests on Album Page
  @qr-panel
  Scenario: QR panel appears on UNLISTED album page for owner
    Given I have an UNLISTED album with images
    When I navigate to my album detail page
    Then I should see the Canvas Display QR panel
    And the QR panel should contain a QR code image
    And the QR panel should have settings controls

  @qr-panel
  Scenario: QR panel NOT visible on PRIVATE album
    Given I have a PRIVATE album with images
    When I navigate to my album detail page
    Then I should NOT see the Canvas Display QR panel

  @qr-panel
  Scenario: QR panel settings controls work
    Given I have an UNLISTED album with images
    And I am on my album detail page
    When I change the rotation setting to "90"
    Then the QR code URL should contain "rotation=90"
    When I change the order setting to "random"
    Then the QR code URL should contain "order=random"
    When I change the interval setting to "30"
    Then the QR code URL should contain "interval=30"

  @qr-panel
  Scenario: Copy URL button works
    Given I have an UNLISTED album with images
    And I am on my album detail page
    When I click the "Copy URL" button in the QR panel
    Then I should see "Copied!" feedback text
    And the clipboard should contain the canvas URL

  @qr-panel
  Scenario: Open Canvas button opens new tab
    Given I have an UNLISTED album with images
    And I am on my album detail page
    When I click the "Open" button in the QR panel
    Then a new tab should open with the canvas URL

  # Slideshow Behavior Tests
  @slideshow
  Scenario: Slideshow advances automatically
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page with interval "5"
    And I wait for 6 seconds
    Then the displayed image should have changed

  @slideshow
  Scenario: Random order shuffles images
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page with order "random"
    Then the images should be displayed in a shuffled order

  @slideshow
  Scenario: Album order preserves sequence
    Given I have an UNLISTED album with multiple images
    When I navigate to the canvas page with order "album"
    Then the images should be displayed in album order

  # Accessibility Tests
  @accessibility
  Scenario: Canvas page hides cursor after idle
    Given I have an UNLISTED album with images
    When I navigate to the canvas page
    And I do not move the mouse for 3 seconds
    Then the cursor should be hidden

  @accessibility
  Scenario: QR panel is accessible
    Given I have an UNLISTED album with images
    When I am on my album detail page
    Then the QR panel should have proper ARIA labels
    And the settings controls should be keyboard accessible
