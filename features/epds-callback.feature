Feature: ePDS callback — the core integration bridge
  The /oauth/epds-callback endpoint on pds-core receives HMAC-signed
  redirects from the auth service after identity verification. It resolves
  or creates the PDS account and issues an OAuth authorization code.

  HMAC signature verification, timestamp validation, and tamper detection
  are covered by unit tests in crypto.test.ts. These E2E scenarios focus
  on the end-to-end flow through the callback.

  Background:
    Given the ePDS test environment is running
    And a demo OAuth client is registered

  Scenario: Successful callback for a new user creates an account and completes OAuth
    Given no PDS account exists for "newuser@example.com"
    When the user completes OTP authentication as "newuser@example.com"
    Then the auth service redirects to /oauth/epds-callback with a signed URL
    And the PDS creates a new account
    And the browser is redirected back to the demo client with an authorization code
    And the demo client exchanges the code for an access token

  Scenario: Successful callback for an existing user completes OAuth
    Given "existing@example.com" has a PDS account
    When the user completes OTP authentication as "existing@example.com"
    Then the auth service redirects to /oauth/epds-callback
    And the browser is redirected back to the demo client with an authorization code

  Scenario: Tampered callback URL is rejected
    When a request arrives at /oauth/epds-callback with a modified email parameter
    Then the PDS rejects the request (signature mismatch)
    And an error is returned to the client

  Scenario: Expired callback URL is rejected
    When a request arrives at /oauth/epds-callback with a timestamp older than 5 minutes
    Then the PDS rejects the request (expired signature)
    And an error is returned to the client

  Scenario: Denied consent results in access_denied error
    Given an existing user denies consent on the consent screen
    Then the callback arrives with approved="0"
    And the demo client receives an "access_denied" error
