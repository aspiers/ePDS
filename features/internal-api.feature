Feature: Internal service-to-service API
  ePDS splits the PDS into two services that communicate via internal
  HTTP endpoints protected by a shared secret. The client-side calling
  logic is unit-tested. These E2E scenarios test the server-side endpoints
  directly.

  Background:
    Given the ePDS test environment is running
    And the internal API is accessible (e.g. via Docker network)

  Scenario: Account lookup by email returns DID
    Given "alice@example.com" has a PDS account with DID "did:plc:alice"
    When GET /_internal/account-by-email?email=alice@example.com is called with valid x-internal-secret
    Then the response is 200 with { "did": "did:plc:alice" }

  Scenario: Account lookup by email returns null for unknown email
    When GET /_internal/account-by-email?email=unknown@example.com is called with valid x-internal-secret
    Then the response is 200 with { "did": null }

  Scenario: Handle resolution returns email
    Given a PDS account with handle "alice.pds.test" and email "alice@example.com"
    When GET /_internal/account-by-handle?handle=alice.pds.test is called with valid x-internal-secret
    Then the response is 200 with { "email": "alice@example.com" }

  Scenario: PAR login hint retrieval
    Given an OAuth client submitted a PAR request with login_hint "alice.pds.test"
    When GET /_internal/par-login-hint?request_uri=<the-request-uri> is called with valid x-internal-secret
    Then the response is 200 with { "login_hint": "alice.pds.test" }

  Scenario: Missing internal secret returns 401
    When any /_internal/* endpoint is called without the x-internal-secret header
    Then the response status is 401

  Scenario: Wrong internal secret returns 401
    When any /_internal/* endpoint is called with an incorrect x-internal-secret
    Then the response status is 401
