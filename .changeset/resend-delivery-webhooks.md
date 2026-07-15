---
'ePDS': minor
---

Optional delivery event logs for operators who send email through Resend.

**Affects:** Operators

**Operators:** ePDS remains compatible with any SMTP provider and does not require Resend. Operators who already use Resend can opt in by registering `https://<AUTH_HOSTNAME>/webhooks/resend` for the documented email events and setting `RESEND_WEBHOOK_SECRET`; the route then verifies each webhook and emits structured delivery logs without persisting webhook data.
