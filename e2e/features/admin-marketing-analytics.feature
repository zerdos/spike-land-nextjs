@requires-db
Feature: Admin Marketing Analytics
  As an admin user
  I want to access campaign analytics
  So that I can track marketing performance and optimize campaigns

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"

  Scenario: Admin can access marketing page
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should be on the "/admin/marketing" page
    And I should see "Marketing" text

  Scenario: Non-admin user redirected from marketing page
    Given the user is not an admin
    When I visit "/admin/marketing"
    Then I should be on the "/" page

  @flaky
  Scenario: Marketing page displays tabs
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see "Overview" tab
    And I should see "Campaigns" tab
    And I should see "Funnel" tab
    And I should see "Accounts" tab

  @flaky
  Scenario: Overview tab displays metric cards
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see "Visitors" metric card
    And I should see "Signups" metric card
    And I should see "Conv Rate" metric card
    And I should see "Revenue" metric card

  @flaky
  Scenario: Overview tab displays date range picker
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see date range picker

  @flaky
  Scenario: Overview tab displays attribution toggle
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see "First-touch" option
    And I should see "Last-touch" option

  @flaky
  Scenario: Campaigns tab displays campaign table
    Given the user is an admin
    When I visit "/admin/marketing"
    And I click the "Campaigns" tab
    Then I should see campaign performance table
    And I should see "Campaign" column header
    And I should see "Visitors" column header
    And I should see "Revenue" column header

  @flaky
  Scenario: Funnel tab displays conversion funnel
    Given the user is an admin
    When I visit "/admin/marketing"
    And I click the "Funnel" tab
    Then I should see conversion funnel visualization
    And I should see "Visitors" funnel stage
    And I should see "Signups" funnel stage
    And I should see "Enhancements" funnel stage
    And I should see "Purchases" funnel stage

  @flaky
  Scenario: Accounts tab displays account management
    Given the user is an admin
    When I visit "/admin/marketing"
    And I click the "Accounts" tab
    Then I should see "Connect Facebook" button
    And I should see "Connect Google Ads" button

  @flaky
  Scenario: Marketing page is accessible from admin sidebar
    Given the user is an admin
    When I visit "/admin"
    And I click "Marketing" in the sidebar
    Then I should be on the "/admin/marketing" page

  @flaky
  Scenario: Marketing analytics shows loading state
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see loading indicator initially
    And the loading indicator should disappear when data loads

  @flaky
  Scenario: Date range filter affects displayed data
    Given the user is an admin
    When I visit "/admin/marketing"
    And I select "Last 7 days" from date range picker
    Then the metrics should update for 7 day period

  @flaky
  Scenario: Export button is available
    Given the user is an admin
    When I visit "/admin/marketing"
    And I click the "Campaigns" tab
    Then I should see "Export CSV" button

  @flaky
  Scenario: Real-time polling indicator is visible
    Given the user is an admin
    When I visit "/admin/marketing"
    Then I should see live status indicator
    And I should see refresh button
