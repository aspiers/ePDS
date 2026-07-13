---
'ePDS': patch
---

Signing in through the demo no longer silently fails if you take a while to enter your emailed code.

**Affects:** End users, Operators

**End users:** If you requested a sign-in code, then took several minutes to fetch it from your email before entering it, the demo could fail at the last step with a generic "Authentication failed" message — even though your code was correct. That happened because the demo started its 10-minute sign-in timer before it sent the code, so it could forget the sign-in while a later-issued code was still valid. The demo now remembers your sign-in for up to an hour, and if it genuinely does time out you now see "Your sign-in took too long to finish. Please sign in again." instead of a message that made it look like you typed the code wrong.

**Operators:** The demo client's `oauth_state` cookie `maxAge` is raised from `600` (10 min) to `60 * 60` (1 hour), matching the auth service's `auth_flow` row TTL. Previously, the cookie's timer started when the OAuth flow began, while the OTP's 600-second validity started only when the code was issued, so the cookie could expire first. The OAuth callback now maps a missing/expired state cookie to `/?error=session_expired` rather than `/?error=auth_failed`; `session_expired` renders as "Your sign-in took too long to finish. Please sign in again."
