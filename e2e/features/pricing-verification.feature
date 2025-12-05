Feature: Pricing Page Verification
  As a user
  I want to see token pricing without subscriptions
  So that I can purchase tokens for image enhancement

  Background:
    Given I visit "/pricing"

  Scenario: Pricing page displays correctly
    Then I should be on the "/pricing" page
    And I should see "Pricing" heading
    And I should see "Get tokens to enhance your images with AI" text

  Scenario: Token usage information displays
    When I view the pricing page
    Then I should see "Token Usage" text
    And I should see "1K" enhancement cost
    And I should see "2K" enhancement cost
    And I should see "4K" enhancement cost

  Scenario: Only token packs are displayed
    When I view the pricing page
    Then I should see "Token Packs" text
    And I should see 4 token pack options
    And I should not see any subscription options

  Scenario: Token packs display correct information
    When I view the pricing page
    Then each token pack should display:
      | Field        |
      | Name         |
      | Token count  |
      | Price        |
      | Price per token |
      | Buy button   |

  Scenario: Pro pack is marked as most popular
    When I view the pricing page
    Then I should see "Most Popular" badge on the pro pack

  Scenario: Token pack prices are in GBP
    When I view the pricing page
    Then all prices should be displayed in GBP currency
    And I should see the "£" symbol on all prices

  Scenario: FAQ section displays
    When I view the pricing page
    Then I should see "FAQ" text
    And I should see "What are tokens used for?" question
    And I should see "Do tokens expire?" question
    And I should see "How do I get more tokens?" question

  Scenario: Unauthenticated user clicks buy button
    Given I am not logged in
    When I click the buy button for a token pack
    Then I should be redirected to the sign-in page
    And the callback URL should point to pricing page

  @requires-db
  Scenario: Authenticated user clicks buy button
    Given I am logged in as "Test User" with email "test@example.com"
    When I click the buy button for the "starter" pack
    Then I should be redirected to Stripe checkout
    And the checkout should be for a one-time payment

  @requires-db
  Scenario: All token packs are purchasable
    Given I am logged in as "Test User" with email "test@example.com"
    When I view the pricing page
    Then all buy buttons should be enabled
    And I should see buy buttons for:
      | Pack     |
      | starter  |
      | basic    |
      | pro      |
      | premium  |

  Scenario: Token pack value proposition displays
    When I view the pricing page
    Then each pack should show price per token
    And premium pack should have the best price per token

  Scenario: Loading state during purchase
    Given I am logged in as "Test User" with email "test@example.com"
    When I click the buy button for a token pack
    Then the button should show "Processing..." text
    And the button should be disabled during processing

  Scenario: No subscription interval mentioned
    When I view the pricing page
    Then I should not see "monthly" text
    And I should not see "yearly" text
    And I should not see "subscription" text
    And I should not see "recurring" text

  Scenario: Starter pack displays correctly
    When I view the pricing page
    Then the starter pack should display:
      | Attribute | Value |
      | Name      | Starter |
      | Tokens    | 10     |

  Scenario: Basic pack displays correctly
    When I view the pricing page
    Then the basic pack should display:
      | Attribute | Value |
      | Name      | Basic |
      | Tokens    | 25    |

  Scenario: Pro pack displays correctly
    When I view the pricing page
    Then the pro pack should display:
      | Attribute | Value |
      | Name      | Pro   |
      | Tokens    | 100   |

  Scenario: Premium pack displays correctly
    When I view the pricing page
    Then the premium pack should display:
      | Attribute | Value |
      | Name      | Premium |
      | Tokens    | 500     |
