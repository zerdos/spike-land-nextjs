@requires-db
Feature: Admin Feedback Management
  As an admin user
  I want to review and manage user feedback
  So that I can track bugs, ideas, and other user submissions

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  @fast @requires-db
  Scenario: Feedback management page loads successfully
    When I visit "/admin/feedback"
    Then I should be on the "/admin/feedback" page
    And I should see "Feedback Management" heading
    And I should see "Review and manage user feedback, bug reports, and ideas" text

  @fast @requires-db
  Scenario: Feedback page displays filter controls
    When I visit "/admin/feedback"
    Then I should see "Status:" label
    And I should see status filter dropdown
    And I should see "Type:" label
    And I should see type filter dropdown
    And I should see "Refresh" button

  @fast @requires-db
  Scenario: Feedback table displays correct columns
    When I visit "/admin/feedback"
    Then I should see feedback table with columns:
      | Column   |
      | Date     |
      | Type     |
      | User     |
      | Page     |
      | Status   |
      | Message  |
      | Actions  |

  @slow @requires-db
  Scenario: Feedback list displays items correctly
    Given there is feedback in the system
    When I visit "/admin/feedback"
    Then I should see the feedback list
    And each feedback item should display the submission date
    And each feedback item should display a type badge
    And each feedback item should display user information
    And each feedback item should display a status badge

  @slow @requires-db
  Scenario: Filter feedback by status - NEW
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "New" from the status filter
    Then the feedback list should only show NEW status items

  @slow @requires-db
  Scenario: Filter feedback by status - REVIEWED
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Reviewed" from the status filter
    Then the feedback list should only show REVIEWED status items

  @slow @requires-db
  Scenario: Filter feedback by status - RESOLVED
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Resolved" from the status filter
    Then the feedback list should only show RESOLVED status items

  @slow @requires-db
  Scenario: Filter feedback by status - DISMISSED
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Dismissed" from the status filter
    Then the feedback list should only show DISMISSED status items

  @slow @requires-db
  Scenario: Filter feedback by type - BUG
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Bug" from the type filter
    Then the feedback list should only show BUG type items

  @slow @requires-db
  Scenario: Filter feedback by type - IDEA
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Idea" from the type filter
    Then the feedback list should only show IDEA type items

  @slow @requires-db
  Scenario: Filter feedback by type - OTHER
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Other" from the type filter
    Then the feedback list should only show OTHER type items

  @slow @requires-db
  Scenario: Combined status and type filtering
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "New" from the status filter
    And I select "Bug" from the type filter
    Then the feedback list should only show NEW BUG items

  @slow @requires-db
  Scenario: View feedback details in dialog
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click on a feedback row
    Then I should see the feedback details dialog
    And I should see "Feedback Details" dialog title
    And I should see the full feedback message
    And I should see the feedback type
    And I should see the feedback status
    And I should see the user information
    And I should see the submission page
    And I should see the submission date

  @slow @requires-db
  Scenario: Feedback details shows browser info for bug reports
    Given there is a bug report with user agent in the system
    When I visit "/admin/feedback"
    And I click on the bug report row
    Then I should see the feedback details dialog
    And I should see "Browser Info" section
    And I should see the user agent string

  @slow @requires-db
  Scenario: Mark feedback as reviewed from list
    Given there is NEW feedback in the system
    When I visit "/admin/feedback"
    And I click the "R" button on a feedback item
    Then the feedback status should change to "REVIEWED"
    And the status badge should update

  @slow @requires-db
  Scenario: Mark feedback as resolved from list
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click the "V" button on a feedback item
    Then the feedback status should change to "RESOLVED"
    And the status badge should update to green

  @slow @requires-db
  Scenario: Dismiss feedback from list
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click the "X" button on a feedback item
    Then the feedback status should change to "DISMISSED"
    And the status badge should update to gray

  @slow @requires-db
  Scenario: Change feedback status from details dialog
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click on a feedback row
    And I change the status to "Resolved" in the dialog
    Then the feedback status should update
    And the list should reflect the new status

  @slow @requires-db
  Scenario: Add admin note to feedback
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click on a feedback row
    And I enter "Investigating this issue" in the admin note field
    And I click "Save Note" button
    Then I should see a success message
    And the admin note should be saved

  @slow @requires-db
  Scenario: Close feedback details dialog
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click on a feedback row
    Then I should see the feedback details dialog
    When I click "Close" button in the dialog
    Then the feedback details dialog should close

  @slow @requires-db
  Scenario: Feedback count displays correctly
    When I visit "/admin/feedback"
    Then I should see the feedback count in the header

  @slow @requires-db
  Scenario: Empty state when no feedback matches filters
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I select "Resolved" from the status filter
    And I select "Bug" from the type filter
    And there are no matching items
    Then I should see "No feedback found" text

  @slow @requires-db
  Scenario: Refresh button fetches latest feedback
    Given there is feedback in the system
    When I visit "/admin/feedback"
    And I click "Refresh" button
    Then the feedback list should refresh
    And I should see "Refreshing..." text during refresh

  @slow @requires-db
  Scenario: Type badges display correct colors
    Given there is feedback of all types in the system
    When I visit "/admin/feedback"
    Then BUG type badge should be red
    And IDEA type badge should be blue
    And OTHER type badge should be gray

  @slow @requires-db
  Scenario: Status badges display correct colors
    Given there is feedback of all statuses in the system
    When I visit "/admin/feedback"
    Then NEW status badge should be yellow
    And REVIEWED status badge should be blue
    And RESOLVED status badge should be green
    And DISMISSED status badge should be gray

  @fast @requires-db
  Scenario: Non-admin user cannot access feedback management
    Given the user is not an admin
    When I visit "/admin/feedback"
    Then I should be redirected to home page

  @fast @requires-db
  Scenario: Unauthenticated user cannot access feedback management
    Given I am not logged in
    When I visit "/admin/feedback"
    Then I should be redirected to sign-in page
