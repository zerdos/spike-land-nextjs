@requires-merch-data
Feature: Merch Checkout
  As a logged in user with items in my cart
  I want to complete the checkout process
  So that I can purchase my customized merchandise

  Background:
    Given I am logged in as "Test User" with email "test@example.com"
    And I have added a product to my cart

  Scenario: User cannot access checkout with empty cart
    When I navigate to "/cart"
    And I click the remove item button
    And I navigate to "/checkout"
    Then I should be on "/cart"

  Scenario: User proceeds to checkout from cart
    When I navigate to "/cart"
    Then I should see "Proceed to Checkout" button
    When I click the "Proceed to Checkout" button
    Then I should be on "/checkout"
    And I should see "Checkout" heading
    And I should see "Shipping Information" heading

  Scenario: Checkout displays order summary
    When I navigate to "/checkout"
    Then I should see "Order Summary" heading
    And I should see the order subtotal
    And I should see shipping information placeholder

  Scenario: User fills in shipping address
    When I navigate to "/checkout"
    And I fill in the shipping address form:
      | field       | value                |
      | name        | John Doe             |
      | line1       | 123 Test Street      |
      | city        | London               |
      | postalCode  | SW1A 1AA             |
      | phone       | 07700900000          |
    And I click the "Continue to Payment" button
    Then I should see "Payment" heading
    And I should see the order summary with calculated shipping

  Scenario: Shipping address validation
    When I navigate to "/checkout"
    And I click the "Continue to Payment" button
    Then I should see a checkout validation error

  Scenario: User sees Stripe payment form
    When I navigate to "/checkout"
    And I complete the shipping address form
    And I click the "Continue to Payment" button
    Then I should see the Stripe payment element
    And I should see "Complete Order" button

  Scenario: Payment form shows security message
    When I navigate to "/checkout"
    And I complete the shipping address form
    And I click the "Continue to Payment" button
    Then I should see payment security message
    And I should see the lock icon

  Scenario: User can return to cart from checkout
    When I navigate to "/checkout"
    Then I should see "Back to cart" link
    When I click the "Back to cart" link
    Then I should be on "/cart"

  Scenario: Country selector shows UK and EU countries
    When I navigate to "/checkout"
    Then the country selector should have "United Kingdom" option
    And the country selector should have "France" option
    And the country selector should have "Germany" option

  Scenario: Email field pre-fills for logged in user
    When I navigate to "/checkout"
    Then the email field should contain "test@example.com"
