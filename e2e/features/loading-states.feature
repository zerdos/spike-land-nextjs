Feature: Loading States and Skeletons
  As a user
  I want to see visual feedback during navigation and data loading
  So that I know the application is working and content is being loaded

  Scenario: Loading files exist for priority routes
    Given the loading components are implemented
    Then loading.tsx should exist for my-apps route
    And loading.tsx should exist for my-apps/new route
    And loading.tsx should exist for profile route
    And loading.tsx should exist for settings route

  Scenario: Skeleton component is available
    Given the loading components are implemented
    Then skeleton.tsx should exist in components/ui
    And skeleton component should have tests

  Scenario: Skeleton components are available
    Given the loading components are implemented
    Then app-card-skeleton.tsx should exist
    And wizard-step-skeleton.tsx should exist
    And profile-skeleton.tsx should exist
    And settings-skeleton.tsx should exist

  Scenario: All loading components have tests
    Given the loading components are implemented
    Then all loading files should have corresponding test files
    And all skeleton components should have corresponding test files
