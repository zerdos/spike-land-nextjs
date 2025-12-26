Feature: Home Page
  As a user
  I want to visit the home page
  So that I can access the Pixel photo restoration app

  Scenario: Home page has link to Pixel app
    Given I am on the home page
    Then I should see a link to "/pixel"
