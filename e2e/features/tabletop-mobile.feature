Feature: Mobile Tabletop Interaction
  As a mobile user
  I want to interact with the tabletop simulator on my phone
  So that I can play games on the go

  @tabletop @mobile
  Scenario: Mobile user can access tabletop simulator home page
    Given I am on a mobile device
    And I am on the tabletop simulator home page
    Then I should see the create room button
    And I should see the join room input

  @tabletop @mobile
  Scenario: Mobile user can switch between camera and interaction modes
    Given I am on a mobile device
    And I am in a tabletop game room
    Then the mode should default to orbit mode
    When I tap the mode toggle
    Then the mode should switch to interaction mode
    And I should see interaction mode active indicator

  @tabletop @mobile
  Scenario: Mobile user sees the hand drawer
    Given I am on a mobile device
    And I am in a tabletop game room
    Then the hand drawer should be visible
    And I should see the empty hand message

  @tabletop @mobile
  Scenario: Mobile controls are properly sized for touch
    Given I am on a mobile device
    And I am in a tabletop game room
    Then the mode toggle button should be at least 56 pixels tall
    And the controls should have adequate touch targets
