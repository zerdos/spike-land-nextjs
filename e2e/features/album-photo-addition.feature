Feature: Album Photo Addition
  As an authenticated user
  I want to add photos to my albums
  So that I can organize my enhanced images

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  @requires-db
  Scenario: View Add to Album button on enhance page
    Given I have uploaded images with enhancement jobs
    When I visit "/apps/pixel"
    Then I should see the Add to Album button for each image

  @requires-db
  Scenario: Open Add to Album modal
    Given I have uploaded images with enhancement jobs
    And I have albums
    When I visit "/apps/pixel"
    And I click the Add to Album button on an image
    Then I should see the Add to Album modal
    And I should see the album selection dropdown

  @requires-db
  Scenario: Add image to album successfully
    Given I have uploaded images with enhancement jobs
    And I have albums
    And I mock successful album image addition
    When I visit "/apps/pixel"
    And I click the Add to Album button on an image
    And I select an album from the dropdown
    And I click the Add to Album confirm button
    Then I should see a success toast notification

  @requires-db
  Scenario: Cancel Add to Album modal
    Given I have uploaded images with enhancement jobs
    And I have albums
    When I visit "/apps/pixel"
    And I click the Add to Album button on an image
    And I click the Cancel button in the modal
    Then the modal should close

  @requires-db
  Scenario: Empty albums state shows create album link
    Given I have uploaded images with enhancement jobs
    And I have no albums
    When I visit "/apps/pixel"
    And I click the Add to Album button on an image
    Then I should see the empty albums message
    And I should see a link to create an album

  @requires-db
  Scenario: Image already in album shows info message
    Given I have uploaded images with enhancement jobs
    And I have albums
    And I mock album addition returns already exists
    When I visit "/apps/pixel"
    And I click the Add to Album button on an image
    And I select an album from the dropdown
    And I click the Add to Album confirm button
    Then I should see an info toast about image already in album
