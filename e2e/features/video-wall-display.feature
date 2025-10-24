@skip
@video-wall
Feature: Smart Video Wall Display
  As a presenter
  I want to display a video wall on a large screen
  So that I can show connected client camera feeds

  Background:
    Given the video wall display page is open

  Scenario: Display shows QR code when no clients connected
    Then I should see a QR code for connection
    And I should see "Scan QR Code to Connect" text
    And I should see the connection URL displayed

  Scenario: Single client connects and displays full screen
    When 1 client connects with camera enabled
    Then I should see 1 video feed displayed
    And the video feed should be in full screen layout
    And the video feed should show the client's camera stream

  Scenario: Two clients connect and display in split layout
    When 2 clients connect with camera enabled
    Then I should see 2 video feeds displayed
    And the video feeds should be in 2-column layout
    And each video feed should be clearly visible

  Scenario: Three clients connect and display in optimized layout
    When 3 clients connect with camera enabled
    Then I should see 3 video feeds displayed
    And the video feeds should be in 3-column layout
    And each video feed should be clearly visible

  Scenario: Four clients connect and display in grid layout
    When 4 clients connect with camera enabled
    Then I should see 4 video feeds displayed
    And the video feeds should be in 2x2 grid layout
    And each video feed should be clearly visible

  Scenario: Multiple clients connect and display in 3-column layout
    When 5 clients connect with camera enabled
    Then I should see 5 video feeds displayed
    And the video feeds should be in 3-column layout
    And each video feed should be clearly visible

  Scenario: Client name labels are displayed
    When 2 clients connect with names "Alice" and "Bob"
    Then I should see "Alice" label on the first video feed
    And I should see "Bob" label on the second video feed

  Scenario: Video feeds update when clients disconnect
    Given 3 clients are connected with camera enabled
    When 1 client disconnects
    Then I should see 2 video feeds displayed
    And the video feeds should be in 2-column layout
    And the layout should adjust automatically

  Scenario: Display handles client reconnection
    Given 2 clients are connected with camera enabled
    When 1 client disconnects and reconnects
    Then I should see 2 video feeds displayed
    And the video feeds should be in 2-column layout
    And both feeds should be active
