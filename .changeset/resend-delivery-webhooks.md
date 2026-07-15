---
'ePDS': minor
---

Optional delivery-event logging for operators who choose the third-party Resend service to send email; ePDS continues to support other email providers.

**Affects:** Operators

**Operators:** ePDS remains compatible with any SMTP provider and does not require Resend. Operators who already use Resend can opt in by registering `https://<AUTH_HOSTNAME>/webhooks/resend` for the documented email events and setting `RESEND_WEBHOOK_SECRET`; the route then verifies each webhook and emits structured delivery logs without persisting webhook data.
