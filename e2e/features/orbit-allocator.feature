@orbit @allocator
Feature: Orbit Allocator - Budget Recommendation Engine
  As an Orbit user with connected ad accounts
  I want to receive AI-powered budget reallocation recommendations
  So that I can optimize my ad spend across platforms

  Background:
    Given I am logged in as an Orbit user
    And I have an Orbit workspace named "Marketing Hub"

  # Allocator API Access
  @api
  Scenario: Allocator API returns 401 for unauthenticated requests
    Given I am not authenticated
    When I call the Allocator recommendations API for workspace "marketing-hub"
    Then the API should return status 401
    And the response should contain error "Unauthorized"

  @api
  Scenario: Allocator API returns 404 for non-existent workspace
    When I call the Allocator recommendations API for workspace "non-existent"
    Then the API should return status 404
    And the response should contain error "not found"

  @api
  Scenario: Allocator API validates lookbackDays parameter
    When I call the Allocator API with lookbackDays "invalid"
    Then the API should return status 400
    And the response should contain error "lookbackDays"

  @api
  Scenario: Allocator API enforces lookbackDays range
    When I call the Allocator API with lookbackDays "200"
    Then the API should return status 400
    And the response should contain error "lookbackDays"

  # Recommendations without data
  @api
  Scenario: Allocator returns empty recommendations when no ad accounts
    Given I have no marketing accounts connected
    When I call the Allocator recommendations API
    Then the API should return status 200
    And the response should have empty campaignAnalyses
    And the response should have empty recommendations
    And hasEnoughData should be false

  # Campaign Analysis
  @api @campaigns
  Scenario: Allocator analyzes connected ad campaigns
    Given I have a Facebook Ads account "Business Ads" connected
    And the account has campaign attribution data for the last 30 days
    When I call the Allocator recommendations API
    Then the API should return status 200
    And the response should contain campaign analyses
    And each analysis should include performanceScore
    And each analysis should include metrics with roas and cpa

  @api @campaigns
  Scenario: Allocator includes trend analysis for campaigns
    Given I have campaign data spanning 30 days
    When I call the Allocator recommendations API
    Then each campaign analysis should include trend data
    And trend should indicate if roas is improving, stable, or declining

  # Recommendation Types
  @api @recommendations
  Scenario: Allocator generates SCALE_WINNER for high performers
    Given I have a high-performing Facebook campaign "Summer Sale"
    And the campaign has performance score above 70
    When I call the Allocator recommendations API
    Then the response should contain a SCALE_WINNER recommendation
    And the recommendation should suggest a budget increase
    And the recommendation should include projected impact

  @api @recommendations
  Scenario: Allocator generates DECREASE_BUDGET for underperformers
    Given I have an underperforming Google Ads campaign "Old Promo"
    And the campaign has performance score below 40
    When I call the Allocator recommendations API
    Then the response should contain a DECREASE_BUDGET recommendation
    And the recommendation should suggest a budget reduction

  @api @recommendations
  Scenario: Allocator generates REALLOCATE between campaigns
    Given I have both high and low performing campaigns
    When I call the Allocator recommendations API
    Then the response may contain a REALLOCATE recommendation
    And the recommendation should include sourceCampaign and targetCampaign
    And estimated spend change should be budget neutral

  # Risk Tolerance
  @api @risk
  Scenario: Conservative risk tolerance reduces budget change magnitude
    Given I have campaign data
    When I call the Allocator API with riskTolerance "conservative"
    Then recommendations should have smaller budget change suggestions

  @api @risk
  Scenario: Aggressive risk tolerance increases budget change magnitude
    Given I have campaign data
    When I call the Allocator API with riskTolerance "aggressive"
    Then recommendations should have larger budget change suggestions

  # Account Filtering
  @api @filtering
  Scenario: Filter recommendations by specific accounts
    Given I have multiple marketing accounts connected
    When I call the Allocator API filtering by account "acc-1"
    Then the response should only analyze campaigns from that account

  # Summary and Impact
  @api @summary
  Scenario: Allocator provides aggregate summary metrics
    Given I have multiple campaigns with attribution data
    When I call the Allocator recommendations API
    Then the response should include summary with totalCampaignsAnalyzed
    And the summary should include averageRoas and averageCpa
    And the summary should include projectedTotalImpact

  # Data Quality
  @api @quality
  Scenario: Allocator reports data quality score
    Given I have campaign data with varying completeness
    When I call the Allocator recommendations API
    Then the response should include dataQualityScore between 0 and 100
    And hasEnoughData should reflect data sufficiency

  # Recommendation Details
  @api @details
  Scenario: Recommendations include actionable details
    Given I have campaigns with clear performance patterns
    When I call the Allocator recommendations API
    Then each recommendation should include confidence level
    And each recommendation should include reason explaining the suggestion
    And each recommendation should include supportingData array
    And each recommendation should include createdAt and expiresAt

  @api @details
  Scenario: Recommendations include projected ROI impact
    Given I have a high-performing campaign
    When I call the Allocator recommendations API
    Then the projected impact should include estimatedRoasChange
    And the projected impact should include estimatedCpaChange
    And the projected impact should include confidenceInterval
