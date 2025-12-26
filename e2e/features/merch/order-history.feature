Feature: Order History
  As a logged in user
  I want to view my order history
  So that I can track my purchases and order status

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  Scenario: User with no orders sees empty state
    When I log out and log in as "New User" with email "newuser@example.com"
    And I navigate to "/orders"
    Then I should see "My Orders" heading
    And I should see "No orders yet" heading
    And I should see "Browse Products" link

  Scenario: User views order list
    Given I have placed an order
    When I navigate to "/orders"
    Then I should see "My Orders" heading
    And I should see the order in the list
    And I should see the order number
    And I should see the order status badge
    And I should see the order date
    And I should see the order total

  Scenario: User clicks on order to view details
    Given I have placed an order
    When I navigate to "/orders"
    And I click on the first order in the list
    Then I should be on the order detail page
    And I should see the order details

  Scenario: Order list shows product preview images
    Given I have placed an order with 2 items
    When I navigate to "/orders"
    Then I should see preview images for the order items

  Scenario: Order list shows multiple orders in chronological order
    Given I have placed multiple orders
    When I navigate to "/orders"
    Then the orders should be sorted by date descending
    And each order should show its order number

  Scenario: Protected route requires authentication
    When I am not logged in
    And I navigate to "/orders"
    Then I should be redirected to the login page
    And the URL should contain "callbackUrl=/orders"

  Scenario: Order status badge displays correctly
    Given I have an order with status "PENDING"
    When I navigate to "/orders"
    Then I should see the "PENDING" status badge

  Scenario: Order item count displays correctly
    Given I have placed an order with 2 items
    When I navigate to "/orders"
    Then I should see "2 items" in the order summary

  Scenario: User can browse products from empty orders page
    When I log out and log in as "New User" with email "newuser@example.com"
    And I navigate to "/orders"
    And I click the "Browse Products" link
    Then I should be on "/merch"
