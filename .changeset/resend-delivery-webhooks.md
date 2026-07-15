---
'ePDS': minor
---

Resend delivery events can now be measured against the sign-in code lifetime.

**Affects:** Operators

**Operators:** Register `https://<AUTH_HOSTNAME>/webhooks/resend` for the `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, and `email.failed` events, then set `RESEND_WEBHOOK_SECRET` to the endpoint's `whsec_...` signing secret. Delivery counts and latency statistics are exposed under `resendDelivery` in the authenticated `/metrics` response; the receiver remains disabled when the secret is unset.
