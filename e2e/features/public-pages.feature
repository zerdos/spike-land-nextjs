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
    And I should see "Pixel Brand Guidelines" text

  @fast
  Scenario: Storybook page shows tab navigation
    When I visit "/storybook"
    Then the page should load successfully
    And I should see the storybook tabs:
      | Tab         |
      | Brand       |
      | Colors      |
      | Typography  |
      | Buttons     |
      | Components  |

  @fast
  Scenario: Storybook brand tab displays logo variants
    When I visit "/storybook"
    Then the page should load successfully
    And I should see "Logo - The AI Spark" text
    And I should see "Sizes" text
    And I should see "Variants" text

  @fast
  Scenario: Storybook colors tab displays color palette
    When I visit "/storybook"
    And I click the "Colors" tab
    Then I should see "Color Palette" text
    And I should see "Brand Colors" text
    And I should see "Pixel Cyan" text

  @fast
  Scenario: Storybook typography tab displays fonts
    When I visit "/storybook"
    And I click the "Typography" tab
    Then I should see "Typography" text
    And I should see "Font Families" text
    And I should see "Montserrat" text

  @fast
  Scenario: Storybook buttons tab displays button variants
    When I visit "/storybook"
    And I click the "Buttons" tab
    Then I should see "Buttons" text
    And I should see "Variants" text

  @fast
  Scenario: Storybook components tab displays UI components
    When I visit "/storybook"
    And I click the "Components" tab
    Then I should see "Components" text
    And I should see "Cards" text
    And I should see "Badges" text
    And I should see "Form Elements" text

  @fast
  Scenario: Storybook page shows footer
    When I visit "/storybook"
    Then the page should load successfully
    And I should see "Pixel Design System" text
    And I should see "Spike Land Platform" text

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
