@wip
Feature: Merch Shopping Cart
  As a logged in user
  I want to add products to my cart and manage quantities
  So that I can purchase merchandise

  # NOTE: These tests are marked @wip because they require merch products
  # in the database. After merging the merch feature, add seed data and
  # remove the @wip tag.

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  Scenario: Empty cart displays message
    When I navigate to "/cart"
    Then I should see "Your cart is empty" heading
    And I should see "Browse Products" button

  Scenario: User adds product to cart
    When I navigate to "/merch"
    And I click on the first product card
    And I select the first variant
    And I select a test image
    And I click the "Add to Cart" button
    Then I should see the cart success message
    And the cart icon should show 1 item

  Scenario: User views cart with items
    Given I have added a product to my cart
    When I navigate to "/cart"
    Then I should see "Shopping Cart" heading
    And I should see the cart item
    And I should see the order summary
    And I should see "Proceed to Checkout" button

  Scenario: User increases cart quantity
    Given I have added a product to my cart
    When I navigate to "/cart"
    And I click the increase quantity button
    Then the cart quantity should be 2
    And the cart total should update

  Scenario: User decreases cart quantity
    Given I have added 2 products to my cart
    When I navigate to "/cart"
    And I click the decrease quantity button
    Then the cart quantity should be 1
    And the cart total should update

  Scenario: User removes item from cart
    Given I have added a product to my cart
    When I navigate to "/cart"
    And I click the remove item button
    Then I should see "Your cart is empty" heading

  Scenario: Free shipping threshold indicator
    Given I have added a product to my cart with value under 55 GBP
    When I navigate to "/cart"
    Then I should see the free shipping threshold message
    And I should see shipping cost in the summary

  Scenario: Free shipping achieved
    Given I have added products to my cart with value over 55 GBP
    When I navigate to "/cart"
    Then the shipping cost should show as "FREE"

  Scenario: Continue shopping from cart
    Given I have added a product to my cart
    When I navigate to "/cart"
    And I click the "Continue Shopping" button
    Then I should be on "/merch"
