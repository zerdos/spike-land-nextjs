@agent-polling @requires-db @skip-ci
Feature: Agent Polling System E2E Tests
  As a developer
  I want to test the agent polling infrastructure
  Without incurring Claude API costs

  The agent polling system uses keyword-based test mode to exercise:
  - Redis queue message handling
  - API authentication (AGENT_API_KEY)
  - Database writes (app messages, status updates)
  - SSE broadcasts (real-time updates)

  Test keywords bypass Claude CLI but still exercise all other infrastructure.

  Background:
    Given I am logged in as "E2E Tester" with email "e2e@test.com"

  # ============================================================
  # Basic Echo Tests - Verify message round-trip
  # ============================================================

  @smoke
  Scenario: Echo message through agent system
    Given I have an app workspace named "Echo Test App"
    And the agent polling system is running
    When I send message "E2E_TEST_ECHO:Hello World"
    Then I should see agent working indicator
    And I should receive agent response "ECHO: Hello World"
    And the message should be marked as read

  Scenario: Echo with special characters
    Given I have an app workspace named "Special Chars Test"
    And the agent polling system is running
    When I send message "E2E_TEST_ECHO:<script>alert('xss')</script>"
    Then I should receive agent response containing "ECHO:"
    And the response should be HTML-escaped

  # ============================================================
  # Code Update Tests - Verify SSE broadcasts and state changes
  # ============================================================

  @smoke
  Scenario: Code update triggers SSE broadcast
    Given I have an app workspace named "Code Update Test"
    And the agent polling system is running
    When I send message "E2E_TEST_CODE_UPDATE"
    Then I should see agent working indicator
    And I should receive agent response containing "Mock code update completed"
    And the preview should receive code_updated event
    And the app status should be "BUILDING"

  Scenario: Code update sets codespace ID
    Given I have an app workspace named "Codespace ID Test"
    And the agent polling system is running
    When I send message "E2E_TEST_CODE_UPDATE"
    Then the app should have a codespace ID set

  # ============================================================
  # Error Handling Tests
  # ============================================================

  Scenario: Error handling in agent response
    Given I have an app workspace named "Error Test App"
    And the agent polling system is running
    When I send message "E2E_TEST_ERROR"
    Then I should see agent working indicator
    And I should receive system error message
    And the error should be logged

  Scenario: Agent recovers after error
    Given I have an app workspace named "Recovery Test App"
    And the agent polling system is running
    When I send message "E2E_TEST_ERROR"
    And I wait for the error to be processed
    And I send message "E2E_TEST_ECHO:Recovery test"
    Then I should receive agent response "ECHO: Recovery test"

  # ============================================================
  # Delay Tests - Verify timeout and loading states
  # ============================================================

  Scenario: Delayed response shows loading state
    Given I have an app workspace named "Delay Test App"
    And the agent polling system is running
    When I send message "E2E_TEST_DELAY:2000"
    Then I should see agent working indicator for at least 2 seconds
    And I should receive agent response "Delayed response after 2000ms"

  Scenario: Delay is capped at 30 seconds
    Given I have an app workspace named "Max Delay Test"
    And the agent polling system is running
    When I send message "E2E_TEST_DELAY:60000"
    Then the actual delay should be capped at 30 seconds

  # ============================================================
  # MCP Integration Tests (optional deeper testing)
  # ============================================================

  @skip
  Scenario: MCP integration test with codespace
    Given I have an app workspace named "MCP Test App"
    And the agent polling system is running
    When I send message "E2E_TEST_MCP:test-codespace-123"
    Then I should receive agent response containing "MCP integration test completed"
    And the codespace ID should be "test-codespace-123"

  # ============================================================
  # Queue Management Tests
  # ============================================================

  Scenario: Multiple messages processed in order
    Given I have an app workspace named "Queue Order Test"
    And the agent polling system is running
    When I send message "E2E_TEST_ECHO:First"
    And I send message "E2E_TEST_ECHO:Second"
    And I send message "E2E_TEST_ECHO:Third"
    Then the responses should arrive in order:
      | response       |
      | ECHO: First    |
      | ECHO: Second   |
      | ECHO: Third    |

  Scenario: Agent working indicator clears after completion
    Given I have an app workspace named "Working Indicator Test"
    And the agent polling system is running
    When I send message "E2E_TEST_ECHO:Complete"
    And I wait for the agent to finish
    Then the agent working indicator should be cleared

  # ============================================================
  # Authentication Tests
  # ============================================================

  @auth
  Scenario: Agent API requires authentication
    Given I am not logged in
    When I try to access the agent queue API directly
    Then I should receive 401 Unauthorized

  @auth
  Scenario: Invalid API key is rejected
    Given an invalid AGENT_API_KEY
    When the agent tries to post a response
    Then the request should fail with 401 or 403
