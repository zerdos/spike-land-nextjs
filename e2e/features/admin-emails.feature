@requires-db
Feature: Admin Email Logs Management
  As an admin user
  I want to view and search email delivery logs
  So that I can monitor email delivery and troubleshoot issues

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  # Page load test is in smoke-tests.feature

  @fast @requires-db
  Scenario: Email logs page displays total count
    When I visit "/admin/emails"
    Then I should see "Total:" text with email count

  @fast @requires-db
  Scenario: Email logs page displays send test email section
    When I visit "/admin/emails"
    Then I should see "Send Test Email" heading
    And I should see email input field
    And I should see "Send Test" button

  @fast @requires-db
  Scenario: Email logs page displays search and filter controls
    When I visit "/admin/emails"
    Then I should see search input with placeholder "Search by email or subject..."
    And I should see status filter dropdown with "All Statuses" option
    And I should see template filter dropdown with "All Templates" option
    And I should see "Search" button

  @fast @requires-db
  Scenario: Email table displays correct columns
    When I visit "/admin/emails"
    Then I should see email table with columns:
      | Column    |
      | To        |
      | Subject   |
      | Template  |
      | Status    |
      | Sent At   |
      | Actions   |

  @slow @requires-db
  Scenario: Email list displays items correctly
    Given there are emails in the system
    When I visit "/admin/emails"
    Then I should see the email list
    And each email should display the recipient address
    And each email should display the subject
    And each email should display the template name
    And each email should display a status badge
    And each email should display the sent date

  @slow @requires-db
  Scenario: Search emails by recipient address
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "test@example.com" in the search field
    And I click "Search" button
    Then the email list should only show emails to "test@example.com"

  @slow @requires-db
  Scenario: Search emails by subject
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "Welcome" in the search field
    And I click "Search" button
    Then the email list should only show emails with "Welcome" in subject

  @slow @requires-db
  Scenario Outline: Filter emails by status
    Given there are emails in the system
    When I visit "/admin/emails"
    And I select "<filter>" from the email status filter
    Then the email list should only show <status> status emails

    Examples:
      | filter    | status    |
      | Pending   | PENDING   |
      | Sent      | SENT      |
      | Delivered | DELIVERED |
      | Opened    | OPENED    |
      | Clicked   | CLICKED   |
      | Bounced   | BOUNCED   |
      | Failed    | FAILED    |

  @slow @requires-db
  Scenario: Filter emails by template
    Given there are emails with different templates
    When I visit "/admin/emails"
    And I select a template from the template filter
    Then the email list should only show emails with that template

  @slow @requires-db
  Scenario: Combined search and filter
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "test" in the search field
    And I select "Delivered" from the email status filter
    And I click "Search" button
    Then the email list should show filtered results

  @slow @requires-db
  Scenario: Clear filters resets all filters
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "test" in the search field
    And I select "Sent" from the email status filter
    And I click "Search" button
    And I click "Clear" button
    Then the search field should be empty
    And the status filter should show "All Statuses"
    And the template filter should show "All Templates"

  @slow @requires-db
  Scenario: View email details in modal
    Given there are emails in the system
    When I visit "/admin/emails"
    And I click "Details" button on an email row
    Then I should see the email details modal
    And I should see "Email Details" heading
    And I should see the recipient address
    And I should see the subject
    And I should see the template name
    And I should see the email status
    And I should see the Resend ID
    And I should see the email user information
    And I should see the sent timestamp
    And I should see the opened timestamp or dash
    And I should see the clicked timestamp or dash
    And I should see the bounced timestamp or dash

  @slow @requires-db
  Scenario: Close email details modal
    Given there are emails in the system
    When I visit "/admin/emails"
    And I click "Details" button on an email row
    Then I should see the email details modal
    When I click "Close" button in the modal
    Then the email details modal should close

  @slow @requires-db
  Scenario: Close email details modal by clicking overlay
    Given there are emails in the system
    When I visit "/admin/emails"
    And I click "Details" button on an email row
    Then I should see the email details modal
    When I click the modal overlay
    Then the email details modal should close

  # Badge color styling tests removed - use visual regression testing instead

  # Note: These pagination tests cannot work in E2E because admin-emails is a Server Component
  # that fetches data directly from the database, not via API route that can be mocked.
  # To test pagination, we would need 20+ emails in the E2E seed database.
  @skip @slow @requires-db
  Scenario: Pagination displays when more than 20 emails
    Given there are more than 20 emails in the system
    When I visit "/admin/emails"
    Then I should see pagination controls
    And I should see "Page 1 of" text
    And I should see "Previous" button disabled
    And I should see "Next" button enabled

  # Note: These pagination tests cannot work in E2E because admin-emails is a Server Component
  # that fetches data directly from the database, not via API route that can be mocked.
  # To test pagination, we would need 20+ emails in the E2E seed database.
  @skip @slow @requires-db
  Scenario: Navigate to next page of emails
    Given there are more than 20 emails in the system
    When I visit "/admin/emails"
    And I click "Next" button
    Then I should see "Page 2 of" text
    And I should see "Previous" button enabled

  @skip @slow @requires-db
  Scenario: Navigate to previous page of emails
    Given there are more than 20 emails in the system
    When I visit "/admin/emails"
    And I click "Next" button
    And I click "Previous" button
    Then I should see "Page 1 of" text

  @slow @requires-db
  Scenario: Send test email successfully
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "test-recipient@example.com" in the test email field
    And I click the Send Test button and expect success
    Then the test email field should be cleared
    And the email list should refresh

  @slow @requires-db
  Scenario: Send test email with invalid email shows error
    When I visit "/admin/emails"
    Then the "Send Test" button should be disabled

  @slow @requires-db
  Scenario: Empty state when no emails found
    Given there are no emails in the system
    When I visit "/admin/emails"
    Then I should see "No emails found" text

  @slow @requires-db
  Scenario: Empty state when no emails match filters
    Given there are emails in the system
    When I visit "/admin/emails"
    And I enter "nonexistent-email@example.com" in the search field
    And I click "Search" button
    Then I should see "No emails found" text

  @slow @requires-db
  Scenario: Loading state displays while fetching emails
    Given the emails API is slow
    When I navigate quickly to "/admin/emails"
    Then I should see "Loading..." text in the table

  @slow @requires-db
  Scenario: Error state displays on API failure
    Given the emails API returns an error
    When I visit "/admin/emails"
    Then I should see an error message in red

  @fast @requires-db
  Scenario: Non-admin user cannot access email logs
    Given the user is not an admin
    When I visit "/admin/emails"
    Then I should be redirected to home page

  @fast @requires-db
  Scenario: Unauthenticated user cannot access email logs
    Given I am not logged in
    When I visit "/admin/emails"
    Then I should be redirected to sign-in page
