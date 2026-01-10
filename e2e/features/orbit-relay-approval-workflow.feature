@relay @orbit @approval-workflow
Feature: Relay Approval Workflow
  As a workspace member
  I want to manage the draft approval workflow
  So that I can ensure quality control before sending responses

  Background:
    Given I am logged in as a workspace member
    And the workspace has an active brand profile
    And there is a draft with status "PENDING"

  # ============================================
  # Draft Approval Actions
  # ============================================

  @smoke
  Scenario: Approve a pending draft
    When I approve the draft
    Then the draft status should be "APPROVED"
    And the reviewedById should be my user ID
    And the reviewedAt timestamp should be set
    And an audit log entry should be created with action "APPROVED"

  @smoke
  Scenario: Reject a pending draft with reason
    When I reject the draft with reason "Tone is too casual for our brand"
    Then the draft status should be "REJECTED"
    And an audit log entry should be created with action "REJECTED"
    And the audit log should contain the rejection reason

  Scenario: Cannot approve an already approved draft
    Given the draft status is "APPROVED"
    When I try to approve the draft
    Then I should receive an error "Cannot approve draft with status APPROVED"

  Scenario: Cannot reject an already rejected draft
    Given the draft status is "REJECTED"
    When I try to reject the draft
    Then I should receive an error "Cannot reject draft with status REJECTED"

  # ============================================
  # Draft Editing
  # ============================================

  @smoke
  Scenario: Edit a pending draft
    Given a draft with content "Thank you for your feedback!"
    When I edit the draft to "Thanks for reaching out! We appreciate your feedback."
    Then the draft content should be updated
    And an edit history record should be created
    And the edit type should be classified
    And an audit log entry should be created with action "EDITED"

  Scenario: Edit classifies minor tweaks correctly
    Given a draft with content "Hello world!"
    When I edit the draft to "Hello world."
    Then the edit type should be "MINOR_TWEAK"

  Scenario: Edit classifies complete rewrites correctly
    Given a draft with content "Hello world!"
    When I edit the draft to "Completely different text that has nothing in common with the original message at all"
    Then the edit type should be "COMPLETE_REWRITE"

  Scenario: Edit classifies hashtag changes as platform formatting
    Given a draft with content "Check this out!"
    When I edit the draft to "Check this out! #awesome"
    Then the edit type should be "PLATFORM_FORMATTING"

  Scenario: Cannot edit an approved draft
    Given the draft status is "APPROVED"
    When I try to edit the draft
    Then I should receive an error "Cannot edit draft with status APPROVED"

  Scenario: View edit history
    Given a draft has been edited multiple times
    When I fetch the draft with history
    Then I should see all edit history records
    And each edit should show original and edited content
    And each edit should have an edit type

  # ============================================
  # Sending Drafts
  # ============================================

  Scenario: Mark approved draft as sent
    Given the draft status is "APPROVED"
    When I send the draft
    Then the draft status should be "SENT"
    And the sentAt timestamp should be set
    And the inbox item status should be "REPLIED"
    And an audit log entry should be created with action "SENT"

  Scenario: Cannot send a pending draft
    Given the draft status is "PENDING"
    When I try to send the draft
    Then I should receive an error "Cannot send draft with status PENDING"

  Scenario: Mark draft as failed
    Given the draft status is "APPROVED"
    When the sending fails with error "API rate limit exceeded"
    Then the draft status should be "FAILED"
    And the errorMessage should be set
    And an audit log entry should be created with action "SEND_FAILED"

  # ============================================
  # Audit Logging
  # ============================================

  @smoke
  Scenario: Complete audit trail for draft lifecycle
    Given a new draft is generated
    When I edit the draft
    And I approve the draft
    And I send the draft
    Then the audit log should contain entries for:
      | action    |
      | CREATED   |
      | EDITED    |
      | APPROVED  |
      | SENT      |
    And each audit log entry should have a timestamp
    And each audit log entry should have the performer's user ID

  Scenario: Audit logs include request metadata
    When I approve the draft from IP "192.168.1.1"
    Then the audit log should record the IP address
    And the audit log should record the user agent

  Scenario: Fetch audit logs for a specific draft
    Given a draft has multiple audit log entries
    When I fetch the audit logs
    Then I should see all audit entries in chronological order
    And each entry should include the performer's name and email

  # ============================================
  # Approval Settings
  # ============================================

  Scenario: Get default approval settings
    Given the workspace has no custom approval settings
    When I fetch the approval settings
    Then requireApproval should be true
    And approverRoles should include "OWNER" and "ADMIN"
    And autoApproveHighConfidence should be false

  Scenario: Update approval settings
    Given I am a workspace admin
    When I update approval settings with:
      | setting                   | value |
      | requireApproval           | false |
      | autoApproveHighConfidence | true  |
      | autoApproveThreshold      | 0.95  |
    Then the settings should be updated
    And the new settings should be returned

  Scenario: Only admins can update approval settings
    Given I am a regular workspace member
    When I try to update approval settings
    Then I should receive a 404 error
    And the error message should mention "insufficient permissions"

  Scenario: Validate autoApproveThreshold range
    When I try to set autoApproveThreshold to 1.5
    Then I should receive a validation error
    And the error should mention "must be between 0 and 1"

  # ============================================
  # Workflow Metrics
  # ============================================

  Scenario: Get workflow metrics
    Given there are drafts in various states
    When I fetch the workflow metrics
    Then I should see:
      | metric                   |
      | averageApprovalTime      |
      | approvalRate             |
      | rejectionRate            |
      | editBeforeApprovalRate   |
      | averageEditsPerDraft     |
      | sendSuccessRate          |

  Scenario: Get workflow metrics with date filter
    When I fetch metrics for the last 30 days
    Then the metrics should only include drafts from that period

  Scenario: Get aggregated edit feedback
    Given drafts have been edited with various edit types
    When I fetch the aggregated feedback
    Then I should see:
      | metric             |
      | totalEdits         |
      | editTypeBreakdown  |
      | averageEditDistance|
      | editRate           |

  # ============================================
  # ML Feedback Loop
  # ============================================

  Scenario: Edit history stores data for ML training
    When I edit a draft significantly
    Then the edit history should include:
      | field           |
      | originalContent |
      | editedContent   |
      | editType        |
      | editDistance    |
    And this data can be used for improving future generations

  Scenario: Get edit feedback data for ML
    Given multiple drafts have been edited
    When I fetch the edit feedback data
    Then I should get structured data including:
      | field                    |
      | originalContent          |
      | editedContent            |
      | editType                 |
      | originalConfidenceScore  |
      | platform                 |
      | messageType              |

  # ============================================
  # Access Control
  # ============================================

  Scenario: Cannot access drafts from another workspace
    Given I am a member of workspace A
    And there is a draft in workspace B
    When I try to approve that draft
    Then I should receive a 404 error

  Scenario: Multiple team members can approve drafts
    Given I am a workspace admin
    And another admin generated the draft
    When I approve the draft
    Then the approval should succeed
    And my user ID should be recorded as the reviewer

  # ============================================
  # Error Handling
  # ============================================

  Scenario: Handle unauthorized access
    Given I am not logged in
    When I try to approve a draft
    Then I should receive a 401 error

  Scenario: Handle draft not found
    When I try to approve a non-existent draft
    Then I should receive a 404 error
    And the error message should be "Draft not found"

  Scenario: Handle missing required fields
    When I try to reject a draft without a reason
    Then I should receive a 400 error
    And the error message should mention "reason is required"
