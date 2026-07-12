---
'ePDS': patch
---

Failed sign-in code entries now show up in the server logs, split by reason and tagged with the account's email address.

**Affects:** Operators

**Operators:** the auth service now logs the sign-in code failures that the browser posts straight to `/api/auth/sign-in/email-otp`, which previously reached no log at all.

- Each failure is logged at `warn` (visible at the default `info` level, no `LOG_LEVEL` change needed) under the `auth:better-auth` logger name. The log message is self-contained and distinct per reason, so you can tell the failures apart at a glance without inspecting a separate field:
  - `OTP verification failed: code expired`
  - `OTP verification failed: invalid or unrecognized code`
  - `OTP verification failed: too many attempts, code invalidated`
- Each line carries three fields, ordered for debugging a specific failure: `email` (the account that failed), `statusCode` (`400`, or `403` for too-many-attempts), and `path` (the endpoint). In Railway's log view a line reads e.g. `[WARN] OTP verification failed: code expired email="user@example.com" statusCode=400 path="/sign-in/email-otp"`.
- Counting `code expired` vs `invalid or unrecognized code` over time separates users whose code genuinely lapsed (late email delivery) from users retyping a stale code, so a rise in `code expired` points at delivery delay rather than user error. Note that `invalid or unrecognized code` covers both a wrong code and no pending code for that email — the two are not distinguished.
- The same logging also covers the other OTP _verification_ endpoints (`/email-otp/check-verification-otp`, `/email-otp/verify-email`, `/email-otp/reset-password`); the `path` field identifies which one. The OTP _send_ endpoints (`/email-otp/send-verification-otp`, `/email-otp/request-password-reset`) are deliberately excluded — a failure there is not a verification failure. Only these verification endpoints are logged.
- Only 4xx errors are logged here; 3xx redirects are filtered out and 5xx errors are already logged by the framework, so this adds no duplicate 5xx noise.
