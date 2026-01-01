Feature: Mobile Tabletop Interaction
  As a mobile user
  I want to interact with the tabletop simulator on my phone
  So that I can play games on the go

  @tabletop @mobile
  Scenario: Mobile user can access tabletop simulator
    Given I am on a mobile device
    And I am on the tabletop simulator home page
    Then I should see the game canvas
    And I should see the mobile controls

  @tabletop @mobile
  Scenario: Mobile user can switch between camera and interaction modes
    Given I am on a mobile device
    And I am in a tabletop game room
    Then the mode should default to orbit mode
    When I tap the mode toggle
    Then the mode should switch to interaction mode
    And I should see interaction mode active indicator

  @tabletop @mobile
  Scenario: Mobile user can open the hand drawer
    Given I am on a mobile device
    And I am in a tabletop game room
    When I tap the hand button
    Then the hand drawer should expand
    And I should see the empty hand message

  @tabletop @mobile
  Scenario: Mobile controls are properly sized for touch
    Given I am on a mobile device
    And I am in a tabletop game room
    Then the mode toggle button should be at least 56 pixels tall
    And the controls should have adequate touch targets
