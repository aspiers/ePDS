---
'ePDS': minor
---

Optional email-event logging for operators who choose the third-party Resend service to send email; ePDS continues to support other email providers.

**Affects:** Operators

**Operators:** ePDS remains compatible with any SMTP provider and does not require Resend. Operators who already use Resend can opt in by registering `https://<AUTH_HOSTNAME>/webhooks/resend` for the documented email events and setting `RESEND_WEBHOOK_SECRET`; logs include delivery, open, complaint, suppression, and scheduling events. The route verifies each webhook, logs only events whose sender exactly matches `SMTP_FROM`, acknowledges unsupported click and inbound events without logging their payloads, and does not persist webhook data.
