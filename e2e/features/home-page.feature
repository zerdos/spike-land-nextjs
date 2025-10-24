@skip
Feature: Home Page
  As a user
  I want to visit the home page
  So that I can see the application welcome screen

  Scenario: View home page
    Given I am on the home page
    Then I should see the page title "Welcome to Your App"
    And I should see the description "Built with Next.js 15, TypeScript, Tailwind CSS 4, and shadcn/ui"

  Scenario: View tech stack
    Given I am on the home page
    When I view the tech stack section
    Then I should see "Tech Stack:" heading
    And I should see the following tech stack items:
      | item                                  |
      | ✓ Next.js 15 with App Router          |
      | ✓ Strict TypeScript configuration     |
      | ✓ Tailwind CSS 4 (latest)             |
      | ✓ shadcn/ui components                |
      | ✓ ESLint configured                   |

  Scenario: View action buttons
    Given I am on the home page
    Then I should see a "Get Started" button
    And I should see a "Learn More" button

  Scenario: Buttons are clickable
    Given I am on the home page
    When I click the "Get Started" button
    Then the button should be interactive
    When I click the "Learn More" button
    Then the button should be interactive
