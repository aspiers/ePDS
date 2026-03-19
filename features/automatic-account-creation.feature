Feature: Automatic account creation on first login
  When a user authenticates for the first time (no existing PDS account
  for their email), ePDS automatically creates a PDS account. The user
  never needs to choose a handle or password.

  Handle generation and crypto primitives are unit-tested. These scenarios
  test the observable end-to-end behavior.

  Background:
    Given the ePDS test environment is running
    And a demo OAuth client is registered

  Scenario: First-time user gets an auto-created PDS account
    Given no PDS account exists for "newuser@example.com"
    When "newuser@example.com" authenticates via the demo client
    Then the demo client receives a valid OAuth access token
    And the access token can be used to call com.atproto.server.getSession
    And the response contains a DID and a handle matching *.pds.test

  Scenario: Auto-created handle is a random subdomain
    Given "newuser@example.com" just had an account auto-created
    When the account handle is inspected via com.atproto.server.getSession
    Then the handle is a short alphanumeric subdomain of the PDS domain
    And the handle subdomain resolves via HTTPS (TLS certificate provisioned)

  Scenario: Auto-created account has a working AT Protocol repo
    Given "newuser@example.com" has an auto-created PDS account
    When the user creates a record via com.atproto.repo.createRecord
    Then the record is created successfully
    And it can be retrieved via com.atproto.repo.getRecord

  Scenario: Password-based login does not work for auto-created accounts
    Given "newuser@example.com" has an auto-created PDS account
    When someone attempts com.atproto.server.createSession with any password
    Then authentication fails
    And the only way to authenticate is through the ePDS OAuth flow
