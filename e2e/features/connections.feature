Feature: Orbit Connections and Reminders

  Background:
    Given I am logged in to Orbit
    And I am in a workspace

  Scenario: Managing Connections
    When I navigate to the Connections page
    Then I should see the connections list header
    
    When I create a new connection "John Doe"
    Then I should see "John Doe" in the list
    
    When I click on "John Doe" connection
    Then I should see the connection details for "John Doe"
    
    When I update the meetup status to "INTERESTED"
    Then I should see the status "INTERESTED" on the page

  Scenario: Managing Reminders
    Given I have a connection "Jane Doe"
    When I navigate to the Reminders page
    Then I should see the reminders list header
    
    When I create a reminder "Call Jane" for "Jane Doe" due tomorrow
    Then I should see "Call Jane" in the upcoming reminders
    
    When I snooze the reminder "Call Jane" for 1 hour
    Then the reminder "Call Jane" should be snoozed
    
    When I complete the reminder "Call Jane"
    Then the reminder "Call Jane" should be marked as completed
