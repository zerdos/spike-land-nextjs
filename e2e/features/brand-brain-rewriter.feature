# Feature requires database for certain scenarios
# Some scenarios are skipped because they test server-rendered pages that fetch data
# via getServerSideProps/server components, which query the database directly.
# Playwright route interception cannot mock server-side data fetching.
#
# To run skipped scenarios:
#   1. Set up test database with workspace fixtures
#   2. Run: yarn cucumber --profile db
#
# Non-skipped scenarios test the rewriter UI directly and can be mocked via API routes.
@requires-db
Feature: Brand Brain Content Rewriter
  As a workspace member
  I want to rewrite content to align with brand guidelines
  So that my content maintains consistent brand voice

  Background:
    Given I am logged in as a workspace member
    And I have a brand profile configured

  # @skip Reason: Brand Brain dashboard is a server-rendered Next.js page that queries
  # the database directly via server components. Playwright route interception only
  # works for client-side API calls, not server-side data fetching.
  # To run: Set up test database with workspace fixtures, use 'yarn cucumber --profile db'
  @brand-brain @skip @requires-db
  Scenario: View Brand Brain dashboard with Content Rewriter card
    When I navigate to the Brand Brain page
    Then I should see "Brand Brain" heading
    And I should see "Content Tools" section
    And I should see "Content Rewriter" text

  # @skip Reason: This scenario navigates through the Brand Brain dashboard page first,
  # which is server-rendered and queries the database directly. The page needs real
  # workspace data to render the Content Rewriter card that we click to navigate.
  # To run: Set up test database with workspace fixtures, use 'yarn cucumber --profile db'
  @brand-brain @skip @requires-db
  Scenario: Navigate to Content Rewriter page
    When I navigate to the Brand Brain page
    And I click on the Open Rewriter card
    Then I should be on the rewriter page
    And I should see "Content Rewriter" heading
    And I should see "Enter Your Draft" text

  @brand-brain
  Scenario: View Content Rewriter form elements
    When I navigate to the rewriter page
    Then I should see the draft content textarea
    And I should see the platform selector
    And I should see "Rewrite with AI" button

  @brand-brain
  Scenario: Select different platforms
    When I navigate to the rewriter page
    And I select "Twitter / X" from the platform selector
    Then I should see "280" in the character limit indicator
    When I select "LinkedIn" from the platform selector
    Then I should see "3000" in the character limit indicator

  @brand-brain
  Scenario: Rewrite button disabled when no content
    When I navigate to the rewriter page
    Then the "Rewrite with AI" button should be disabled
    When I enter draft content "Hello world"
    Then the "Rewrite with AI" button should be enabled

  @brand-brain
  Scenario: Submit content for rewriting
    When I navigate to the rewriter page
    And I enter draft content "Check out our cheap products today!"
    And I select "General" from the platform selector
    And I click the "Rewrite with AI" button
    Then I should see a loading indicator
    When the rewrite completes
    Then I should see "Review Changes" heading
    And I should see the diff viewer

  @brand-brain
  Scenario: View diff with changes highlighted
    When I have a rewrite result with changes
    Then I should see the original text
    And I should see the rewritten text
    And I should see removed text highlighted in red
    And I should see added text highlighted in green

  @brand-brain
  Scenario: Accept all changes
    When I have a rewrite result with changes
    And I click the "Accept All" button
    Then I should see "Content copied to clipboard!" message
    And I should return to the empty form

  @brand-brain
  Scenario: Reject all changes
    When I have a rewrite result with changes
    And I click the "Reject" button
    Then I should return to the empty form
    And the rewrite result should be cleared

  @brand-brain
  Scenario: Toggle individual changes
    When I have a rewrite result with changes
    And I click on a change checkbox
    Then the checkbox should toggle its state
    And the preview should update

  @brand-brain
  Scenario: View tips section
    When I navigate to the rewriter page
    Then I should see "Tips for Better Results" text
    And I should see "Be specific" text
    And I should see "Choose the right platform" text

  # @skip Reason: Navigating back lands on the Brand Brain dashboard page, which is
  # server-rendered and requires database records to display workspace content tools.
  # The assertion "should be on the Brand Brain page" would fail without real data.
  # To run: Set up test database with workspace fixtures, use 'yarn cucumber --profile db'
  @brand-brain @skip @requires-db
  Scenario: Navigate back to Brand Brain from rewriter
    When I navigate to the rewriter page
    And I click the "Back to Brand Brain" link
    Then I should be on the Brand Brain page

  @brand-brain
  Scenario: Start new rewrite after viewing results
    When I have a rewrite result with changes
    And I click the "Start New" button
    Then I should return to the empty form

  @brand-brain
  Scenario: Show error when workspace not found
    When I navigate to a non-existent workspace rewriter page
    Then I should see "Workspace not found" text

  @brand-brain
  Scenario: Handle rewrite API error gracefully
    When I navigate to the rewriter page
    And the rewrite API returns an error
    And I enter draft content "Test content"
    And I click the "Rewrite with AI" button
    Then I should see an error message

  @brand-brain
  Scenario: Character count updates as user types
    When I navigate to the rewriter page
    And I select "Twitter / X" from the platform selector
    And I enter draft content "Hello world"
    Then I should see "11" in the character count
    And the character count should be within limit

  @brand-brain
  Scenario: Warn when content exceeds platform limit
    When I navigate to the rewriter page
    And I select "Twitter / X" from the platform selector
    And I enter draft content that exceeds 280 characters
    Then the character count should show over limit warning
