Feature: Image Enhancement
  As an authenticated user
  I want to enhance my images with AI
  So that I can get higher quality versions

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  @flaky
  Scenario: View enhance page as authenticated user
    When I visit "/enhance"
    Then I should be on the "/enhance" page
    And I should see "AI Image Enhancement" heading
    And I should see the image upload section
    And I should see the token balance display

  @flaky
  Scenario: Unauthenticated user redirected from enhance page
    Given I am not logged in
    When I visit "/enhance"
    Then I should be on the "/auth/signin" page

  @flaky
  Scenario: Image upload section displays correctly
    When I visit "/enhance"
    Then I should see the upload icon
    And I should see "Upload an Image" text
    And I should see "Choose an image to enhance with AI" text
    And I should see "Select Image" text

  @requires-db
  Scenario: Upload an image successfully
    Given I am on the enhance page
    And I mock a successful image upload
    When I upload a valid image file
    Then I should be redirected to the image enhancement page
    And the URL should contain "/enhance/"

  @flaky
  Scenario: Image upload shows validation error for large file
    Given I am on the enhance page
    When I attempt to upload a file larger than 50MB
    Then I should see upload error "File size must be less than 50MB"

  @flaky
  Scenario: Image upload shows validation error for non-image file
    Given I am on the enhance page
    When I attempt to upload a non-image file
    Then I should see upload error "Please select an image file"

  @flaky
  Scenario: Image upload shows loading state
    Given I am on the enhance page
    And I mock a slow image upload
    When I start uploading an image
    Then I should see "Uploading..." text
    And I should see the loading spinner
    And the upload button should be disabled

  @fast @requires-db
  Scenario: View uploaded image details
    Given I have an uploaded image
    When I visit the image enhancement page
    Then I should see "Image Enhancement" heading
    And I should see "Before & After Comparison" or "Original Image" text
    And I should see the enhancement settings panel
    And I should see "Back to Images" button

  @requires-db
  Scenario: Enhancement settings displays tier options
    Given I have an uploaded image
    When I visit the image enhancement page
    Then I should see "TIER_1K" enhancement option
    And I should see "TIER_2K" enhancement option
    And I should see "TIER_4K" enhancement option
    And each tier should display token cost

  @requires-db
  Scenario: Enhance image with sufficient tokens
    Given I have an uploaded image
    And I have at least 2 tokens
    And I mock a successful enhancement
    When I select "TIER_1K" enhancement
    And I click the enhance button
    Then I should see enhancement status "Processing"
    And the enhancement should start processing

  @requires-db
  Scenario: Cannot enhance without sufficient tokens
    Given I have an uploaded image
    And I have 0 tokens
    When I try to enhance the image with "TIER_1K"
    Then I should see an insufficient tokens warning
    And I should see a purchase prompt

  @requires-db
  Scenario: Low balance warning displays correctly
    Given I have an uploaded image
    And I have less than 5 tokens
    When I visit the image enhancement page
    Then I should see the low balance banner
    And I should see "Your token balance is running low" text
    And I should see "Get Tokens" button

  @requires-db
  Scenario: Compare original and enhanced versions
    Given I have an enhanced image
    When I view the image details
    Then I should see the comparison slider
    And I can interact with the slider to compare versions

  @requires-db
  Scenario: View enhancement versions grid
    Given I have multiple enhancement versions
    When I view the image details
    Then I should see "Enhancement Versions" heading
    And I should see all enhancement versions
    And I can select different versions to compare

  @requires-db
  Scenario: Select different enhancement versions
    Given I have multiple enhancement versions
    When I click on a different version in the grid
    Then the comparison slider should update
    And the selected version should be highlighted

  @requires-db
  Scenario: Delete an image from list
    Given I have uploaded images
    When I visit "/enhance"
    And I delete an image from the list
    And I confirm the deletion
    Then the image should be removed from the list

  @requires-db
  Scenario: Cancel image deletion
    Given I have uploaded images
    When I visit "/enhance"
    And I attempt to delete an image
    And I cancel the deletion confirmation
    Then the image should remain in the list

  @fast @requires-db
  Scenario: Navigate back to images list
    Given I have an uploaded image
    And I am on the image enhancement page
    When I click the "Back to Images" button
    Then I should be on the "/enhance" page
    And I should see "Your Images" heading

  @requires-db
  Scenario: View empty state when no images
    Given I have no uploaded images
    When I visit "/enhance"
    Then I should see "Your Images" heading
    And I should see an empty images list

  @requires-db
  Scenario: Token balance updates after enhancement
    Given I have an uploaded image
    And I have 10 tokens
    And I mock a successful enhancement with 2 token cost
    When I enhance the image with "TIER_1K"
    And the enhancement completes
    Then my token balance should decrease to 8 tokens

  @requires-db
  Scenario: Purchase tokens from enhancement page
    Given I have an uploaded image
    And I have low token balance
    When I click "Get Tokens" button
    Then I should see the purchase modal
    And I can select token packages

  @requires-db
  Scenario: Enhancement processing displays progress
    Given I have an uploaded image
    And I start an enhancement job
    When the job is processing
    Then I should see enhancement status "Processing" in the version grid
    And the enhance button should be disabled

  @requires-db
  Scenario: Enhancement error handling
    Given I have an uploaded image
    And I mock a failed enhancement
    When I try to enhance the image
    Then I should see an error message
    And the enhancement status should show as failed

  @fast @requires-db
  Scenario: Image details page validates ownership
    Given I am logged in as "User A" with email "usera@example.com"
    And another user has an uploaded image
    When I try to access that image's enhancement page
    Then I should be redirected to "/enhance"

  @requires-db
  Scenario: Return from Stripe checkout refreshes balance
    Given I have an uploaded image
    When I return from successful Stripe checkout
    Then the token balance should refresh automatically
    And the URL parameters should be cleaned up

  @requires-db
  Scenario: Image comparison slider is responsive
    Given I have an enhanced image
    When I view the comparison on different screen sizes
    Then the slider should work on mobile
    And the slider should work on desktop
    And the slider should work on tablet

  @fast @requires-db
  Scenario: Enhancement page displays user's images only
    Given I am logged in as "User A" with email "usera@example.com"
    And I have uploaded images
    And other users have uploaded images
    When I visit "/enhance"
    Then I should only see my own images
    And I should not see other users' images
