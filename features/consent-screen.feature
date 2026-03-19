Feature: OAuth consent screen
  When an existing user logs into a new OAuth client for the first time,
  ePDS shows a consent screen asking for approval. New accounts skip
  consent (account creation implies consent). Consent decisions are
  remembered per client.

  Background:
    Given the ePDS test environment is running

  Scenario: Existing user sees consent screen for a new client
    Given "alice@example.com" has an existing PDS account
    And "alice@example.com" has never logged into the demo client
    When "alice@example.com" authenticates via OTP through the demo client
    Then a consent screen is displayed
    And it shows the demo client's name and requested permissions
    When the user clicks "Approve"
    Then the browser is redirected back to the demo client with a valid session

  Scenario: User denies consent
    Given "alice@example.com" has an existing PDS account
    When "alice@example.com" authenticates and reaches the consent screen
    And the user clicks "Deny"
    Then the browser is redirected back to the demo client
    And the demo client receives an "access_denied" error

  Scenario: Returning user skips consent for a previously-approved client
    Given "alice@example.com" has previously approved the demo client
    When "alice@example.com" authenticates again via the demo client
    Then no consent screen is shown
    And the browser is redirected directly to the demo client with a valid session

  Scenario: New user skips consent entirely
    Given no PDS account exists for "newuser@example.com"
    When "newuser@example.com" authenticates via OTP through the demo client
    Then no consent screen is shown (account creation implies consent)
    And a PDS account is created
    And the browser is redirected to the demo client with a valid session

  Scenario: Consent page shows client branding for trusted clients
    Given the demo client is listed in PDS_OAUTH_TRUSTED_CLIENTS
    And the demo client's metadata includes custom CSS
    When the consent screen is displayed
    Then the client's custom CSS is applied to the page
