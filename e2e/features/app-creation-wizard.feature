Feature: App Creation Wizard
  As an authenticated user
  I want to create a new app through a multi-step wizard
  So that I can build my app with proper configuration

  Background:
    Given I am logged in as "Jane Developer" with email "jane@dev.com"
    And I navigate to the app creation wizard

  # Step 1 - Basic Info
  Scenario: Step 1 form fields are displayed
    Then I should see the wizard step "Basic Info"
    And I should see the "App Name" input field
    And I should see the "Description" textarea field
    And I should see the "Next" button

  Scenario: Progress bar shows 25% on Step 1
    Then the progress bar should show 25%
    And the progress text should say "Step 1 of 4"

  Scenario: Validation error for empty app name
    When I click the "Next" button
    Then I should see the error message "App name is required"
    And I should remain on step 1

  Scenario: Validation error for app name too short
    When I type "AB" in the "App Name" field
    And I click the "Next" button
    Then I should see the error message "App name must be at least 3 characters"
    And I should remain on step 1

  Scenario: Validation error for empty description
    When I type "My Awesome App" in the "App Name" field
    And I click the "Next" button
    Then I should see the error message "Description is required"
    And I should remain on step 1

  Scenario: Validation error for description too short
    When I type "My App" in the "App Name" field
    And I type "Short" in the "Description" field
    And I click the "Next" button
    Then I should see the error message "Description must be at least 10 characters"
    And I should remain on step 1

  Scenario: Next button disabled until valid data entered
    Then the "Next" button should be disabled
    When I type "My Test App" in the "App Name" field
    Then the "Next" button should be disabled
    When I type "This is a comprehensive description of my test app" in the "Description" field
    Then the "Next" button should be enabled

  Scenario: Successfully proceed to Step 2 with valid data
    When I type "My App" in the "App Name" field
    And I type "This is my app description that is long enough" in the "Description" field
    And I click the "Next" button
    Then I should see the wizard step "Requirements"
    And the progress bar should show 50%

  # Step 2 - Requirements
  Scenario: Step 2 form fields are displayed
    Given I complete step 1 with valid data
    Then I should see the wizard step "Requirements"
    And I should see the "Requirements" textarea field
    And I should see the "Back" button
    And I should see the "Next" button

  Scenario: Progress bar shows 50% on Step 2
    Given I complete step 1 with valid data
    Then the progress bar should show 50%
    And the progress text should say "Step 2 of 4"

  Scenario: Validation error for empty requirements
    Given I complete step 1 with valid data
    When I click the "Next" button
    Then I should see the error message "Requirements are required"
    And I should remain on step 2

  Scenario: Validation error for requirements too short
    Given I complete step 1 with valid data
    When I type "Short" in the "Requirements" field
    And I click the "Next" button
    Then I should see the error message "Requirements must be at least 20 characters"
    And I should remain on step 2

  Scenario: Back button preserves Step 1 data
    Given I complete step 1 with name "Test App" and description "Test Description Here"
    When I click the "Back" button
    Then I should see the wizard step "Basic Info"
    And the "App Name" field should contain "Test App"
    And the "Description" field should contain "Test Description Here"

  Scenario: Successfully proceed to Step 3 with valid requirements
    Given I complete step 1 with valid data
    When I type "The app should have user authentication and dashboard" in the "Requirements" field
    And I click the "Next" button
    Then I should see the wizard step "Monetization"
    And the progress bar should show 75%

  # Step 3 - Monetization
  Scenario: Step 3 monetization options are displayed
    Given I complete step 1 and 2 with valid data
    Then I should see the wizard step "Monetization"
    And I should see the "Free" monetization option
    And I should see the "Paid" monetization option
    And I should see the "Freemium" monetization option
    And I should see the "Subscription" monetization option
    And I should see the "Back" button
    And I should see the "Next" button

  Scenario: Progress bar shows 75% on Step 3
    Given I complete step 1 and 2 with valid data
    Then the progress bar should show 75%
    And the progress text should say "Step 3 of 4"

  Scenario: Select Free monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Free" monetization option
    Then the "Free" option should be selected
    And the "Next" button should be enabled

  Scenario: Select Paid monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Paid" monetization option
    Then the "Paid" option should be selected
    And I should see the price input field
    And the "Next" button should be enabled

  Scenario: Select Freemium monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Freemium" monetization option
    Then the "Freemium" option should be selected
    And the "Next" button should be enabled

  Scenario: Select Subscription monetization option
    Given I complete step 1 and 2 with valid data
    When I select the "Subscription" monetization option
    Then the "Subscription" option should be selected
    And I should see the price input field
    And the "Next" button should be enabled

  Scenario: Back button from Step 3 preserves previous data
    Given I complete step 1 and 2 with valid data
    When I click the "Back" button
    Then I should see the wizard step "Requirements"
    And the requirements data should be preserved

  Scenario: Successfully proceed to Step 4 Review
    Given I complete step 1 and 2 with valid data
    When I select the "Free" monetization option
    And I click the "Next" button
    Then I should see the wizard step "Review"
    And the progress bar should show 100%

  # Step 4 - Review
  Scenario: Review step displays all entered data
    Given I complete all wizard steps with valid data
    Then I should see the wizard step "Review"
    And I should see the review section "Basic Info"
    And I should see the review section "Requirements"
    And I should see the review section "Monetization"
    And I should see the "Submit" button

  Scenario: Review shows correct Basic Info
    Given I complete all wizard steps with name "My App" and description "App Description"
    Then the review should show app name "My App"
    And the review should show description "App Description"

  Scenario: Edit button navigates back to Basic Info
    Given I complete all wizard steps with valid data
    When I click the edit button for "Basic Info"
    Then I should see the wizard step "Basic Info"
    And the form data should be preserved

  Scenario: Edit button navigates back to Requirements
    Given I complete all wizard steps with valid data
    When I click the edit button for "Requirements"
    Then I should see the wizard step "Requirements"
    And the form data should be preserved

  Scenario: Edit button navigates back to Monetization
    Given I complete all wizard steps with valid data
    When I click the edit button for "Monetization"
    Then I should see the wizard step "Monetization"
    And the form data should be preserved

  Scenario: Submit button creates app and redirects
    Given I complete all wizard steps with valid data
    When I click the "Submit" button
    Then I should see a success message
    And I should be redirected to "/my-apps"
    And the new app should appear in my apps list

  Scenario: App is saved to localStorage after submit
    Given I complete all wizard steps with valid data
    When I click the "Submit" button
    Then the app should be saved in localStorage
    And the localStorage should contain the app data

  # Draft Auto-Save
  Scenario: Draft is saved to localStorage on Step 1 change
    When I type "Draft App" in the "App Name" field
    Then the draft should be saved to localStorage
    And the draft indicator should show "Draft saved"

  Scenario: Draft is saved when progressing between steps
    When I complete step 1 with name "Draft Test"
    And I navigate to step 2
    When I type "Draft requirements here for testing" in the "Requirements" field
    Then the draft should be saved to localStorage
    And the draft should contain step 1 and step 2 data

  Scenario: Draft is restored on page reload
    Given I complete step 1 with name "Restored App" and description "Will be restored"
    When I reload the page
    Then I should see the wizard step "Basic Info"
    And the "App Name" field should contain "Restored App"
    And the "Description" field should contain "Will be restored"

  Scenario: Draft is cleared after successful submission
    Given I complete all wizard steps with valid data
    When I click the "Submit" button
    Then the draft should be removed from localStorage
    And the draft indicator should not be visible

  Scenario: Multiple drafts do not interfere (isolation)
    Given I start creating an app as "User1" with name "User1 App"
    When I log out and log in as "User2"
    And I start creating an app with name "User2 App"
    Then the draft should only contain "User2 App"
    And the draft should not contain "User1 App"

  # Protected Route
  Scenario: Wizard redirects unauthenticated users
    Given I am not logged in
    When I navigate to the app creation wizard
    Then I should be redirected to the home page
    And I should see the login options
