Feature: Share Page - Public Image Sharing
  As a user who received a share link
  I want to view shared enhanced images
  So that I can see before/after comparisons without logging in

  # Share page tests for public image viewing
  @fast @requires-db
  Scenario: Share page loads with valid token
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And I should see the image comparison slider
    And I should see "Before" label
    And I should see "After" label

  @fast @requires-db
  Scenario: Share page displays image name and tier badge
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And I should see the image name displayed
    And I should see a tier badge

  @fast
  Scenario: Share page shows 404 for invalid token
    When I visit the share page with token "invalid-token-does-not-exist"
    Then I should see a 404 or not found page

  @fast
  Scenario: Share page shows 404 for empty token
    When I visit "/share/"
    Then I should see a 404 or not found page

  @fast @requires-db
  Scenario: Share page has download buttons
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And I should see "Download Original" button
    And I should see "Download Enhanced" button

  @fast @requires-db
  Scenario: Share page header links to home
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And I should see the Pixel logo linking to home
    And I should see "Enhanced with Pixel" link in footer

  @fast @requires-db
  Scenario: Image comparison slider is interactive
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And the comparison slider should have cursor ew-resize style
    And the slider divider should be visible

  @fast @requires-db
  Scenario: Share page works without authentication
    Given I am not logged in
    When I visit the share page with token "e2e-share-token-123"
    Then the page should load successfully
    And I should see the image comparison slider
    And I should NOT be redirected to sign-in page
