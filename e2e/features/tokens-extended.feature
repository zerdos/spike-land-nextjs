@skip
Feature: Token Management Extended
  As a user
  I want comprehensive token management
  So that I can purchase, track, and use tokens effectively

  Background:
    Given I am logged in as "Token User" with email "token.user@example.com"

  # Token Balance Display
  @balance @fast @requires-db
  Scenario: Token balance displayed correctly
    Given I have 100 tokens
    And I am on the enhance page
    Then I should see "100" in the token balance
    And the balance should show the coins icon

  @balance @fast @requires-db
  Scenario: Zero balance shows get tokens prompt
    Given I have 0 tokens
    And I am on the enhance page
    Then I should see "0" in the token balance
    And the get tokens button should say "Get Tokens"
    And the balance should show warning styling

  @balance @fast @requires-db
  Scenario: Token balance updates after action
    Given I have 50 tokens
    And I am on the enhance page
    When I perform an action that costs 5 tokens
    Then the token balance should update to "45"

  # Token Purchase Flow Errors
  @purchase-flow @integration
  Scenario: Purchase fails with invalid package
    Given I am on the enhance page
    When I open the purchase modal
    And I click on an invalid token package
    Then I should see a purchase error message

  @purchase-flow @integration
  Scenario: Stripe checkout creation fails
    Given I am on the enhance page
    And the Stripe API is unavailable
    When I open the purchase modal
    And I click on the "basic" token package
    Then I should see "Unable to create checkout session" error
    And I should see the "Try Again" button

  @purchase-flow @integration
  Scenario: Purchase modal shows loading during checkout
    Given I am on the enhance page
    When I open the purchase modal
    And I click on the "basic" token package
    Then I should see a loading indicator on the package

  @purchase-flow @integration
  Scenario: Return from cancelled Stripe checkout
    Given I am on the enhance page
    When I open the purchase modal
    And I click on the "basic" token package
    And I cancel on the Stripe checkout page
    Then I should return to the enhance page
    And my token balance should be unchanged

  # Insufficient Tokens
  @insufficient @integration
  Scenario: Insufficient tokens for image generation
    Given I have 1 token
    And I am on the enhance page
    When I try to enhance an image that costs 5 tokens
    Then I should see "Insufficient tokens" message
    And I should see "Purchase more tokens" option

  @insufficient @integration
  Scenario: Insufficient tokens shows purchase modal
    Given I have 2 tokens
    And I am on the enhance page
    When I try to enhance an image that costs 10 tokens
    And I click the "Get Tokens" option
    Then I should see the purchase modal

  @insufficient @integration
  Scenario: Low balance warning threshold
    Given I have 5 tokens
    And I am on the enhance page
    Then I should see the low balance warning
    And the warning should suggest purchasing more tokens

  # Voucher Extended Scenarios
  @voucher @integration
  Scenario: Voucher code with special characters rejected
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "CODE@123!"
    And I click the apply voucher button
    Then I should see "Invalid voucher code format" error

  @voucher @integration
  Scenario: Expired voucher shows expiration error
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "EXPIRED2023"
    And I click the apply voucher button
    Then I should see "Voucher has expired" error

  @voucher @integration
  Scenario: Voucher redemption updates balance immediately
    Given I have 10 tokens
    And I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "BONUS50"
    And I click the apply voucher button
    Then I should see success message
    And the modal should close
    And I should see "60" in the token balance

  @voucher @integration
  Scenario: Server error during voucher redemption
    Given I am on the enhance page
    And the voucher API returns a server error
    When I open the purchase modal
    And I enter the voucher code "SERVERTEST"
    And I click the apply voucher button
    Then I should see "Failed to redeem voucher" error
    And I should be able to try again

  # Token Balance API Errors
  @balance @integration
  Scenario: Balance fetch fails gracefully
    Given the token balance API fails
    When I am on the enhance page
    Then I should see the balance loading state
    And after retry I should see the balance

  @balance @integration
  Scenario: Balance refresh on page visibility
    Given I have 50 tokens
    And I am on the enhance page
    And I switch to another tab
    When I return to the enhance page tab
    Then the token balance should refresh

  # Package Display
  @purchase-flow @fast @requires-db
  Scenario: All package tiers are displayed
    Given I am on the enhance page
    When I open the purchase modal
    Then I should see the "Starter" package
    And I should see the "Basic" package
    And I should see the "Pro" package
    And I should see the "Enterprise" package

  @purchase-flow @fast @requires-db
  Scenario: Package shows token count and price
    Given I am on the enhance page
    When I open the purchase modal
    Then each package should display token amount
    And each package should display price
    And each package should have a "Buy Now" or "Select" button

  @purchase-flow @fast @requires-db
  Scenario: Best value package is highlighted
    Given I am on the enhance page
    When I open the purchase modal
    Then the best value package should be highlighted
    And it should show "Best Value" or "Popular" badge

  # Edge Cases
  @edge-case @integration
  Scenario: Concurrent token operations
    Given I have 100 tokens
    And I am on the enhance page
    When I initiate two token-consuming operations simultaneously
    Then only one operation should succeed
    And the other should show "Insufficient tokens" or be queued

  @edge-case @integration
  Scenario: Token balance with very large number
    Given I have 999999 tokens
    And I am on the enhance page
    Then the balance should display correctly formatted
    And the balance should show "999,999" or abbreviated

  @edge-case @integration
  Scenario: Rapid voucher submission prevented
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "RAPIDTEST"
    And I click the apply voucher button multiple times quickly
    Then only one redemption request should be processed
