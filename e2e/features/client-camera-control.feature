@skip
@video-wall
Feature: Client Camera Control
  As a video wall participant
  I want to control my camera settings from the client interface
  So that I can adjust my video feed appearance

  Background:
    Given the display page is open
    And I am on the client page with a valid connection ID

  Scenario: Client page shows camera preview on load
    When I grant camera permissions
    Then I should see my camera preview
    And I should see "Connected to Display" status
    And I should see camera control buttons

  Scenario: Client can enable and disable camera
    Given I am connected with camera enabled
    When I click the client camera "Toggle Camera" button
    Then my camera should be disabled
    And I should see "Camera Off" indicator
    When I click the client camera "Toggle Camera" button
    Then my camera should be enabled
    And I should see my camera preview

  Scenario: Client can mute and unmute microphone
    Given I am connected with camera enabled
    When I click the client camera "Toggle Microphone" button
    Then my microphone should be muted
    And I should see "Microphone Muted" indicator
    When I click the client camera "Toggle Microphone" button
    Then my microphone should be unmuted
    And I should see "Microphone Active" indicator

  Scenario: Client can adjust zoom level
    Given I am connected with camera enabled
    When I set the zoom level to 1.5
    Then the camera zoom should be set to 1.5x
    And the preview should show zoomed video
    When I set the zoom level to 1.0
    Then the camera zoom should be set to 1.0x

  Scenario: Client can switch between front and back camera
    Given I am connected with camera enabled
    And I have multiple cameras available
    When I click the client camera "Switch Camera" button
    Then the camera should switch to the next available camera
    And the preview should show the new camera feed

  Scenario: Client can share screen
    Given I am connected with camera enabled
    When I click the client camera "Share Screen" button
    And I grant screen sharing permissions
    Then my video feed should switch to screen sharing
    And I should see "Sharing Screen" indicator
    When I click the client camera "Stop Sharing" button
    Then my video feed should switch back to camera
    And I should see my camera preview

  Scenario: Client can set their display name
    When I enter "John Doe" in the name field
    And I click the client camera "Update Name" button
    Then my name should be updated to "John Doe"
    And the display should show "John Doe" as my label

  Scenario: Client receives error when camera permission is denied
    When I deny camera permissions
    Then I should see "Camera permission denied" error message
    And I should see instructions to enable camera access
    And the camera preview should not be visible

  Scenario: Client maintains connection when camera is disabled
    Given I am connected with camera enabled
    When I click the client camera "Toggle Camera" button
    Then my camera should be disabled
    And I should still be connected to the display
    And the display should show my placeholder or blank feed

  Scenario: Client can disconnect from display
    Given I am connected with camera enabled
    When I click the client camera "Disconnect" button
    Then I should be disconnected from the display
    And I should see "Disconnected" status
    And the display should remove my video feed
