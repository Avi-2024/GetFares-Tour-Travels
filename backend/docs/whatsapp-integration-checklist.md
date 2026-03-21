# WhatsApp Integration Checklist

This project uses **Meta WhatsApp Cloud API** via:
- Outbound API: `POST /api/whatsapp/send` and `POST /api/whatsapp/send-template`
- Inbound webhook: `GET/POST /webhook/whatsapp`
- Event-driven sends: lead welcome, follow-up, quotation, booking reminders

## 1) Meta Dashboard Setup (as shown in images)

1. Open your Meta app and enable **WhatsApp Business Platform**.
2. In **API Setup**, copy:
- `Phone Number ID`
- `Temporary/Permanent Access Token`
- `WhatsApp Business Account ID` (optional for record keeping)
3. In **Configuration**, set webhook:
- `Callback URL`: `https://<your-domain>/webhook/whatsapp`
- `Verify token`: same value as your backend verify token
4. Subscribe webhook fields (minimum):
- `messages`
- `message_status`

## 2) Backend Environment Variables

Set these in `backend/.env`:

Required:
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN` (or `META_VERIFY_TOKEN`)

Recommended:
- `WHATSAPP_API_VERSION` (example: `v20.0` or your active Graph version)
- `WHATSAPP_TEMPLATE_LEAD_WELCOME`
- `WHATSAPP_TEMPLATE_LEAD_FOLLOWUP`
- `WHATSAPP_TEMPLATE_QUOTATION`
- `WHATSAPP_TEMPLATE_QUOTATION_REMINDER`
- `WHATSAPP_TEMPLATE_PRE_TRAVEL`
- `WHATSAPP_TEMPLATE_POST_TRAVEL`

Notes:
- Backend now supports fallback:
  - Verify token: `WHATSAPP_VERIFY_TOKEN` -> `META_VERIFY_TOKEN`
  - Access token: `WHATSAPP_ACCESS_TOKEN` -> `META_ACCESS_TOKEN`

## 3) API Readiness Check

Use:
- `GET /api/whatsapp/config-status` (auth required)

It returns `ready`, `checks`, and `missing` keys so you can immediately see what is not configured.

## 4) Quick Test Flow

1. Verify webhook in browser:
- `GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=12345`
2. Send test text:
- `POST /api/whatsapp/send`
3. Send template:
- `POST /api/whatsapp/send-template`
4. Create a lead and follow-up to confirm event-driven sends.

## 5) Security Requirements

1. Never commit real access tokens to git.
2. Rotate any token that was exposed in screen recordings/screenshots.
3. Restrict production callback URL to HTTPS and trusted domain.
