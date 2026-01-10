@orbit
Feature: Orbit Calendar / Scheduled Posts
  As an Orbit user
  I want to schedule posts for future publishing
  So that I can plan my social media content in advance

  Background:
    Given I am logged in as an Orbit user
    And I have an Orbit workspace named "Test Marketing"
    And I have a LinkedIn account "Test Company" connected

  # Calendar View
  @calendar @view
  Scenario: View calendar page
    When I navigate to the calendar page
    Then I should see the calendar view
    And I should see the current month displayed
    And I should see navigation to previous and next months

  @calendar @view
  Scenario: View scheduled posts on calendar
    Given I have scheduled posts for this week
    When I navigate to the calendar page
    Then I should see scheduled posts marked on the calendar
    And each post should show the platform icons

  @calendar @view
  Scenario: Filter calendar by platform
    Given I have scheduled posts for multiple platforms
    When I navigate to the calendar page
    And I filter by "LinkedIn" platform
    Then I should only see LinkedIn scheduled posts

  # Creating Scheduled Posts
  @calendar @create
  Scenario: Create a new scheduled post
    When I navigate to the calendar page
    And I click on a future date
    Then the create post dialog should open
    And I should see the date pre-filled

  @calendar @create
  Scenario: Schedule a text post
    When I navigate to create a scheduled post
    And I enter post content "Exciting company news!"
    And I select a future date and time
    And I select LinkedIn as the target platform
    And I click the calendar "Schedule" button
    Then the post should be saved as scheduled
    And it should appear on the calendar

  @calendar @create
  Scenario: Schedule a post to multiple platforms
    Given I have a Twitter account "Test Twitter" connected
    When I navigate to create a scheduled post
    And I enter post content "Cross-platform announcement"
    And I select a future date and time
    And I select both LinkedIn and Twitter as targets
    And I click the calendar "Schedule" button
    Then the post should be scheduled for both platforms
    And both platform icons should appear on the calendar

  @calendar @create
  Scenario: Create a recurring scheduled post
    When I navigate to create a scheduled post
    And I enter post content "Weekly update"
    And I select a future date and time
    And I enable recurrence
    And I set recurrence to "Weekly"
    And I select LinkedIn as the target platform
    And I click the calendar "Schedule" button
    Then the recurring post should be created
    And it should show recurring indicators on the calendar

  # Editing Scheduled Posts
  @calendar @edit
  Scenario: Edit a scheduled post
    Given I have a scheduled post "Upcoming announcement"
    When I navigate to the calendar page
    And I click on the scheduled post
    Then the post details dialog should open
    When I edit the content to "Updated announcement"
    And I click the calendar "Save" button
    Then the post should be updated
    And I should see the updated content

  @calendar @edit
  Scenario: Reschedule a post by dragging
    Given I have a scheduled post on Monday
    When I navigate to the calendar page
    And I drag the post to Wednesday
    Then the post should be rescheduled to Wednesday
    And I should see a confirmation message

  @calendar @edit
  Scenario: Change post target accounts
    Given I have a scheduled post for LinkedIn
    And I have a Twitter account "Test Twitter" connected
    When I edit the scheduled post
    And I add Twitter as a target
    And I click the calendar "Save" button
    Then the post should be scheduled for both platforms

  # Deleting/Canceling Posts
  @calendar @delete
  Scenario: Delete a scheduled post
    Given I have a scheduled post "Post to delete"
    When I navigate to the calendar page
    And I click on the scheduled post
    And I click the calendar "Delete" button
    And I confirm deletion
    Then the post should be removed
    And it should not appear on the calendar

  @calendar @delete
  Scenario: Cancel a scheduled post
    Given I have a scheduled post "Post to cancel"
    When I navigate to the calendar page
    And I click on the scheduled post
    And I click the calendar "Cancel Post" button
    Then the post status should be "Cancelled"
    And it should appear dimmed on the calendar

  # Post Status
  @calendar @status
  Scenario: View post status on calendar
    Given I have posts in different statuses
    When I navigate to the calendar page
    Then draft posts should show with a draft indicator
    And scheduled posts should show with a scheduled indicator
    And published posts should show with a published indicator
    And failed posts should show with a failed indicator

  @calendar @status
  Scenario: View failed post details
    Given I have a failed scheduled post
    When I navigate to the calendar page
    And I click on the failed post
    Then I should see the post error message
    And I should see options to retry or edit

  # Calendar Navigation
  @calendar @navigation
  Scenario: Navigate between months
    When I navigate to the calendar page
    And I click next month
    Then I should see the next month displayed
    When I click previous month
    Then I should see the current month displayed

  @calendar @navigation
  Scenario: Jump to specific date
    When I navigate to the calendar page
    And I use the date picker to select a future month
    Then I should see that month displayed on the calendar

  # Dashboard Integration
  @calendar @dashboard
  Scenario: View upcoming posts widget
    Given I have scheduled posts for this week
    When I navigate to the workspace dashboard
    Then I should see the "Upcoming Posts" widget
    And I should see the count of scheduled posts
    And I should see the next few scheduled posts

  @calendar @dashboard
  Scenario: Navigate to calendar from dashboard
    When I navigate to the workspace dashboard
    And I click on the "Upcoming Posts" widget
    Then I should be navigated to the calendar page

  # Validation
  @calendar @validation
  Scenario: Cannot schedule post in the past
    When I navigate to create a scheduled post
    And I select a past date
    Then I should see an error "Scheduled time must be in the future"
    And the schedule button should be disabled

  @calendar @validation
  Scenario: Must select at least one platform
    When I navigate to create a scheduled post
    And I enter post content "Test post"
    And I select a future date and time
    And I do not select any platform
    And I click the calendar "Schedule" button
    Then I should see an error "Please select at least one account"

  # Timezone Support
  @calendar @timezone
  Scenario: Schedule post in user timezone
    Given my workspace timezone is "America/New_York"
    When I navigate to create a scheduled post
    And I select 9:00 AM as the time
    Then the time should be displayed in America/New_York timezone
    And the post should be scheduled for the correct UTC time

  # Publishing (Part of #576: Implement Calendar publishing)
  @calendar @publishing
  Scenario: Scheduled post is published when due
    Given I have a scheduled post due for publishing now
    When the publishing cron job runs
    Then the post should be published to all target platforms
    And the post status should be "Published"
    And the post should show a published timestamp

  @calendar @publishing
  Scenario: Failed publishing triggers retry
    Given I have a scheduled post due for publishing
    And the social platform API returns an error
    When the publishing cron job runs
    Then the post status should remain "Scheduled" for retry
    And the retry count should increment
    And the post should show the error message

  @calendar @publishing
  Scenario: Post fails permanently after max retries
    Given I have a scheduled post that has failed 3 times
    When the publishing cron job runs again
    Then the post status should be "Failed"
    And I should see the failure reason
    And I should see an option to retry manually

  @calendar @publishing
  Scenario: Partial success when publishing to multiple platforms
    Given I have a scheduled post for LinkedIn and Twitter
    And LinkedIn publishing succeeds
    And Twitter publishing fails
    When the publishing cron job runs
    Then the post should show partial success status
    And LinkedIn should show as published
    And Twitter should show as failed
    And I should be able to retry just Twitter

  @calendar @publishing
  Scenario: View publishing history for a post
    Given I have a published post
    When I navigate to the post details
    Then I should see the publishing history
    And I should see when it was published
    And I should see the platform post IDs

  # Best-Time Recommendations (Part of #578: Add best-time recommendations)
  @calendar @recommendations
  Scenario: View best-time recommendations panel
    When I navigate to the calendar page
    Then I should see the "Best Times to Post" panel
    And I should see time slot recommendations
    And each recommendation should show confidence level

  @calendar @recommendations
  Scenario: View platform-specific recommendations
    Given I have engagement data for my LinkedIn account
    When I navigate to the calendar page
    Then I should see LinkedIn recommendations
    And recommendations should show engagement scores
    And recommendations should indicate days to avoid

  @calendar @recommendations
  Scenario: View recommendations based on industry benchmarks
    Given I have a new social account with no historical data
    When I navigate to the calendar page
    Then I should see recommendations based on industry benchmarks
    And I should see a low confidence indicator
    And I should see the benchmark source

  @calendar @recommendations
  Scenario: View calendar content gaps
    Given I have scheduled posts with gaps between them
    When I navigate to the calendar page
    Then I should see identified content gaps
    And gaps during high-engagement times should be highlighted
    And I should see suggested platforms for each gap

  @calendar @recommendations
  Scenario: Navigate to recommended time slot
    When I navigate to the calendar page
    And I click on a recommended time slot
    Then the create post dialog should open
    And the date and time should be pre-filled with the recommended slot

  @calendar @recommendations
  Scenario: View global best slots across platforms
    Given I have multiple social accounts connected
    When I navigate to the calendar page
    Then I should see global best time recommendations
    And global recommendations should aggregate across all platforms
