---
'ePDS': minor
---

Email delivery logs use a consistent recipient field.

**Affects:** Operators

**Operators:** Update structured-log queries for `Sent client-branded OTP email` to read the recipient from `email` instead of `to`.
