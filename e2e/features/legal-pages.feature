Feature: Legal Pages
  As a user
  I want to access legal documentation
  So that I understand my rights and the service terms

  Background:
    Given I am on the home page

  Scenario: View privacy policy page
    When I visit "/privacy"
    Then I should be on the "/privacy" page
    And I should see "Privacy Policy" heading
    And I should see "Introduction" text
    And I should see "Data Collection" text
    And I should see "Table of Contents" text

  Scenario: View terms of service page
    When I visit "/terms"
    Then I should be on the "/terms" page
    And I should see "Terms of Service" heading
    And I should see "Acceptance of Terms" text
    And I should see "Table of Contents" text

  Scenario: View cookie policy page
    When I visit "/cookies"
    Then I should be on the "/cookies" page
    And I should see "Cookie Policy" heading
    And I should see "What Are Cookies" text
    And I should see "Table of Contents" text

  Scenario: Privacy policy displays disclaimer
    When I visit "/privacy"
    Then I should see "Legal Disclaimer" text
    And I should see "This Privacy Policy is a template" text

  Scenario: Terms of service displays last updated date
    When I visit "/terms"
    Then I should see "Last updated:" text

  Scenario: Cookie policy displays cookie types
    When I visit "/cookies"
    Then I should see "Essential Cookies" text
    And I should see "Analytics Cookies" text

  Scenario: Privacy policy table of contents navigation
    When I visit "/privacy"
    And I click the "Data Collection" anchor link
    Then the page should scroll to the "data-collection" section

  Scenario: Terms of service table of contents navigation
    When I visit "/terms"
    And I click the "User Responsibilities" anchor link
    Then the page should scroll to the "user-responsibilities" section

  Scenario: Cookie policy table of contents navigation
    When I visit "/cookies"
    And I click the "Managing Cookies" anchor link
    Then the page should scroll to the "managing-cookies" section

  Scenario: Legal pages are accessible without authentication
    Given I am not logged in
    When I visit "/privacy"
    Then I should be on the "/privacy" page
    When I visit "/terms"
    Then I should be on the "/terms" page
    When I visit "/cookies"
    Then I should be on the "/cookies" page

  Scenario: Privacy policy displays GDPR rights
    When I visit "/privacy"
    Then I should see "Your Privacy Rights" text
    And I should see "Right of Access" text
    And I should see "Right to Erasure" text

  Scenario: Terms displays account termination section
    When I visit "/terms"
    Then I should see "Account Termination" text

  Scenario: Cookie policy displays opt-out information
    When I visit "/cookies"
    Then I should see "Opt-Out" text
    And I should see "You can manage cookie preferences" text
