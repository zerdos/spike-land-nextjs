@requires-db @skip
Feature: App Creation Full Journey
  # NOTE: This entire feature file is skipped because the UI changed from a wizard
  # to a chat-based interface. Tests need to be rewritten for the new UI.
  As an authenticated user
  I want to complete the entire app creation process
  So that I can publish a new application

  Background:
    Given I am logged in as "App Creator" with email "creator@example.com"

  # Complete User Journey Tests
  @slow @e2e
  Scenario: Complete app creation journey - Free app
    When I navigate to the My Apps page
    And I click the "Create New App" button
    Then I should be redirected to "/my-apps/new"
    And I should see the app creation wizard
    # Step 1: Basic Info
    When I type "My Free Application" in the "App Name" field
    And I type "This is a comprehensive free application for developers" in the "Description" field
    And I click the "Next" button
    # Step 2: Requirements
    Then I should see the wizard step "Requirements"
    When I type "The app should support multiple users with authentication and data export features" in the "Requirements" field
    And I click the "Next" button
    # Step 3: Monetization
    Then I should see the wizard step "Monetization"
    When I select the "Free" monetization option
    And I click the "Next" button
    # Step 4: Review
    Then I should see the wizard step "Review"
    And the review should show app name "My Free Application"
    When I click the "Submit" button
    Then I should be redirected to "/my-apps"
    And I should see "My Free Application" text

  @slow @e2e
  Scenario: Complete app creation journey - Paid app
    When I navigate to the My Apps page
    And I click the "Create New App" button
    Then I should be redirected to "/my-apps/new"
    # Step 1: Basic Info
    When I type "Premium Photo Editor" in the "App Name" field
    And I type "Professional photo editing suite with AI-powered enhancements" in the "Description" field
    And I click the "Next" button
    # Step 2: Requirements
    When I type "Advanced image processing, filters, AI upscaling, batch processing" in the "Requirements" field
    And I click the "Next" button
    # Step 3: Monetization
    Then I should see the wizard step "Monetization"
    When I select the "Paid" monetization option
    Then I should see the price input field
    When I type "9.99" in the "Price" field
    And I click the "Next" button
    # Step 4: Review
    Then I should see the wizard step "Review"
    And the review should show app name "Premium Photo Editor"
    And I should see "9.99" text
    When I click the "Submit" button
    Then I should be redirected to "/my-apps"

  @slow @e2e
  Scenario: Complete app creation journey - Subscription app
    When I navigate to the My Apps page
    And I click the "Create New App" button
    # Step 1: Basic Info
    When I type "Cloud Storage Pro" in the "App Name" field
    And I type "Unlimited cloud storage with automatic backup and sync" in the "Description" field
    And I click the "Next" button
    # Step 2: Requirements
    When I type "File sync, automatic backup, cross-platform support, sharing" in the "Requirements" field
    And I click the "Next" button
    # Step 3: Monetization
    When I select the "Subscription" monetization option
    Then I should see the subscription pricing options
    And I click the "Next" button
    # Step 4: Review and Submit
    Then I should see the wizard step "Review"
    When I click the "Submit" button
    Then I should be redirected to "/my-apps"

  # Navigation and Edit Flow Tests
  @fast
  Scenario: Edit app details from review step
    Given I navigate to the app creation wizard
    And I complete all wizard steps with name "Test App" and description "Test description for the app"
    Then I should see the wizard step "Review"
    When I click the edit button for "Basic Info"
    Then I should see the wizard step "Basic Info"
    And the "App Name" field should contain "Test App"
    When I type "Updated Test App" in the "App Name" field
    And I click the "Next" button
    And I click the "Next" button
    And I click the "Next" button
    Then the review should show app name "Updated Test App"

  @fast
  Scenario: Navigate back through wizard steps
    Given I navigate to the app creation wizard
    And I complete step 1 with valid data
    Then I should see the wizard step "Requirements"
    When I click the "Back" button
    Then I should see the wizard step "Basic Info"
    And the form data should be preserved

  @fast
  Scenario: Progress bar updates correctly
    Given I navigate to the app creation wizard
    Then the progress bar should show 25%
    When I complete step 1 with valid data
    Then the progress bar should show 50%
    When I type "Some requirements text for the application" in the "Requirements" field
    And I click the "Next" button
    Then the progress bar should show 75%
    When I select the "Free" monetization option
    And I click the "Next" button
    Then the progress bar should show 100%

  # Draft Persistence Tests
  @fast
  Scenario: Draft is auto-saved during creation
    Given I navigate to the app creation wizard
    When I type "Draft Test App" in the "App Name" field
    And I wait for 2 seconds
    Then the draft should be saved to localStorage
    And the draft indicator should show "Draft saved"

  @fast
  Scenario: Draft is restored on page reload
    Given I navigate to the app creation wizard
    And I complete step 1 with name "Persisted App" and description "This description should persist"
    When I reload the page
    Then the "App Name" field should contain "Persisted App"
    And the "Description" field should contain "This description should persist"

  @fast
  Scenario: Draft is cleared after successful submission
    Given I navigate to the app creation wizard
    And I complete all wizard steps with valid data
    When I click the "Submit" button
    Then the draft should be removed from localStorage

  # Validation Edge Cases
  @fast
  Scenario: Cannot skip required steps
    Given I navigate to the app creation wizard
    When I try to navigate directly to step 3
    Then I should be redirected back to step 1

  @fast
  Scenario: Maximum character limit for description
    Given I navigate to the app creation wizard
    When I type a description longer than 500 characters
    Then I should see the character count warning
    And characters over the limit should be truncated

  # Cancel and Exit Tests
  @fast
  Scenario: Cancel button shows confirmation dialog
    Given I navigate to the app creation wizard
    And I type "Unsaved App" in the "App Name" field
    When I click the "Cancel" button
    Then I should see the unsaved changes confirmation dialog
    And I should see "Discard changes?" text

  @fast
  Scenario: Confirm cancel discards draft and redirects
    Given I navigate to the app creation wizard
    And I type "App To Discard" in the "App Name" field
    When I click the "Cancel" button
    And I confirm discarding changes
    Then I should be redirected to "/my-apps"
    And the draft should be removed from localStorage

  @fast
  Scenario: Dismiss cancel returns to wizard
    Given I navigate to the app creation wizard
    And I type "App To Keep" in the "App Name" field
    When I click the "Cancel" button
    And I click "Keep Editing"
    Then I should remain on the wizard
    And the "App Name" field should contain "App To Keep"

  # Error Handling
  @requires-db
  Scenario: Handle submission error gracefully
    Given I navigate to the app creation wizard
    And I complete all wizard steps with valid data
    And the server will return a submission error
    When I click the "Submit" button
    Then I should see an error message
    And I should remain on the review step
    And the form data should be preserved

  # Accessibility Tests
  @fast @accessibility
  Scenario: Wizard is keyboard navigable
    Given I navigate to the app creation wizard
    Then I should be able to tab through form fields
    And the focused field should have a visible focus indicator
    When I press Enter on the "Next" button
    Then I should advance to the next step

  @fast @accessibility
  Scenario: Form fields have proper labels
    Given I navigate to the app creation wizard
    Then all form fields should have associated labels
    And required fields should be indicated with aria-required

  # Multi-user Isolation
  @requires-db
  Scenario: User can only see their own created apps
    Given I am logged in as "Alice Creator" with email "alice@example.com"
    And I create an app named "Alice's App"
    When I log out and log in as "Bob Creator" with email "bob@example.com"
    And I navigate to the My Apps page
    Then I should not see "Alice's App" text
    And I should see the empty state message
