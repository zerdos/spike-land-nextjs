@fast
Feature: Storybook Design System Layout
  As a user viewing the design system
  I want to navigate using the sidebar and mobile menu
  So that I can easily browse all design system sections

  # Desktop Sidebar Tests
  Scenario: Desktop sidebar shows navigation sections
    When I visit "/storybook" on a desktop viewport
    Then the page should load successfully
    And I should see the desktop sidebar
    And I should see "Design System" text
    And I should see "Overview" in the sidebar navigation
    And I should see "Brand" in the sidebar navigation
    And I should see "Colors" in the sidebar navigation

  Scenario: Desktop sidebar highlights active section
    When I visit "/storybook/colors" on a desktop viewport
    Then the page should load successfully
    And "Colors" should be highlighted in the sidebar

  Scenario: Desktop sidebar navigation works
    When I visit "/storybook" on a desktop viewport
    Then the page should load successfully
    When I click "Brand" in the sidebar
    Then I should be on the "/storybook/brand" page
    And "Brand" should be highlighted in the sidebar

  # Mobile Menu Tests
  Scenario: Mobile menu toggle is visible on small screens
    When I visit "/storybook" on a mobile viewport
    Then the page should load successfully
    And I should see the mobile menu button
    And I should NOT see the desktop sidebar

  Scenario: Mobile menu opens and shows navigation
    When I visit "/storybook" on a mobile viewport
    And I click the mobile menu button
    Then I should see the mobile navigation drawer
    And I should see "Overview" in the navigation drawer
    And I should see "Brand" in the navigation drawer
    And I should see "Colors" in the navigation drawer

  Scenario: Mobile menu closes after navigation
    When I visit "/storybook" on a mobile viewport
    And I click the mobile menu button
    Then I should see the mobile navigation drawer
    When I click "Colors" in the navigation drawer
    Then the mobile navigation drawer should close
    And I should be on the "/storybook/colors" page

  Scenario: Mobile menu closes when pressing close button
    When I visit "/storybook" on a mobile viewport
    And I click the mobile menu button
    Then I should see the mobile navigation drawer
    When I close the mobile navigation drawer
    Then the mobile navigation drawer should close

  # Responsive Layout Tests
  Scenario: Layout adapts between mobile and desktop
    When I visit "/storybook"
    Then the page should load successfully
    When I resize the viewport to mobile
    Then I should see the mobile menu button
    When I resize the viewport to desktop
    Then I should see the desktop sidebar

  # Footer Tests
  Scenario: Sidebar displays version footer
    When I visit "/storybook" on a desktop viewport
    Then the page should load successfully
    And I should see "Pixel Design System v1.0" text
    And I should see "Spike Land Platform" text
