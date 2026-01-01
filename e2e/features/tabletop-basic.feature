Feature: Basic Tabletop Interaction
  As a user
  I want to interact with the tabletop simulator
  So that I can play games with friends

  @tabletop
  Scenario: User can access the tabletop simulator
    Given I am on the tabletop simulator home page
    Then I should see the game canvas
    And I should see the controls panel

  @tabletop
  Scenario: User can create a new game room
    Given I am on the tabletop simulator home page
    When I create a new game room
    Then I should be redirected to a room page
    And I should see the room code in the URL

  @tabletop
  Scenario: Game canvas displays the deck
    Given I am in a tabletop game room
    Then I should see the card deck on the table
    And I should see the controls panel

  @tabletop
  Scenario: User can toggle interaction mode
    Given I am in a tabletop game room
    When I click the mode toggle button
    Then the toggle button should show interaction mode active
    When I click the mode toggle button again
    Then the toggle button should show orbit mode active

  @tabletop
  Scenario: User can open the hand drawer
    Given I am in a tabletop game room
    When I click the hand toggle button
    Then the hand drawer should be visible
    And I should see the empty hand message

  @tabletop
  Scenario: User can roll dice
    Given I am in a tabletop game room
    When I click the dice roll button
    Then a dice should appear on the table
