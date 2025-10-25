Feature: Loading States and Skeletons
  As a user
  I want to see visual feedback during navigation and data loading
  So that I know the application is working and content is being loaded

  Scenario: My Apps page loads with proper structure
    Given I am on the my-apps page
    Then the page should have proper layout structure
    And there should be no blank white screens

  Scenario: New App wizard loads with proper structure
    Given I am on the new app creation page
    Then the page should have wizard layout structure
    And there should be no blank white screens

  Scenario: Profile page loads with proper structure
    Given I am on the profile page
    Then the page should have profile layout structure
    And there should be no blank white screens

  Scenario: Settings page loads with proper structure
    Given I am on the settings page
    Then the page should have settings layout structure
    And there should be no blank white screens

  Scenario: Loading files exist for priority routes
    Given the loading components are implemented
    Then loading.tsx should exist for my-apps route
    And loading.tsx should exist for my-apps/new route
    And loading.tsx should exist for profile route
    And loading.tsx should exist for settings route

  Scenario: Pages load without layout shifts
    Given I navigate between pages
    Then the content should load smoothly
    And there should be no blank white screens
    And the layout should remain stable
