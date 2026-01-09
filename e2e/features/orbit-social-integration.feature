@orbit
Feature: Orbit Social Media Integration
  As an Orbit user
  I want to connect and manage my social media accounts
  So that I can view and engage with posts from a unified dashboard

  Background:
    Given I am logged in as an Orbit user
    And I have an Orbit workspace named "Test Marketing"

  # LinkedIn Connection Flow
  @linkedin
  Scenario: View LinkedIn connection option in settings
    When I navigate to the workspace settings page
    Then I should see the "Connect Social Accounts" section
    And I should see the "Connect LinkedIn" button
    And the button should display the LinkedIn logo

  @skip @requires-oauth
  @linkedin
  Scenario: Initiate LinkedIn OAuth flow
    When I navigate to the workspace settings page
    And I click the "Connect LinkedIn" button
    Then I should be redirected to LinkedIn authorization page
    And the authorization URL should include the correct scopes

  @linkedin
  Scenario: View connected LinkedIn account in settings
    Given I have a LinkedIn account "Test Company" connected
    When I navigate to the workspace settings page
    Then I should see "Test Company" in the connected accounts list
    And I should see the LinkedIn platform badge
    And I should see the account status as "Connected"

  # Unified Stream with LinkedIn
  @linkedin @streams
  Scenario: LinkedIn posts appear in unified stream
    Given I have a LinkedIn account "Test Company" connected
    And the account has recent posts
    When I navigate to the streams page
    Then I should see LinkedIn posts in the feed
    And LinkedIn posts should display the company name
    And LinkedIn posts should have the LinkedIn icon badge

  @linkedin @streams
  Scenario: Filter stream by LinkedIn platform
    Given I have multiple social accounts connected
    When I navigate to the streams page
    And I filter by "LinkedIn" platform
    Then I should only see posts from LinkedIn
    And other platform posts should be hidden

  @linkedin @streams
  Scenario: View LinkedIn post details
    Given I have a LinkedIn account with posts
    When I navigate to the streams page
    And I view a LinkedIn post
    Then I should see the post content
    And I should see the post timestamp
    And I should see engagement metrics
    And I should see a link to view on LinkedIn

  # LinkedIn Engagement
  @linkedin @engagement
  Scenario: Like a LinkedIn post from stream
    Given I have a LinkedIn account "Test Company" connected
    And there is a LinkedIn post in the stream
    When I click the like button on the post
    Then the like action should be sent to LinkedIn
    And the post should show as liked

  @linkedin @engagement
  Scenario: Reply to a LinkedIn post from stream
    Given I have a LinkedIn account "Test Company" connected
    And there is a LinkedIn post in the stream
    When I click the reply button on the post
    Then the reply dialog should open
    And I should see the account selector with "Test Company"
    When I enter a reply message "Great post!"
    And I submit the reply
    Then the reply should be posted to LinkedIn

  # LinkedIn Post Creation
  @skip @linkedin @create-post
  Scenario: Create a text post on LinkedIn
    Given I have a LinkedIn account "Test Company" connected
    When I navigate to create a new post
    And I select LinkedIn as the target platform
    And I enter post content "Exciting company news!"
    And I click publish
    Then the post should be created on LinkedIn
    And I should see a success message

  @skip @linkedin @create-post
  Scenario: Create a post with link on LinkedIn
    Given I have a LinkedIn account "Test Company" connected
    When I navigate to create a new post
    And I select LinkedIn as the target platform
    And I enter post content "Check out our latest blog"
    And I add a link "https://example.com/blog"
    And I click publish
    Then the post should be created with article type
    And the link preview should be included

  # LinkedIn Metrics
  @linkedin @metrics
  Scenario: View LinkedIn metrics in dashboard
    Given I have a LinkedIn account "Test Company" connected
    And metrics have been collected for the account
    When I navigate to the workspace dashboard
    Then I should see LinkedIn metrics widget
    And I should see follower count
    And I should see engagement rate
    And I should see impressions data

  @linkedin @metrics
  Scenario: LinkedIn metrics appear in Pulse dashboard
    Given I have a LinkedIn account "Test Company" connected
    And metrics have been collected for multiple days
    When I navigate to the Pulse dashboard
    Then I should see LinkedIn in the platform status grid
    And I should see trend data for followers

  # Error Handling
  @linkedin @error-handling
  Scenario: Handle expired LinkedIn token
    Given I have a LinkedIn account with expired token
    When I navigate to the streams page
    Then I should see an error for the LinkedIn account
    And I should see "Reconnect" option for LinkedIn

  @linkedin @error-handling
  Scenario: Handle LinkedIn API rate limit
    Given I have a LinkedIn account connected
    And the LinkedIn API is rate limited
    When I try to fetch LinkedIn posts
    Then I should see a rate limit warning
    And posts from other platforms should still load

  # Account Management
  @linkedin @account-management
  Scenario: Disconnect LinkedIn account
    Given I have a LinkedIn account "Test Company" connected
    When I navigate to the workspace settings page
    And I click disconnect for "Test Company"
    And I confirm the disconnection
    Then the LinkedIn account should be removed
    And I should see "Connect LinkedIn" button again

  @linkedin @account-management
  Scenario: Connect multiple LinkedIn organizations
    Given I am authorized with LinkedIn access
    And I manage multiple LinkedIn organizations
    When I initiate LinkedIn connection
    Then I should see organization selection dialog
    And I can select which organizations to connect
    When I select "Company A" and "Company B"
    Then both organizations should be connected
    And I should see both in my connected accounts
