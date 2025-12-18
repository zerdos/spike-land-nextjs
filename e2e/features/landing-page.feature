Feature: Landing Page - CTA and Feature Cards
  As a visitor to the site
  I want to interact with the landing page elements
  So that I can navigate to relevant sections and learn about the platform

  Background:
    Given I am not logged in

  # CTA Button Tests
  @fast
  Scenario: Landing page displays main CTA button
    When I visit "/"
    Then the page should load successfully
    And I should see the primary CTA button

  @fast
  Scenario: Landing page CTA button navigates to sign-in
    When I visit "/"
    And I click the primary CTA button
    Then I should be redirected to sign-in page

  # Featured Apps Section Tests
  @fast
  Scenario: Landing page displays Featured Applications section
    When I visit "/"
    Then the page should load successfully
    And I should see "See the Transformation" heading
    And I should see "blurry photo" text

  @fast
  Scenario: Landing page displays Pixel app card
    When I visit "/"
    Then the page should load successfully
    And I should see the Pixel feature card
    And I should see "AI Photo Restoration" text
    And I should see "60 seconds" text

  @fast
  Scenario: Pixel feature card has comparison preview
    When I visit "/"
    Then the page should load successfully
    And the Pixel feature card should display an image

  @fast
  Scenario: Pixel feature card links to Pixel landing page
    When I visit "/"
    And I click on the Pixel feature card
    Then I should be on the "/pixel" page

  # Platform Features Section Tests
  @fast
  Scenario: Landing page displays platform features
    When I visit "/"
    Then the page should load successfully
    And I should see platform feature cards

  # Final CTA Section Tests
  @fast
  Scenario: Landing page has bottom CTA section
    When I visit "/"
    Then the page should load successfully
    And I should see a bottom CTA section

  # Header Tests
  @fast
  Scenario: Landing page displays header with logo
    When I visit "/"
    Then the page should load successfully
    And I should see the platform header
    And I should see the Pixel logo in header

  @fast
  Scenario: Landing page header has sign-in option
    When I visit "/"
    Then the page should load successfully
    And I should see "Sign In" or "Sign in" text

  # Hero Section Tests
  @fast
  Scenario: Landing page displays hero section
    When I visit "/"
    Then the page should load successfully
    And I should see the hero section

  # Mobile Responsiveness Tests
  @fast
  Scenario: Landing page is mobile responsive
    When I visit "/" on a mobile viewport
    Then the page should load successfully
    And the layout should be responsive

  # Scroll Navigation Tests
  @fast
  Scenario: Apps section is scrollable via anchor
    When I visit "/#apps"
    Then the page should load successfully
    And the apps section should be visible

  # Authenticated User Landing Page Tests
  @fast @requires-db
  Scenario: Authenticated users can view landing page
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/"
    Then the page should load successfully
    And I should see "See the Transformation" heading

  # Footer Tests
  @fast
  Scenario: Landing page has legal footer links
    When I visit "/"
    Then the page should load successfully
    And I should see footer links for:
      | Link    |
      | Terms   |
      | Privacy |

  # CTASection Component Tests
  @fast
  Scenario: CTASection displays Christmas heading
    When I visit "/"
    Then the page should load successfully
    And I should see "Christmas is coming" text

  @fast
  Scenario: CTASection displays call-to-action message
    When I visit "/"
    Then the page should load successfully
    And I should see "Dig out those old photos" text

  @fast
  Scenario: CTASection Try Pixel button navigates correctly
    When I visit "/"
    And I click the "Try Pixel for free" link
    Then I should be on the "/pixel" page

  # HeroSection Component Tests
  @fast
  Scenario: HeroSection displays main headline
    When I visit "/"
    Then the page should load successfully
    And I should see "Your photos deserve better" text

  @fast
  Scenario: HeroSection displays subheadline about Gemini
    When I visit "/"
    Then the page should load successfully
    And I should see "Gemini model" text

  @fast
  Scenario: HeroSection has Get Started CTA button
    When I visit "/"
    Then the page should load successfully
    And I should see "Get Started" link

  @fast
  Scenario: HeroSection Get Started button navigates to Pixel app
    When I visit "/"
    And I click the "Get Started" link
    Then I should be redirected to sign-in page

  @fast
  Scenario: HeroSection displays image comparison slider
    When I visit "/"
    Then the page should load successfully
    And I should see the image comparison slider

  @fast
  Scenario: HeroSection shows Original and Enhanced labels
    When I visit "/"
    Then the page should load successfully
    And I should see "Original" text
    And I should see "Enhanced" text
