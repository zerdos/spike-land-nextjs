# TODO: Investigate timeout issue in CI - See issue #23
# Temporarily disabled due to timeout issues in CI environment
@skip
Feature: Apps Display Routes
  As a user
  I want to navigate through the apps section
  So that I can access and explore available applications

  Scenario: View apps page
    Given I am on the apps page
    Then I should see the page heading "Applications"
    And I should see the description "Discover and explore our curated collection of interactive apps"
    And I should see "Featured Apps" section

  Scenario: View Smart Video Wall app card
    Given I am on the apps page
    Then I should see the app card "Smart Video Wall"
    And I should see the app description "A real-time video conferencing wall with WebRTC support. Display multiple video streams simultaneously with automatic layout optimization."
    And I should see the following tags:
      | tag       |
      | WebRTC    |
      | Video     |
      | Real-time |

  Scenario: View coming soon section
    Given I am on the apps page
    Then I should see "More Apps Coming Soon" heading
    And I should see "We are continuously building new interactive experiences. Check back soon for more applications."

  Scenario: Launch Smart Video Wall app
    Given I am on the apps page
    When I click the "Launch App" button for "Smart Video Wall"
    Then I should be on the display page
    And I should see "Smart Video Wall Display" heading
    And I should see "Waiting for clients to connect..." text

  Scenario: Display page shows QR code when no clients connected
    Given I am on the display page
    Then I should see a QR code image
    And I should see "Scan to connect your camera" text
    And I should see the display status indicator
    And the status indicator should show "Display Ready"

  Scenario: Display page shows status indicator
    Given I am on the display page
    Then I should see the display status indicator
    And the status indicator should contain a display ID

  Scenario: Navigate to client page requires display ID
    Given I am on the client page without displayId parameter
    Then I should see error message "No display ID provided. Please scan a QR code from a display."

  Scenario: Client page shows loading state
    Given I am on the client page with displayId parameter
    Then I should see "Starting camera..." text initially

  Scenario: Navigate from home to apps to display
    Given I am on the home page
    When I navigate to "/apps"
    Then I should be on the apps page
    When I click the "Launch App" button for "Smart Video Wall"
    Then I should be on the display page
    And I should see the QR code for connecting clients

  Scenario: Direct navigation to display page
    When I navigate directly to "/display"
    Then I should see "Smart Video Wall Display" heading
    And the page should load successfully

  Scenario: Direct navigation to client page with ID
    When I navigate directly to "/client?displayId=test-id"
    Then the client page should load
    And I should see the connection status indicator
