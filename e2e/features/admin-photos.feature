Feature: Admin Photos Page
  As an admin user
  I want to view and manage all photos in the system
  So that I can monitor and moderate uploaded content

  Background:
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin

  @requires-db
  Scenario: View admin photos gallery page
    When I visit "/admin/photos"
    Then I should be on the "/admin/photos" page
    And I should see "Photo Gallery" heading
    And I should see "View all uploaded photos with pagination and filtering" text

  @requires-db
  Scenario: Photos grid displays correctly
    Given there are photos in the system
    When I visit "/admin/photos"
    Then I should see the photo grid
    And each photo should display a thumbnail
    And each photo should show the user name or email
    And each photo should show enhancement count

  @requires-db
  Scenario: Photo details modal displays correctly
    Given there are photos in the system
    When I visit "/admin/photos"
    And I click on a photo in the grid
    Then I should see the photo details modal
    And I should see the full-size image
    And I should see image metadata
    And I should see user information
    And I should see enhancement statistics

  @requires-db
  Scenario: Pagination works correctly
    Given there are more than 20 photos in the system
    When I visit "/admin/photos"
    Then I should see "Page 1 of" text
    And I should see "Previous" button disabled
    And I should see "Next" button enabled
    When I click the "Next" button
    Then I should see "Page 2 of" text
    And I should see "Previous" button enabled

  @requires-db
  Scenario: Filter photos by user ID
    Given there are photos in the system
    When I visit "/admin/photos"
    And I enter "user-123" in the "User ID" filter
    And I click "Apply Filters" button
    Then the photos should be filtered by user ID
    And the URL should contain "userId=user-123"

  @requires-db
  Scenario: Filter photos by date range
    Given there are photos in the system
    When I visit "/admin/photos"
    And I select "2024-01-01" as start date
    And I select "2024-12-31" as end date
    And I click "Apply Filters" button
    Then the photos should be filtered by date range
    And the URL should contain "startDate=2024-01-01"
    And the URL should contain "endDate=2024-12-31"

  @requires-db
  Scenario: Clear all filters
    Given there are photos in the system
    When I visit "/admin/photos"
    And I enter "user-123" in the "User ID" filter
    And I select "2024-01-01" as start date
    And I click "Apply Filters" button
    Then the filters should be applied
    When I click "Clear Filters" button
    Then all filter inputs should be empty
    And the URL should not contain filter parameters

  @requires-db
  Scenario: Photo status badges display correctly
    Given there are photos with different job statuses
    When I visit "/admin/photos"
    Then I should see photos with "COMPLETED" status badge
    And I should see photos with "PENDING" status badge
    And I should see photos with "PROCESSING" status badge
    And I should see photos with "FAILED" status badge

  @requires-db
  Scenario: Empty state displays when no photos match filters
    Given there are photos in the system
    When I visit "/admin/photos"
    And I enter "nonexistent-user-id" in the "User ID" filter
    And I click "Apply Filters" button
    Then I should see "No photos found" text

  @requires-db
  Scenario: Photo count displays correctly
    Given there are 25 photos in the system
    When I visit "/admin/photos"
    Then I should see "Photos (25)" text

  @requires-db
  Scenario: Close photo details modal
    Given there are photos in the system
    When I visit "/admin/photos"
    And I click on a photo in the grid
    Then I should see the photo details modal
    When I close the modal
    Then the photo details modal should not be visible

  @requires-db
  Scenario: Photo enhancement count badge displays
    Given there are photos in the system
    When I visit "/admin/photos"
    Then each photo card should show enhancement count badge
    And the badge should display a number

  @requires-db
  Scenario: Loading state displays while fetching photos
    Given the photos API is slow
    When I visit "/admin/photos"
    Then I should see "Loading..." text
    When the photos load
    Then I should see the photo grid
