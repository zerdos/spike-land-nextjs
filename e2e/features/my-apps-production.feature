@my-apps @production
Feature: My Apps Production E2E Tests
  As an authenticated user on spike.land production
  I want to verify that /my-apps functionality works correctly
  So that I can confidently deploy and use the app creation features

  Background:
    Given I am authenticated on spike.land production

  @acceptance-1
  Scenario: Access /my-apps on production
    When I navigate to the My Apps dashboard
    Then I should see the My Apps dashboard
    And the page should have a "Create New App" button

  @acceptance-2
  Scenario: Create New App flow works end-to-end
    Given I am on the My Apps dashboard
    When I click the "Create New App" button
    Then I should be redirected to a new codespace URL
    And I should see the chat input field
    And I should see the prompt mode welcome state

  @acceptance-3 @slow
  Scenario: Agent responds to user prompts
    Given I have created a new app
    When I type "Create a simple counter with increment and decrement buttons" in the chat input
    And I click the Start button
    Then I should see the agent working indicator within 15 seconds
    And I should see an agent response within 120 seconds

  @acceptance-4 @slow
  Scenario: Preview iframe is visible and functional
    Given I have created a new app with agent response
    Then I should see a preview area
    And the preview iframe should load content from testing.spike.land

  @acceptance-5 @slow
  Scenario: Chat interface shows streaming
    Given I have created a new app
    When I send a prompt to the agent
    Then I should see the streaming indicator
    And the response should complete with full text

  @acceptance-6 @slow
  Scenario: Code updates trigger preview refresh
    Given I have an app with an initial response
    When I send "Add a title saying Counter App"
    And the agent responds with updated code
    Then the preview should update with new content

  @acceptance-7 @slow @create-test-apps
  Scenario Outline: Create 5 test apps on production
    Given I am on the My Apps dashboard
    When I create a new app with prompt "<prompt>"
    Then the agent should respond successfully
    And the preview should be functional

    Examples:
      | prompt                                            |
      | Create a colorful todo list with add and delete   |
      | Build a color picker showing hex and RGB values   |
      | Make a countdown timer with start pause reset     |
      | Create a random quote generator                   |
      | Build a simple calculator with basic operations   |

  @acceptance-8 @slow
  Scenario: Verify persistence of created apps
    Given I have created at least 2 test apps
    When I navigate back to the My Apps dashboard
    Then I should see my apps in the list

  @cleanup @manual
  Scenario: Clean up test apps
    Given I am on the My Apps dashboard
    When I move test apps to bin
    Then the dashboard should show fewer apps
