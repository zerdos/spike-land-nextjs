# Authentication bypass fixed in src/auth.ts - See GitHub issue #435
Feature: Home Page
  As a user
  I want to visit the home page
  So that I can see the Pixel photo restoration landing page

  Scenario: View home page
    Given I am on the home page
    Then I should see the page title "Old Photos. New Life."
    And I should see the description "Your iPhone 4 photos deserve iPhone 16 quality"

  Scenario: View features section
    Given I am on the home page
    When I view the features section
    Then I should see "Why Pixel?" heading
    And I should see the following feature items:
      | item              |
      | 60-Second Magic   |
      | Print-Ready 4K    |
      | Batch Albums      |
      | Free Forever Tier |

  Scenario: View action links
    Given I am on the home page
    Then I should see a "Restore Your Photos" link
    And I should see a "See Examples" link

  Scenario: Links are clickable
    Given I am on the home page
    When I click the "Restore Your Photos" link
    Then the link should be interactive
    When I click the "See Examples" link
    Then the link should be interactive
