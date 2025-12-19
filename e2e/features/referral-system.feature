@requires-db
Feature: Referral System
  As an authenticated user
  I want to share my referral link
  So that I can earn tokens by inviting friends

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  Scenario: Access referral dashboard
    When I visit "/referrals"
    Then I should be on the "/referrals" page
    And I should see "Referral Program" heading
    And I should see "Your Referral Link" text

  Scenario: Unauthenticated user redirected from referrals page
    Given I am not logged in
    When I visit "/referrals"
    Then I should be on the "/auth/signin" page

  Scenario: Referral page displays user's referral link
    When I visit "/referrals"
    Then I should see the referral link input field
    And the referral link should contain the user's referral code
    And I should see "Copy" button

  Scenario: Copy referral link to clipboard
    When I visit "/referrals"
    And I click the copy referral link button
    Then the copy button should show "Copied!" text
    And the referral link should be in the clipboard

  Scenario: Referral stats display correctly
    When I visit "/referrals"
    Then I should see "Total Referrals" statistic card
    And I should see "Completed" statistic card
    And I should see "Pending" statistic card
    And I should see "Tokens Earned" statistic card

  Scenario: Share on Twitter button is visible
    When I visit "/referrals"
    Then I should see "Share on Twitter" button
    And the "Twitter" share button should be clickable

  Scenario: Share on Facebook button is visible
    When I visit "/referrals"
    Then I should see "Share on Facebook" button
    And the "Facebook" share button should be clickable

  Scenario: Share on LinkedIn button is visible
    When I visit "/referrals"
    Then I should see "Share on LinkedIn" button
    And the "LinkedIn" share button should be clickable

  Scenario: Referral code is displayed
    When I visit "/referrals"
    Then I should see "Referral Code:" text
    And I should see the referral code in a code element

  Scenario: View referred users table with no referrals
    Given the user has no referrals
    When I visit "/referrals"
    Then I should see "Your Referrals" heading
    And I should see "No referrals yet" text
    And I should see "Share your link to get started!" text

  Scenario: View referred users table with referrals
    Given the user has successful referrals
    When I visit "/referrals"
    Then I should see the referred users table
    And the table should have "Email" column header
    And the table should have "Status" column header
    And the table should have "Date" column header
    And the table should have "Tokens Earned" column header

  Scenario: Referred user status badges display correctly
    Given the user has referrals with different statuses
    When I visit "/referrals"
    Then completed referrals should show green "COMPLETED" badge
    And pending referrals should show yellow "PENDING" badge

  Scenario: How It Works section is displayed
    When I visit "/referrals"
    Then I should see "How It Works" heading
    And I should see "Share Your Link" step
    And I should see "Friend Signs Up" step
    And I should see "Verify Email" step
    And I should see "Repeat" step

  Scenario: Referral rewards are explained
    When I visit "/referrals"
    Then I should see "earn 50 tokens" text
    And I should see "Your friends get 50 tokens too!" text

  Scenario: Loading state while fetching referral data
    Given the referral API is slow to respond
    When I visit "/referrals"
    Then I should see loading skeletons
    And the loading skeletons should disappear when data loads

  Scenario: Error state when API fails
    Given the referral API returns an error
    When I visit "/referrals"
    Then I should see an error alert
    And the error message should describe the failure

  Scenario: Referral link updates after data fetch
    When I visit "/referrals"
    And the referral data loads successfully
    Then the referral link input should contain a valid URL
    And the URL should include the base domain

  Scenario: Social share buttons open in new window
    When I visit "/referrals"
    And I click the "Share on Twitter" button
    Then a new window should open with Twitter share URL

  Scenario: Stats show zero for new users
    Given the user has no referrals
    When I visit "/referrals"
    Then "Total Referrals" should show 0
    And "Completed" should show 0
    And "Pending" should show 0
    And "Tokens Earned" should show 0
