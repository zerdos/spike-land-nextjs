
@tabletop-simulator
Feature: Tabletop Simulator Game

  Scenario: Create a new game room
    Given I am on the tabletop simulator page
    When I click "Create New Room"
    Then I should be redirected to a game room

  Scenario: Join an existing room
    Given I am on the tabletop simulator page
    When I enter a room code "123456"
    And I click "Join"
    Then I should be redirected to room "123456"

  Scenario: User sees game UI
    Given I am in a game room
    Then I should see the controls panel

