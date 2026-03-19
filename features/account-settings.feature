Feature: Account settings dashboard
  ePDS provides a self-service web dashboard at /account where authenticated
  users can manage their account: view their identity, change handle, manage
  backup emails, view/revoke sessions, and delete their account.

  Background:
    Given the ePDS test environment is running
    And "alice@example.com" has a PDS account

  # --- Authentication for settings ---

  Scenario: Unauthenticated user is redirected to login
    When a user navigates to https://auth.pds.test/account without a session
    Then the browser is redirected to /account/login

  Scenario: Account settings login uses standalone OTP
    When the user navigates to /account/login
    Then a login form is displayed (separate from the OAuth flow)
    When the user enters "alice@example.com" and verifies the OTP
    Then the browser is redirected to /account
    And the account settings dashboard is displayed

  # --- Account information ---

  Scenario: User views their account information
    Given "alice@example.com" is logged into account settings
    When they view the /account page
    Then the page displays their DID
    And the page displays their primary email (masked)
    And the page displays their current handle

  # --- Handle management ---

  Scenario: User changes their handle
    Given "alice@example.com" is logged into account settings
    And their current handle is a random subdomain like "a7b3x2.pds.test"
    When the user submits a new handle "alice"
    Then the handle is updated to "alice.pds.test"
    And the settings page reflects the new handle
    And https://alice.pds.test/.well-known/atproto-did returns alice's DID

  # --- Session management ---

  Scenario: User views and revokes a session
    Given "alice@example.com" is logged into account settings
    And has at least one other active session
    When the user views the sessions section
    Then active sessions are listed
    When the user revokes another session
    Then that session is no longer listed

  # --- Account deletion ---

  Scenario: User deletes their account
    Given "alice@example.com" is logged into account settings
    When the user initiates account deletion and confirms
    Then the browser is redirected away from /account (signed out)
    And the PDS account for "alice@example.com" no longer exists
    And com.atproto.server.getSession fails for alice's DID
