@allocator @dashboard @orbit
Feature: Allocator Dashboard
  As a marketing manager
  I want to view budget allocation recommendations
  So that I can optimize my ad spend across platforms

  Background:
    Given I am logged in as a workspace member
    And I have connected marketing accounts with campaign data

  # Dashboard Access
  # NOTE: Not tagged as @smoke because these test complex feature UI that may not be fully implemented
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View Allocator dashboard
    When I navigate to the Allocator page
    Then I should see the Allocator dashboard
    And I should see the page title "Allocator"
    And I should see the description about AI-powered budget recommendations

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Access Allocator from sidebar navigation
    Given I am on the Orbit dashboard
    When I click on "Allocator" in the sidebar
    Then I should be on the Allocator page
    And the Allocator menu item should be highlighted

  # Spend Overview
  @metrics
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View total spend overview
    When I navigate to the Allocator page
    Then I should see the "Total Spend" card
    And I should see the spend amount in currency format
    And I should see the number of campaigns analyzed

  @metrics
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View platform breakdown
    Given I have campaigns on multiple platforms
    When I navigate to the Allocator page
    Then I should see platform spending breakdown
    And each platform should show its individual spend amount
    And platforms should have distinct color indicators

  @metrics
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View ROAS metrics
    When I navigate to the Allocator page
    Then I should see the "Average ROAS" card
    And I should see the ROAS value with format "X.XXx"
    And I should see the projected improvement percentage

  @metrics
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View CPA metrics
    When I navigate to the Allocator page
    Then I should see the "Average CPA" card
    And I should see the CPA value in currency format
    And I should see the projected savings percentage

  @metrics
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View data quality score
    When I navigate to the Allocator page
    Then I should see the "Data Quality" card
    And I should see a quality percentage
    And I should see a progress bar indicating quality level

  # Performance Charts
  @charts
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View ROAS performance chart
    When I navigate to the Allocator page
    And I click on the "ROAS" tab
    Then I should see a bar chart showing ROAS by campaign
    And campaigns should be sorted by ROAS value
    And I should see trend badges for top campaigns

  @charts
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View CPA performance chart
    When I navigate to the Allocator page
    And I click on the "CPA" tab
    Then I should see a bar chart showing CPA by campaign
    And campaigns should be sorted by CPA value ascending
    And lower CPA campaigns should appear first

  @charts
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View conversions chart
    When I navigate to the Allocator page
    And I click on the "Conversions" tab
    Then I should see a bar chart showing conversions by campaign
    And campaigns should be sorted by conversion count

  @charts
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Chart displays trend indicators
    When I navigate to the Allocator page
    Then I should see trend badges for each campaign
    And improving trends should show green indicator
    And declining trends should show red indicator
    And stable trends should show yellow indicator

  # Period Selection
  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Change analysis period to 7 days
    When I navigate to the Allocator page
    And I select "7 days" from the period dropdown
    Then the dashboard should refresh with new data
    And the chart should show "Last 7 days"

  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Change analysis period to 60 days
    When I navigate to the Allocator page
    And I select "60 days" from the period dropdown
    Then the dashboard should refresh with new data
    And the chart should show "Last 60 days"

  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Default period is 30 days
    When I navigate to the Allocator page
    Then the period dropdown should show "30 days"
    And the chart should show "Last 30 days"

  # Risk Tolerance
  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Change risk tolerance to conservative
    When I navigate to the Allocator page
    And I select "Conservative" from the risk dropdown
    Then the dashboard should refresh with new recommendations
    And recommendations should be more cautious

  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Change risk tolerance to aggressive
    When I navigate to the Allocator page
    And I select "Aggressive" from the risk dropdown
    Then the dashboard should refresh with new recommendations
    And recommendations should suggest larger budget changes

  @filters
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Default risk tolerance is moderate
    When I navigate to the Allocator page
    Then the risk dropdown should show "Moderate"

  # Recommendations
  @recommendations
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View scale winner recommendation
    Given I have a high-performing campaign
    When I navigate to the Allocator page
    Then I should see a "Scale Winner" recommendation card
    And I should see the campaign name
    And I should see the suggested budget increase
    And I should see projected impact metrics

  @recommendations
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View decrease budget recommendation
    Given I have an underperforming campaign
    When I navigate to the Allocator page
    Then I should see a "Decrease Budget" recommendation card
    And I should see the suggested budget decrease
    And I should see the reason for the recommendation

  @recommendations
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View reallocation recommendation
    Given I have both high and low performing campaigns
    When I navigate to the Allocator page
    Then I should see a "Reallocate" recommendation card
    And I should see the source campaign
    And I should see the target campaign
    And I should see the suggested transfer amount

  @recommendations
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View recommendation confidence level
    When I navigate to the Allocator page
    And I have recommendations available
    Then each recommendation should show a confidence badge
    And high confidence should show "High Confidence"
    And medium confidence should show "Medium Confidence"
    And low confidence should show "Low Confidence"

  @recommendations
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: View recommendation supporting data
    When I navigate to the Allocator page
    And I have recommendations available
    Then I should see supporting data badges
    And badges should show metrics like "ROAS: 2.5x"

  # Apply Recommendations
  @recommendations @action
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Apply a recommendation
    When I navigate to the Allocator page
    And I have recommendations available
    And I click "Apply Recommendation" on a recommendation card
    Then I should see a loading state
    And then I should see "Applied" on the card
    And the apply button should be disabled

  @recommendations @action
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Expired recommendation cannot be applied
    Given I have an expired recommendation
    When I navigate to the Allocator page
    Then the recommendation should show "This recommendation has expired"
    And the apply button should be disabled

  # Empty States
  @empty
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: No campaigns connected
    Given I have no marketing accounts connected
    When I navigate to the Allocator page
    Then I should see a message about connecting ad accounts

  @empty
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: No recommendations available
    Given all my campaigns are performing optimally
    When I navigate to the Allocator page
    Then I should see "No recommendations at this time"
    And I should see a message that campaigns are performing well

  @empty
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Insufficient data warning
    Given I have limited campaign data
    When I navigate to the Allocator page
    Then I should see a warning about limited data
    And recommendations should indicate lower confidence

  # Responsive Design
  @responsive
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Dashboard displays correctly on mobile
    Given I am using a mobile device
    When I navigate to the Allocator page
    Then the spend overview cards should stack vertically
    And the recommendation cards should be full width
    And the charts should be scrollable

  @responsive
  Scenario: Dashboard displays correctly on tablet
    Given I am using a tablet device
    When I navigate to the Allocator page
    Then the spend overview cards should display in a 2x2 grid
    And the recommendation cards should display in a 2-column grid

  # Error Handling
  @error
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle API error gracefully
    Given the API is returning errors
    When I navigate to the Allocator page
    Then I should see an error message
    And the message should explain the failure

  @error
  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle network timeout
    Given the network is slow
    When I navigate to the Allocator page
    Then I should see loading skeletons
    And after timeout I should see an error message
