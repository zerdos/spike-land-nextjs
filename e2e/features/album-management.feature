@requires-db @flaky
Feature: Album Management
  As an authenticated user
  I want to create and manage my photo albums
  So that I can organize my enhanced images

  Background:
    Given I am logged in as "Test User" with email "test@example.com"

  # Album Creation Tests
  Scenario: Create a new album with name only
    When I navigate to "/albums" page
    And I click "Create Album" button
    And I enter "Summer Vacation" as the album name
    And I confirm album creation
    Then I should see the new album "Summer Vacation" in my albums list
    And the album should show 0 images

  Scenario: Create album with name and description
    When I navigate to "/albums" page
    And I click "Create Album" button
    And I enter "Summer Vacation" as the album name
    And I enter "Photos from our trip to California" as the album description
    And I confirm album creation
    Then I should see the new album "Summer Vacation" in my albums list
    And the album description should be "Photos from our trip to California"

  Scenario: Cannot create album with empty name
    When I navigate to "/albums" page
    And I click "Create Album" button
    And I leave the album name empty
    And I confirm album creation
    Then I should see a validation error for album name
    And the album should not be created

  Scenario: Cannot create album with name exceeding 100 characters
    When I navigate to "/albums" page
    And I click "Create Album" button
    And I enter a name longer than 100 characters
    And I confirm album creation
    Then I should see a validation error for album name length
    And the album should not be created

  # Album Editing Tests
  Scenario: Edit album name
    Given I have an album named "Old Name"
    When I navigate to the album
    And I open album settings
    And I change the album name to "New Name"
    And I save the changes
    Then the album name should be updated to "New Name"
    And I should see a success message

  Scenario: Edit album description
    Given I have an album named "My Photos"
    When I navigate to the album
    And I open album settings
    And I change the description to "Updated description"
    And I save the changes
    Then the album description should be updated to "Updated description"

  Scenario: Edit album privacy to unlisted
    Given I have a private album named "Private Album"
    When I navigate to the album
    And I open album settings
    And I change privacy to "unlisted"
    And I save the changes
    Then the album privacy should be "unlisted"
    And I should receive a shareable URL

  Scenario: Edit album privacy to public
    Given I have a private album named "Private Album"
    When I navigate to the album
    And I open album settings
    And I change privacy to "public"
    And I save the changes
    Then the album privacy should be "public"
    And I should receive a shareable URL

  # Album Deletion Tests
  Scenario: Delete empty album
    Given I have an album named "To Delete"
    When I navigate to the album
    And I open album settings
    And I click "Delete Album" button
    And I confirm the deletion
    Then the album should be removed from my list
    And I should be redirected to "/albums"

  Scenario: Delete album with images
    Given I have an album named "Photos Album" with 3 images
    When I navigate to the album
    And I open album settings
    And I click "Delete Album" button
    And I confirm the deletion
    Then the album should be removed from my list
    And the images should still exist in my library

  Scenario: Cancel album deletion
    Given I have an album named "Keep This"
    When I navigate to the album
    And I open album settings
    And I click "Delete Album" button
    And I cancel the deletion confirmation
    Then the modal should close
    And the album should still exist

  # Album Sharing Tests
  Scenario: Share album with public link
    Given I have an unlisted album named "Shared Album" with images
    When I navigate to the album
    And I open album settings
    Then I should see a shareable URL
    When I copy the shareable URL
    And I open the URL in an incognito window
    Then I should see the album contents without logging in
    And I should not see edit controls

  Scenario: Shared unlisted album is accessible via direct link
    Given I have an unlisted album named "Unlisted Album" with images
    When I navigate to the album using share token
    Then I should see the album contents
    And the page title should show "Unlisted Album"

  Scenario: Private album is not accessible via share link
    Given I have a private album named "Private Album"
    When I attempt to access the album via share URL as anonymous user
    Then I should see "Album not found" error

  Scenario: Change album from unlisted to private removes share access
    Given I have an unlisted album named "Was Unlisted" with images
    And the album has been shared via URL
    When I navigate to the album
    And I open album settings
    And I change privacy to "private"
    And I save the changes
    Then the shareable URL should be removed
    When someone tries to access the old share URL
    Then they should see "Album not found" error

  # Album Image Management Tests
  Scenario: Add single image to album
    Given I have an album named "My Album"
    And I have 3 enhanced images not in any album
    When I navigate to the album
    And I click "Add Images" button
    And I select 1 image from my library
    And I confirm the selection
    Then the album should show 1 image
    And I should see a success message

  Scenario: Add multiple images to album
    Given I have an album named "My Album"
    And I have 5 enhanced images not in any album
    When I navigate to the album
    And I click "Add Images" button
    And I select 3 images from my library
    And I confirm the selection
    Then the album should show 3 images

  Scenario: Cannot add same image to album twice
    Given I have an album named "My Album" with 1 image
    When I navigate to the album
    And I click "Add Images" button
    And I select the image that is already in the album
    And I confirm the selection
    Then I should see an info message about duplicate image
    And the album should still show 1 image

  Scenario: Remove image from album
    Given I have an album named "My Album" with 3 images
    When I navigate to the album
    And I select an image
    And I click "Remove from Album" button
    And I confirm removal
    Then the album should show 2 images
    And the image should still exist in my library

  # Album Viewing Tests
  Scenario: View empty album shows empty state
    Given I have an album named "Empty Album"
    When I navigate to the album
    Then I should see empty state message
    And I should see "Add Images" button

  Scenario: View album displays all images
    Given I have an album named "My Album" with 5 images
    When I navigate to the album
    Then I should see 5 images in the album
    And each image should display properly

  Scenario: Album list shows preview images
    Given I have an album named "Preview Album" with 5 images
    When I navigate to "/albums" page
    Then the album card should show up to 4 preview images
    And the image count should display "5"

  # Edge Cases and Error Handling
  Scenario: Cannot access another user's private album
    Given another user has a private album
    When I try to navigate to that album
    Then I should see "Album not found" error

  Scenario: Cannot edit another user's album
    Given another user has a public album
    When I try to access the album settings
    Then I should not see edit controls

  Scenario: Handle network error during album creation
    Given the API is temporarily unavailable
    When I try to create a new album
    Then I should see an error message
    And the album should not be created

  Scenario: Handle network error during album deletion
    Given I have an album named "Test Album"
    And the API is temporarily unavailable
    When I try to delete the album
    Then I should see an error message
    And the album should still exist
