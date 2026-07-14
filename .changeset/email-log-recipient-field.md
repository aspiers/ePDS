---
'ePDS': minor
---

Email delivery logs use a consistent recipient field.

**Affects:** Operators

**Operators:** All four email delivery paths now log the recipient as `email`: client-branded OTP, standard sign-in OTP, welcome OTP, and backup-email verification. Update structured-log queries for `Sent client-branded OTP email` to read `email` instead of `to`.
