@video-wall
Feature: Layout Optimization
  As a presenter
  I want the video wall to automatically optimize layouts
  So that all participants are displayed clearly regardless of count

  Background:
    Given I am on the display page

  Scenario: Layout transitions smoothly when clients join
    Given 1 client is connected with camera enabled
    When a second client connects with camera enabled
    Then the layout should transition from full screen to 2-column
    And the transition should be smooth without flickering
    And both video feeds should be visible

  Scenario: Layout adjusts when clients leave
    Given 4 clients are connected with camera enabled
    When 2 clients disconnect
    Then the layout should transition from 2x2 grid to 2-column
    And the remaining 2 video feeds should scale up
    And the transition should be smooth

  Scenario: Layout handles rapid client connections
    When 3 clients connect rapidly within 2 seconds
    Then the layout should settle on 3-column layout
    And all 3 video feeds should be visible
    And there should be no layout flickering

  Scenario: Layout optimizes for different screen aspect ratios
    Given the display viewport is set to ultrawide (21:9)
    When 3 clients connect with camera enabled
    Then the video feeds should be optimized for ultrawide display
    And there should be no excessive black bars

  Scenario: Layout handles maximum client capacity
    When 9 clients connect with camera enabled
    Then the layout should show all 9 video feeds
    And the video feeds should be in 3x3 grid layout
    And each feed should be clearly visible

  Scenario Outline: Layout adapts to different client counts
    When <count> clients connect with camera enabled
    Then I should see <count> video feeds displayed
    And the layout should be optimized for <count> feeds
    And all feeds should be clearly visible

    Examples:
      | count |
      | 1     |
      | 2     |
      | 3     |
      | 4     |
      | 5     |
      | 6     |

  Scenario: Active speaker detection highlights video feed
    Given 3 clients are connected with camera enabled
    When client "Alice" becomes the active speaker
    Then "Alice" video feed should be highlighted
    And "Alice" video feed should have a visual indicator
    When client "Bob" becomes the active speaker
    Then "Bob" video feed should be highlighted
    And "Alice" video feed should no longer be highlighted

  Scenario: Pinned video feed remains prominent
    Given 4 clients are connected with camera enabled
    When I pin client "Alice" video feed
    Then "Alice" video feed should be larger than others
    And other clients should be shown in smaller tiles
    When I unpin client "Alice" video feed
    Then the layout should return to 2x2 grid
    And all feeds should be equal size
