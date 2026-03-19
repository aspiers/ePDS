Feature: Security measures
  ePDS implements multiple layers of security. Unit tests cover the
  primitives (timing-safe comparison, HTML escaping, email masking).
  These E2E scenarios test the security behaviors observable via HTTP.

  Background:
    Given the ePDS test environment is running

  # --- CSRF protection ---

  Scenario: Forms include CSRF protection
    When the login page is loaded
    Then the response sets a CSRF cookie
    And the HTML form contains a hidden CSRF token field

  Scenario: POST without CSRF token is rejected
    When a POST request is sent to the OTP verification endpoint without a CSRF token
    Then the response status is 403

  # --- Rate limiting ---

  Scenario: Excessive requests from one IP are rate-limited
    When more than 60 requests are sent from the same IP within one minute
    Then subsequent requests receive a 429 Too Many Requests response
    And the response includes a Retry-After header

  Scenario: Excessive OTP requests for one email are throttled
    When OTP codes are requested for the same email many times in quick succession
    Then the rate limiter throttles further OTP sends for that email

  # --- Security headers ---

  Scenario: Auth service responses include security headers
    When any page is loaded from the auth service via Caddy
    Then the response includes:
      | header                    | value            |
      | Strict-Transport-Security | max-age=31536000 |
      | X-Frame-Options           | DENY             |
      | X-Content-Type-Options    | nosniff          |
      | Referrer-Policy           | no-referrer      |

  Scenario: Content-Security-Policy restricts inline content
    When the login page is loaded
    Then the Content-Security-Policy header is present
    And it does not allow unsafe-inline scripts

  # --- Monitoring ---

  Scenario: Health check endpoints are available
    When GET /health is called on the auth service
    Then it returns status 200 with { "status": "ok" }
    When GET /health is called on the PDS core
    Then it returns status 200 with { "status": "ok" }

  Scenario: Metrics endpoint requires authentication
    When GET /metrics is called on the auth service without credentials
    Then the response status is 401
    When GET /metrics is called with valid Basic auth credentials
    Then the response includes uptime and memory usage metrics

  # --- Email privacy ---

  Scenario: Displayed emails are masked on error/status pages
    When an email address is displayed on a server-rendered page
    Then it appears masked (e.g. "j***n@example.com")
    And the full email is not visible in the page source
