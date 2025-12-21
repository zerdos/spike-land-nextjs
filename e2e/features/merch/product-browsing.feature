Feature: Merch Product Browsing
  As a user
  I want to browse and view product details
  So that I can find and customize merchandise

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  Scenario: User views product catalog
    When I navigate to "/merch"
    Then I should see "Photo Merchandise" heading
    And I should see the product grid

  Scenario: User can view category filters
    When I navigate to "/merch"
    Then I should see the category filters
    And I should see "All Products" link

  Scenario: User clicks on a product to view details
    When I navigate to "/merch"
    And I click on the first product card
    Then I should be on a product detail page
    And I should see the product name
    And I should see the product price
    And I should see the variant selector
    And I should see the image selector
    And I should see "Add to Cart" button

  Scenario: Product detail page shows required information
    When I navigate to "/merch"
    And I click on the first product card
    Then I should see the product mockup image
    And I should see minimum image requirements
    And I should see "Back to products" link

  Scenario: User can return to product list
    When I navigate to "/merch"
    And I click on the first product card
    And I click the "Back to products" link
    Then I should be on "/merch"
