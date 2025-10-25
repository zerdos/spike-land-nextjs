Feature: Loading States and Skeletons
  As a user
  I want to see visual feedback during navigation and data loading
  So that I know the application is working and content is being loaded

  Scenario: My Apps page shows loading skeleton
    Given I am on the my-apps page
    When the page is loading
    Then I should see skeleton placeholders
    And the skeleton should match the page layout

  Scenario: New App wizard shows loading skeleton
    Given I am on the new app creation page
    When the page is loading
    Then I should see wizard step skeleton
    And the skeleton should include form field placeholders

  Scenario: Profile page shows loading skeleton
    Given I am on the profile page
    When the page is loading
    Then I should see profile skeleton
    And the skeleton should include avatar placeholder
    And the skeleton should include user information placeholders

  Scenario: Settings page shows loading skeleton
    Given I am on the settings page
    When the page is loading
    Then I should see settings skeleton
    And the skeleton should include tab placeholders
    And the skeleton should include form field placeholders

  Scenario: Loading skeleton has animation
    Given I am on any page with loading state
    When the skeleton is displayed
    Then the skeleton elements should have pulse animation
    And the animation should be smooth and consistent

  Scenario: Loading transitions are smooth
    Given I navigate between pages
    When a page is loading
    Then the loading skeleton should appear immediately
    And the transition to actual content should be smooth
    And there should be no blank white screens

  Scenario: Skeleton matches actual content layout
    Given I am viewing a page skeleton
    When the actual content loads
    Then the content layout should closely match the skeleton structure
    And users should not experience jarring layout shifts
