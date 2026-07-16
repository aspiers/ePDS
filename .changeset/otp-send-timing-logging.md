---
'ePDS': minor
---

OTP send logs now record how long the email handoff took, the provider's message ID, and the SMTP server response.

**Affects:** Operators

**Operators:** every OTP email completion line (all four paths — client-branded, sign-in, welcome, backup-email verification) now carries `elapsedMs`, `messageId`, and `smtpResponse` alongside `email`. `messageId` lets these logs be joined to Resend delivery events; `elapsedMs` isolates a slow SMTP handoff from other causes of late-arriving codes. Failed sends log `elapsedMs` too, on the existing `better-auth: failed to send OTP email` error line.
