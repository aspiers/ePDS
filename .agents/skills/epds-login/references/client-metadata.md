# Client Metadata Reference

Your app must host a JSON document at a publicly accessible HTTPS URL.
This URL is also your `client_id`. ePDS fetches it to validate your app
and the auth service uses it for branding (name, logo, email templates).

## Minimal example

```json
{
  "client_id": "https://yourapp.example.com/client-metadata.json",
  "client_name": "Your App Name",
  "redirect_uris": ["https://yourapp.example.com/api/oauth/callback"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "dpop_bound_access_tokens": true
}
```

## All supported fields

| Field                        | Required | Description                                                       |
| ---------------------------- | -------- | ----------------------------------------------------------------- |
| `client_id`                  | Yes      | Must match the URL where this file is hosted                      |
| `client_name`                | Yes      | Shown on the login page and in OTP emails                         |
| `redirect_uris`              | Yes      | Array of allowed callback URLs after login                        |
| `scope`                      | Yes      | Always `"atproto transition:generic"`                             |
| `grant_types`                | Yes      | Always `["authorization_code", "refresh_token"]`                  |
| `response_types`             | Yes      | Always `["code"]`                                                 |
| `token_endpoint_auth_method` | Yes      | Always `"none"` (public client)                                   |
| `dpop_bound_access_tokens`   | Yes      | Always `true`                                                     |
| `client_uri`                 | No       | Your app's homepage URL                                           |
| `logo_uri`                   | No       | URL to your app logo (shown on login page)                        |
| `email_template_uri`         | No       | URL to a custom OTP email HTML template                           |
| `email_subject_template`     | No       | Custom email subject line with `{{code}}` placeholder             |
| `brand_color`                | No       | Hex colour for buttons and input focus rings (default: `#1A130F`) |
| `background_color`           | No       | Hex colour for the login page background (default: `#F2EBE4`)     |

## Custom email templates

If you provide `email_template_uri`, the auth service fetches that URL and
uses it as the OTP email body instead of the default Certified template.

Your template must be an HTML file. Supported placeholders:

| Placeholder                           | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `{{code}}`                            | The 8-digit OTP code — **required**       |
| `{{app_name}}`                        | Value of `client_name` from your metadata |
| `{{logo_uri}}`                        | Value of `logo_uri` from your metadata    |
| `{{#is_new_user}}...{{/is_new_user}}` | Block shown only on first sign-up         |
| `{{^is_new_user}}...{{/is_new_user}}` | Block shown only on subsequent sign-ins   |

Minimal template example:

```html
<!DOCTYPE html>
<html>
  <body>
    <p>Your {{app_name}} sign-in code is:</p>
    <h1>{{code}}</h1>
    {{#is_new_user}}
    <p>Welcome! Your account has been created.</p>
    {{/is_new_user}}
  </body>
</html>
```

`email_subject_template` follows the same placeholder syntax:

```
"email_subject_template": "{{code}} — Your {{app_name}} sign-in code"
```

## Local development

During local development you can use `http://localhost` client IDs. The
`client_id` must still be a reachable URL — ePDS fetches it at runtime.
Use a local server or `ngrok` to expose your metadata endpoint.
