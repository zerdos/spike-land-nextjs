Feature: Token Management
  As a user
  I want to manage my tokens
  So that I can use image enhancement features

  Background:
    Given I am logged in as "Token User" with email "token.user@example.com"

  @balance @smoke
  Scenario: View token balance on enhance page
    Given I am on the enhance page
    Then I should see the token balance display
    And I should see the token balance card with coins icon

  @balance 
  Scenario: Low balance shows warning
    Given I have 3 tokens
    And I am on the enhance page
    Then I should see the low balance warning style
    And the get tokens button should say "Get Tokens"

  @balance 
  Scenario: Normal balance shows no warning
    Given I have 50 tokens
    And I am on the enhance page
    Then I should not see the low balance warning style
    And the get tokens button should say "+"

  @voucher-valid 
  Scenario: Redeem valid voucher code
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "LAUNCH100"
    And I click the apply voucher button
    Then I should see the success message "Successfully redeemed! You received 100 tokens."
    And my balance should increase

  @voucher-invalid 
  Scenario: Invalid voucher shows error
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "INVALID123"
    And I click the apply voucher button
    Then I should see an error message for the voucher

  @voucher-duplicate 
  Scenario: Cannot redeem same voucher twice
    Given I have already redeemed voucher "WELCOME50"
    And I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "WELCOME50"
    And I click the apply voucher button
    Then I should see an error message for the voucher

  @voucher-empty 
  Scenario: Cannot submit empty voucher code
    Given I am on the enhance page
    When I open the purchase modal
    Then the apply voucher button should be disabled

  @voucher-loading 
  Scenario: Voucher redemption shows loading state
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "TESTCODE"
    And I click the apply voucher button
    Then I should see the loading spinner on apply button

  @purchase-flow @smoke
  Scenario: Open purchase modal shows token packages
    Given I am on the enhance page
    When I open the purchase modal
    Then I should see the purchase modal title "Get More Tokens"
    And I should see token package cards
    And I should see the voucher input section

  @purchase-flow 
  Scenario: Token purchase redirects to Stripe checkout
    Given I am on the enhance page
    When I open the purchase modal
    And I click on the "basic" token package
    Then I should be redirected to Stripe checkout

  @purchase-flow 
  Scenario: Purchase modal can be closed
    Given I am on the enhance page
    When I open the purchase modal
    And I close the purchase modal
    Then I should not see the purchase modal

  @balance 
  Scenario: Token balance refreshes after voucher redemption
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "REFRESH50"
    And I click the apply voucher button
    Then the purchase modal should close
    And the token balance should be updated

  @purchase-flow 
  Scenario: Purchase modal shows package options
    Given I am on the enhance page
    When I open the purchase modal
    Then I should see at least 4 token packages
    And each package should show tokens and price

  @voucher-uppercase 
  Scenario: Voucher code is converted to uppercase
    Given I am on the enhance page
    When I open the purchase modal
    And I enter the voucher code "lowercase"
    Then the voucher input should show "LOWERCASE"

  Scenario: Token balance displayed in header on enhance page
    Given I have 25 tokens
    And I am on the enhance page
    Then I should see "25 tokens" in the balance display
