Feature: Smoke Tests
  As a tester
  I want to verify all main pages load correctly
  So that I can ensure the application is deployable

  @fast
  Scenario: Home page loads
    When I visit "/"
    Then the page should load successfully
    And I should see the navigation bar

  @fast
  Scenario: Pricing page loads
    When I visit "/pricing"
    Then the page should load successfully
    And I should see "Pricing" heading

  @fast
  Scenario: Terms page loads
    When I visit "/terms"
    Then the page should load successfully
    And I should see "Terms of Service" heading

  @fast
  Scenario: Privacy page loads
    When I visit "/privacy"
    Then the page should load successfully
    And I should see "Privacy Policy" heading

  @fast
  Scenario: Sign in page loads
    When I visit "/auth/signin"
    Then the page should load successfully
    And I should see "Sign In" or "Sign in" text

  @fast @requires-db
  Scenario: Enhance page loads for authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/apps/pixel"
    Then the page should load successfully
    And I should see "AI Image Enhancement" heading

  @fast @requires-db
  Scenario: Settings page loads for authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/settings"
    Then the page should load successfully
    And I should see "Settings" heading

  @fast @requires-db
  Scenario: Profile page loads for authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/profile"
    Then the page should load successfully
    And I should see "Profile" heading

  @fast @requires-db
  Scenario: My Apps page loads for authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/my-apps"
    Then the page should load successfully
    And I should see "My Apps" heading

  @fast @requires-db
  Scenario: Referrals page loads for authenticated user
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/referrals"
    Then the page should load successfully
    And I should see "Referral Program" or "Referrals" heading

  @fast @requires-db
  Scenario: Admin dashboard loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin"
    Then the page should load successfully
    And I should see admin dashboard content

  @fast @requires-db
  Scenario: Admin analytics page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/analytics"
    Then the page should load successfully

  @fast @requires-db
  Scenario: Admin tokens page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/tokens"
    Then the page should load successfully

  @fast @requires-db
  Scenario: Admin system page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/system"
    Then the page should load successfully

  @fast @requires-db
  Scenario: Admin users page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/users"
    Then the page should load successfully

  @fast @requires-db
  Scenario: Admin vouchers page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/vouchers"
    Then the page should load successfully

  @fast @requires-db
  Scenario: Admin photos page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/photos"
    Then the page should load successfully
    And I should see "Photo Gallery" heading

  @fast @requires-db
  Scenario: Admin gallery page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/gallery"
    Then the page should load successfully
    And I should see "Featured Gallery" heading

  @fast @requires-db
  Scenario: Admin feedback page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/feedback"
    Then the page should load successfully
    And I should see "Feedback Management" heading

  @fast @requires-db
  Scenario: Admin emails page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/emails"
    Then the page should load successfully
    And I should see "Email Logs" heading

  @fast @requires-db
  Scenario: Admin sitemap page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/sitemap"
    Then the page should load successfully
    And I should see "Application Monitor" heading

  @fast @requires-db
  Scenario: Admin jobs page loads for admin user
    Given I am logged in as "Admin User" with email "admin@example.com"
    And the user is an admin
    When I visit "/admin/jobs"
    Then the page should load successfully
    And I should see "Jobs Management" heading

  @fast
  Scenario: Pixel landing page loads for unauthenticated user
    Given I am not logged in
    When I visit "/pixel"
    Then the page should load successfully
    And I should see "Your photos deserve better" text

  @fast
  Scenario: Unauthenticated user redirected from Pixel app
    Given I am not logged in
    When I visit "/apps/pixel"
    Then I should be redirected to sign-in page

  @fast
  Scenario: Unauthenticated user redirected from settings page
    Given I am not logged in
    When I visit "/settings"
    Then I should be redirected to sign-in page

  @fast
  Scenario: Unauthenticated user redirected from my-apps page
    Given I am not logged in
    When I visit "/my-apps"
    Then I should be redirected to sign-in page

  @fast
  Scenario: Unauthenticated user redirected from admin page
    Given I am not logged in
    When I visit "/admin"
    Then I should be redirected to sign-in page

  @fast
  Scenario: Non-admin user cannot access admin pages
    Given I am logged in as "Test User" with email "test@example.com"
    And the user is not an admin
    When I visit "/admin"
    Then I should be redirected or see access denied

  @fast
  Scenario: 404 page loads for invalid route
    When I visit "/this-page-does-not-exist"
    Then I should see a 404 or not found page

  @fast
  Scenario: Navigation links are present on home page
    When I visit "/"
    Then I should see navigation links for:
      | Link      |
      | Pixel     |

  @fast @requires-db
  Scenario: Authenticated user sees logout option
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit "/"
    Then I should see "Sign Out" or "Logout" option

  @fast
  Scenario: Footer links load correctly
    When I visit "/"
    Then I should see footer links for:
      | Link          |
      | Terms         |
      | Privacy       |

  @fast @requires-db
  Scenario: All main pages have proper page titles
    Given I am logged in as "Test User" with email "test@example.com"
    When I visit each main page
    Then each page should have a proper HTML title

  # Root Layout Tests
  @fast
  Scenario: Root layout applies dark theme
    When I visit "/"
    Then the page should load successfully
    And the page should have dark theme applied

  @fast
  Scenario: Root layout renders with correct HTML structure
    When I visit "/"
    Then the page should load successfully
    And the page should have proper HTML lang attribute
    And the page should have a main content area

  @fast
  Scenario: Root layout loads required fonts
    When I visit "/"
    Then the page should load successfully
    And the page should load custom fonts

  @fast
  Scenario: Cookies page displays full cookie policy
    When I visit "/cookies"
    Then the page should load successfully
    And I should see "Cookie Policy" heading
    And I should see "Essential Cookies" text
    And I should see "Analytics Cookies" text

  @fast
  Scenario: Terms page displays table of contents
    When I visit "/terms"
    Then the page should load successfully
    And I should see "Terms of Service" heading
    And I should see "Table of Contents" text

  @fast
  Scenario: Privacy page displays data collection info
    When I visit "/privacy"
    Then the page should load successfully
    And I should see "Privacy Policy" heading
    And I should see "Data Collection" text
