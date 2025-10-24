@video-wall
Feature: Connection Management
  As a video wall system
  I want to handle client connections reliably
  So that users have a stable experience

  Scenario: Display generates unique connection ID on load
    Given I am on the display page
    Then a unique connection ID should be generated
    And the connection ID should be displayed
    And the connection ID should be encoded in the QR code

  Scenario: Client connects using QR code scan
    Given I am on the display page
    And a QR code is displayed
    When I scan the QR code with a client device
    Then the client page should open with the connection ID
    And the client should automatically connect to the display
    And the display should show the new client's video feed

  Scenario: Client connects using manual connection ID
    Given I am on the display page with connection ID "test-display-123"
    When I navigate to the client page with ID "test-display-123"
    And I grant camera permissions
    Then I should be connected to the display
    And the display should show my video feed

  Scenario: Client receives error for invalid connection ID
    When I navigate to the client page with ID "invalid-id-999"
    Then I should see "Invalid connection ID" error message
    And I should not be able to connect

  Scenario: Display handles WebRTC connection establishment
    Given I am on the display page
    When a client attempts to connect
    Then the display should establish a WebRTC peer connection
    And the connection should use STUN/TURN servers
    And the connection state should be "connected"

  Scenario: Display handles client connection timeout
    Given I am on the display page
    When a client attempts to connect but network is slow
    And the connection takes longer than 30 seconds
    Then the connection should timeout
    And the client should see "Connection timeout" error
    And the client should be able to retry

  Scenario: Display handles simultaneous client connections
    Given I am on the display page
    When 3 clients attempt to connect simultaneously
    Then all 3 clients should connect successfully
    And the display should show 3 video feeds
    And each client should have a stable connection

  Scenario: Client reconnects after network interruption
    Given I am connected to the display as a client
    When the network connection is interrupted briefly
    Then the client should automatically attempt to reconnect
    And the connection should be re-established
    And my video feed should resume on the display

  Scenario: Client reconnects after page refresh
    Given I am connected to the display as a client
    When I refresh the client page
    And I grant camera permissions again
    Then I should reconnect to the same display
    And my video feed should appear on the display

  Scenario: Display removes client after prolonged disconnection
    Given I am connected to the display as a client
    When the network connection is lost for more than 60 seconds
    Then the display should remove my video feed
    And the display should show "Client disconnected" notification
    And the layout should adjust for remaining clients

  Scenario: Display shows connection status indicators
    Given I am on the display page
    When 2 clients are connected
    Then I should see connection status for each client
    And the status should show "Connected" in green
    When 1 client's connection becomes unstable
    Then the status should show "Poor Connection" in yellow

  Scenario: Client shows connection quality indicators
    Given I am connected to the display as a client
    When the connection quality is good
    Then I should see a green connection indicator
    When the connection quality degrades
    Then I should see a yellow or red connection indicator
    And I should see network statistics (latency, packet loss)

  Scenario: Display handles graceful client disconnect
    Given 3 clients are connected to the display
    When 1 client clicks the disconnect button
    Then the client should disconnect cleanly
    And the display should remove the client's video feed immediately
    And the remaining clients should stay connected
    And the layout should adjust to 2-column

  Scenario: Display persists connection ID across page refreshes
    Given I am on the display page with connection ID "test-123"
    When I refresh the display page
    Then the connection ID should remain "test-123"
    And the QR code should still show the same ID
    And previously connected clients should be able to reconnect

  Scenario: Client handles display disconnect
    Given I am connected to the display as a client
    When the display page is closed
    Then I should see "Display disconnected" error
    And I should see option to return to home or retry
    And my camera feed should stop streaming
