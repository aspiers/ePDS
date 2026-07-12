---
'ePDS': patch
---

Failed one-time code attempts now appear in the server logs, split by reason and tagged with the account's email.

**Affects:** Operators

**Operators:** failed OTP verifications are now logged under the `auth:better-auth` logger.

- Each line carries an `email`, `statusCode`, and `path` field, and names the reason: `code expired`, `invalid or unrecognized code`, or `too many attempts, code invalidated`.
- Routine failures (expired / invalid) log at `info`; too-many-attempts logs at `warn`.
- All are visible at the default `info` level — no `LOG_LEVEL` change needed.
