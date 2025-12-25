Feature: Public Pages - Storybook and Easter Eggs
  As a visitor to the site
  I want to access public showcase pages
  So that I can view the design system and discover hidden features

  # Storybook / Design System page tests
  @fast
  Scenario: Storybook page loads successfully
    When I visit "/storybook"
    Then the page should load successfully
    And I should see "Design System" heading
    And I should see "Design system & component library" text

  @fast
  Scenario: Storybook page shows navigation links
    When I visit "/storybook"
    Then the page should load successfully
    And I should see the storybook navigation links:
      | Link        |
      | Brand       |
      | Colors      |
      | Typography  |
      | Buttons     |
      | Components  |

  @fast
  Scenario: Storybook brand page displays logo variants
    When I visit "/storybook/brand"
    Then the page should load successfully
    And I should see "AI Spark Logo" text
    And I should see "Sizes & Scale" text
    And I should see "Structural Variants" text

  @fast
  Scenario: Storybook colors page displays color palette
    When I visit "/storybook/colors"
    Then the page should load successfully
    And I should see "Color Palette" text
    And I should see "Brand Colors" text
    And I should see "Pixel Cyan" text

  @fast
  Scenario: Storybook typography page displays fonts
    When I visit "/storybook/typography"
    Then the page should load successfully
    And I should see "Typography" text
    And I should see "The Font Stack" text
    And I should see "Montserrat" text

  @fast
  Scenario: Storybook buttons page displays button variants
    When I visit "/storybook/buttons"
    Then the page should load successfully
    And I should see "Buttons" text
    And I should see "Variants" text

  @fast
  Scenario: Storybook components page displays UI components
    When I visit "/storybook/components"
    Then the page should load successfully
    And I should see "UI Components" text
    And I should see "Card Variants" text
    And I should see "Badges" text
    And I should see "Inputs & Controls" text

  @fast
  Scenario: Storybook page shows footer
    When I visit "/storybook"
    Then the page should load successfully
    And I should see "Stable Version 1.2.0" text
    And I should see "Built for Spike Land Platform" text

  @fast
  Scenario: Storybook page is accessible without authentication
    Given I am not logged in
    When I visit "/storybook"
    Then the page should load successfully
    And I should see "Design System" heading
    And I should NOT be redirected to sign-in page

  # Comic Sans Easter Egg page tests
  @fast
  Scenario: Comic Sans page loads successfully
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Welcome, Friend!" heading
    And I should see Comic Sans styled text

  @fast
  Scenario: Comic Sans page displays fun facts
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Did You Know?" text
    And I should see "Comic Sans" text
    And I should see "1994" text

  @fast
  Scenario: Comic Sans page has navigation buttons
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Go to Homepage" link
    And I should see "Try Pixel App" link

  @fast
  Scenario: Comic Sans page displays feature cards
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Super Fast!" text
    And I should see "Made With Love" text

  @fast
  Scenario: Comic Sans page shows message section
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "A Message For You" text
    And I should see "Spike Land" text

  @fast
  Scenario: Comic Sans page footer has disclaimer
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Comic Sans is a perfectly valid font choice" text

  @fast
  Scenario: Comic Sans page is accessible without authentication
    Given I am not logged in
    When I visit "/comic-sans"
    Then the page should load successfully
    And I should see "Welcome, Friend!" heading
    And I should NOT be redirected to sign-in page

  @fast
  Scenario: Go to Homepage button navigates correctly
    When I visit "/comic-sans"
    And I click the "Go to Homepage" link
    Then I should be on the "/" page
