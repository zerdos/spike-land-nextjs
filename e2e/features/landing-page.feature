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

  # App Showcase Section Tests
  @fast
  Scenario: Landing page displays app showcase section
    When I visit "/"
    Then the page should load successfully
    And I should see platform feature cards

  # PhotoMix Demo Section Tests
  @fast
  Scenario: Landing page displays PhotoMix demo section
    When I visit "/"
    Then the page should load successfully
    And I should see "Beyond" text
    And I should see "Hybridization" text

  @fast
  Scenario: PhotoMix demo has Synthesize Now button
    When I visit "/"
    Then the page should load successfully
    And I should see "Synthesize Now" link

  @fast
  Scenario: Synthesize Now button navigates to photo mixer
    When I visit "/"
    And I click the "Synthesize Now" link
    Then I should be on the "/apps/pixel/mix" page

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

  @fast
  Scenario: Mobile menu sheet should not auto-open on page load
    When I visit "/" on a mobile viewport
    Then the page should load successfully
    And the mobile menu sheet should not be visible
    And I should see the public pages mobile menu button

  # Authenticated User Landing Page Tests
  @fast @requires-db
  Scenario: Authenticated users can view landing page
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/"
    Then the page should load successfully
    And I should see the hero section

  # Footer Tests
  @fast
  Scenario: Landing page has legal footer links
    When I visit "/"
    Then the page should load successfully
    And I should see footer links for:
      | Link    |
      | Terms   |
      | Privacy |

  # CreateCTASection Component Tests
  @fast
  Scenario: CreateCTASection displays main heading
    When I visit "/"
    Then the page should load successfully
    And I should see "unthinkable" text

  @fast
  Scenario: CreateCTASection displays call-to-action message
    When I visit "/"
    Then the page should load successfully
    And I should see "No gatekeepers" text

  @fast
  Scenario: CreateCTASection Begin Creation button is visible
    When I visit "/"
    Then the page should load successfully
    And I should see "Begin Creation" link

  # LandingHero Component Tests
  @fast
  Scenario: LandingHero displays main headline
    Given I am not logged in
    When I visit "/"
    Then the page should load successfully
    And I should see "Build the" text

  @fast
  Scenario: LandingHero displays subheadline
    Given I am not logged in
    When I visit "/"
    Then the page should load successfully
    And I should see "AI-powered universe" text

  @fast
  Scenario: LandingHero has Explore the Galaxy link
    Given I am not logged in
    When I visit "/"
    Then the page should load successfully
    And I should see "Explore the Galaxy" link

  @fast
  Scenario: LandingHero displays Impossible gradient text
    Given I am not logged in
    When I visit "/"
    Then the page should load successfully
    And I should see "Impossible" text
