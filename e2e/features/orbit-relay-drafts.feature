@relay @orbit @drafts
Feature: Relay Draft Generation
  As a workspace member
  I want to generate AI-powered response drafts for inbox items
  So that I can quickly respond to social media interactions

  Background:
    Given I am logged in as a workspace member
    And the workspace has an active brand profile
    And there is an inbox item from "John Doe" saying "I love your product! How much does it cost?"

  # ============================================
  # Draft Generation
  # NOTE: Not tagged as @smoke because this tests complex Orbit relay UI
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Generate response drafts for an inbox item
    When I request draft generation for the inbox item
    Then I should receive 3 draft options
    And each draft should have a confidence score
    And one draft should be marked as preferred
    And the drafts should be within the platform character limit

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Generate drafts with custom number of options
    When I request 5 drafts for the inbox item
    Then I should receive 5 draft options
    And each draft should have a unique approach

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Generate drafts with custom instructions
    When I request drafts with instruction "Include a discount code"
    Then the drafts should mention promotional content
    And the message analysis should reflect the instruction

  @skip
  # SKIP REASON: Previously used ambiguous urgency step - needs review after fix
  # TRACKING: See docs/SKIPPED_TESTS.md - E2E Category G
  Scenario: Generate drafts for different message types
    Given there is a complaint inbox item saying "This is terrible service!"
    When I request draft generation for the complaint
    Then the message analysis should show negative sentiment
    And the drafts should have an empathetic tone
    And the urgency should be "high"

  # ============================================
  # Brand Voice Integration
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Drafts align with brand voice settings
    Given the brand voice is set to formal and professional
    When I request draft generation
    Then the drafts should use formal language
    And the tone match alignment should be above 80%

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Drafts without brand profile use default tone
    Given the workspace has no brand profile
    When I request draft generation
    Then I should receive drafts with professional tone
    And the response should indicate no brand profile was used

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Drafts respect vocabulary rules
    Given the brand has "amazing" as a preferred term
    And the brand has "cheap" as a banned term
    When I request draft generation for a pricing question
    Then the drafts should not contain the word "cheap"

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Drafts respect guardrails
    Given the brand has a guardrail against mentioning competitors
    When I request draft generation for a comparison question
    Then the drafts should not mention competitor names

  # ============================================
  # Platform-Specific Formatting
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Twitter drafts respect 280 character limit
    Given the inbox item is from Twitter
    When I request draft generation
    Then all drafts should be 280 characters or less
    And the metadata should show character count

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: LinkedIn drafts can be longer
    Given the inbox item is from LinkedIn
    When I request draft generation
    Then drafts can be up to 3000 characters
    And the platform limit should be 3000

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Instagram drafts include hashtag suggestions
    Given the inbox item is from Instagram
    When I request draft generation
    Then the drafts may include hashtag suggestions
    And hashtags should be relevant to the conversation

  # ============================================
  # Message Analysis
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Analyze positive sentiment message
    Given the inbox item is "Your product changed my life! Thank you so much!"
    When I request draft generation
    Then the message analysis sentiment should be "positive"
    And the intent should be "praise"
    And hasComplaint should be false

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Analyze question intent
    Given the inbox item contains "How do I reset my password?"
    When I request draft generation
    Then the message analysis intent should be "question"
    And hasQuestion should be true
    And the urgency should be "medium"

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Detect escalation-worthy messages
    Given the inbox item is "I'm canceling my subscription unless this is fixed immediately!"
    When I request draft generation
    Then needsEscalation should be true
    And the urgency should be "high"

  # ============================================
  # Draft Management
  # NOTE: Not tagged as @smoke because this tests complex Orbit relay UI
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Retrieve drafts for an inbox item
    Given drafts have been generated for the inbox item
    When I fetch the drafts
    Then I should see all generated drafts
    And the preferred draft should be listed first
    And drafts should be ordered by confidence score

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Approve a draft
    Given there is a draft with status "PENDING"
    When I approve the draft
    Then the draft status should be "APPROVED"
    And the reviewedById should be my user ID
    And the reviewedAt timestamp should be set

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Reject a draft
    Given there is a draft with status "PENDING"
    When I reject the draft
    Then the draft status should be "REJECTED"
    And I should be able to generate new drafts

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Get single draft details
    Given there is a draft for the inbox item
    When I fetch the draft by ID
    Then I should see the full draft content
    And I should see the inbox item details
    And I should see the reviewer information if reviewed

  # ============================================
  # Regeneration
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Regenerate drafts with feedback
    Given drafts have been generated but none are satisfactory
    When I regenerate drafts with feedback "Make it more casual"
    Then new drafts should be generated
    And the new drafts should incorporate the feedback
    And the tone should be more casual

  # ============================================
  # Error Handling
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle unauthorized access
    Given the Orbit API returns 401 Unauthorized
    When I request draft generation
    Then I should receive a 401 error
    And the error message should be "Unauthorized"

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle workspace not found
    Given I request drafts for a non-existent workspace
    Then I should receive a 404 error
    And the error message should mention workspace

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle inbox item not found
    When I request drafts for a non-existent inbox item
    Then I should receive a 404 error
    And the error message should be "Inbox item not found"

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Handle AI service failure gracefully
    Given the AI service is unavailable
    When I request draft generation
    Then I should receive a 500 error
    And the error message should indicate generation failure

  # ============================================
  # Inbox Status Updates
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Inbox status updates after draft generation
    Given the inbox item status is "UNREAD"
    When drafts are successfully generated
    Then the inbox item status should be "PENDING_REPLY"

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Inbox status updates after sending reply
    Given a draft has been approved
    When the draft is marked as sent
    Then the draft status should be "SENT"
    And the inbox item status should be updated to "REPLIED"

  # ============================================
  # Access Control
  # ============================================

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Cannot access drafts from another workspace
    Given I am a member of workspace A
    And there is an inbox item in workspace B
    When I try to generate drafts for that inbox item
    Then I should receive a 404 error
    And access should be denied

  # SKIP REASON: failing - needs to investigate
  @skip
  Scenario: Multiple team members can access drafts
    Given I am a member of the workspace
    And another team member generated drafts
    When I fetch the drafts
    Then I should see all drafts
    And I should be able to approve or reject them
