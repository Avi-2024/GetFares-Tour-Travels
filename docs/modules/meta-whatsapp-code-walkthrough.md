# Meta And WhatsApp Code Walkthrough

## Purpose

This file explains how these modules are written:

- `backend/crm/modules/metaWebhook`
- `backend/crm/modules/whatsapp`

This is code walkthrough.
This is not setup guide.

For setup details, also read:

- `docs/modules/meta-whatsapp-isolated-setup.md`

## Shared Pattern

Both modules follow same pattern:

- `index.js` wires module.
- `*.routes.js` defines routes.
- `*.controller.js` handles HTTP.
- `*.validation.js` validates request.
- `*.service.js` holds main logic.
- `*.repository.js` talks to database.
- `*.api.js` calls Meta APIs.

Flow is simple:

`route -> validation -> controller -> service -> repository/api`

## Where Modules Mount

Main registration is in:

- `backend/crm/modules/index.js`

Mounted paths:

- Meta webhook: `/webhook/meta`
- WhatsApp API: `/api/whatsapp`
- WhatsApp webhook: `/webhook/whatsapp`

## Meta Webhook Module

### Files

- `index.js`
- `metaWebhook.routes.js`
- `metaWebhook.controller.js`
- `metaWebhook.validation.js`
- `metaLead.service.js`
- `metaLead.repository.js`
- `metaApi.js`

### What `index.js` does

`index.js` builds module parts.

It creates:

- repository
- Meta Graph API client
- service
- controller
- router

It returns frozen module object.

## Meta Routes

Defined in `metaWebhook.routes.js`.

Routes are:

- `GET /meta`
- `POST /meta`

Important detail:

- POST uses `express.raw({ type: "*/*" })`
- Raw body saved in `req.rawBody`
- Raw body parsed manually

This is needed for signature check.

## Meta Controller

Defined in `metaWebhook.controller.js`.

Controller is very thin.

`verify()` does:

- reads query
- calls `service.verifyWebhook()`
- returns challenge

`receive()` does:

- reads `x-hub-signature-256`
- sends parsed body
- sends `rawBody`
- calls `service.handleWebhook()`
- returns summary JSON

## Meta Validation

Defined in `metaWebhook.validation.js`.

It validates:

- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

POST body is loose.
Service does heavy checks.

## Meta Repository

Defined in `metaLead.repository.js`.

It handles database work.

Main responsibilities:

- find lead by `meta_lead_id`
- attach Meta ids to lead
- load page config by `page_id`
- list active page configs
- map Meta campaign to CRM campaign
- store webhook event rows
- update webhook event status

Main tables used:

- `leads`
- `meta_page_configs`
- `meta_webhook_events`
- `countries`
- `campaigns`

So Meta module is config-driven.
One page can have own token.

## Meta API Client

Defined in `metaApi.js`.

This file only calls Graph API.

Main job:

- fetch lead details by `leadgenId`

It builds URL using:

- base URL
- Graph version
- access token
- requested fields

If Meta returns error,
it throws `META_GRAPH_ERROR`.

## Meta Service

Defined in `metaLead.service.js`.

This is main brain.

### Main responsibilities

- verify webhook token
- verify request signature
- extract lead events
- deduplicate events
- find page config
- fetch full lead from Graph API
- map fields to CRM lead payload
- create lead or return duplicate
- attach Meta ids to lead
- log webhook event status

### Verification flow

`verifyWebhook()` accepts many tokens:

- global `config.meta.verifyToken`
- page-level `verify_token`

So one route supports many pages.

### Signature flow

`assertSignature()` uses:

- global app secret
- page-level app secret

It checks `x-hub-signature-256`.

If `allowInsecureWebhooks` is false,
signature must match.

### Event extraction

`extractLeadgenEvents()` reads:

- `payload.entry[]`
- `entry.changes[]`
- only `field === "leadgen"`

It builds event object:

- `leadgenId`
- `pageId`
- `formId`
- `adId`
- `adsetId`
- `campaignId`
- `eventKey`

`eventKey` prevents duplicates.

### Lead creation flow

For each event:

1. Check existing event row.
2. Create event row.
3. Check existing lead by `meta_lead_id`.
4. Find page config by `page_id`.
5. Fetch full lead from Graph.
6. Match campaign by `meta_campaign_id`.
7. Build CRM lead payload.
8. Call `leadsService.createOrGetDuplicate()`.
9. Attach Meta attributes.
10. Mark webhook event status.

### Lead payload mapping

Field data is flattened first.

Then service tries:

- email keys
- phone keys
- full name keys
- first and last name keys

If name missing,
it derives fallback name.

Source defaults:

- source: `Meta Lead Ads`
- utmSource: `meta`
- utmMedium: `lead_ads`

## WhatsApp Module

### Files

- `index.js`
- `whatsapp.routes.js`
- `whatsapp.controller.js`
- `whatsapp.validation.js`
- `whatsapp.service.js`
- `whatsapp.repository.js`
- `whatsapp.api.js`
- `whatsapp.subscribers.js`

### What `index.js` does

It creates:

- repository
- WhatsApp API client
- service
- controller
- protected API router
- public webhook router
- event subscribers

So WhatsApp module has two faces:

- admin/API side
- webhook side

## WhatsApp Routes

Defined in `whatsapp.routes.js`.

Protected API routes:

- `GET /api/whatsapp/config-status`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/send-template`

Public webhook routes:

- `GET /webhook/whatsapp`
- `POST /webhook/whatsapp`

Protected routes require:

- auth
- permission checks

Webhook POST also uses raw parser.
Reason is same:
signature verification.

## WhatsApp Controller

Defined in `whatsapp.controller.js`.

Controller methods:

- `configStatus()`
- `verify()`
- `receive()`
- `sendText()`
- `sendTemplate()`

Again controller is thin.
Business logic stays in service.

## WhatsApp Validation

Defined in `whatsapp.validation.js`.

It validates:

- webhook query params
- text send payload
- template send payload
- optional country routing fields

Routing fields include:

- `phoneNumberId`
- `countryId`
- `countryCode`
- `countryName`

## WhatsApp Repository

Defined in `whatsapp.repository.js`.

It manages channel configs.

Main responsibilities:

- find active channel by `phone_number_id`
- find active channel by country
- list active channels

Main tables used:

- `whatsapp_channel_configs`
- `countries`

So outbound and inbound routing
is channel-based.

## WhatsApp API Client

Defined in `whatsapp.api.js`.

This file only sends messages.

It builds request:

- `POST /{version}/{phoneNumberId}/messages`

It needs runtime channel data:

- access token
- phone number id
- API base URL
- API version

If API fails,
it throws `WHATSAPP_API_ERROR`.

## WhatsApp Service

Defined in `whatsapp.service.js`.

This is main brain.

### Main responsibilities

- show config status
- verify webhook token
- verify signature
- parse inbound messages
- create leads from inbound messages
- choose outbound channel
- send text messages
- send template messages
- send event-based notifications

### Config model

Service supports:

- one default channel from env
- many active channels from DB

That means:

- simple setup works
- multi-country setup also works

### Webhook verification

`verifyWebhook()` accepts tokens from:

- env config
- active channel rows

So one endpoint supports many numbers.

### Signature verification

`assertSignature()` collects secrets from:

- env config
- matched phone number channel
- all configured channels fallback

Then checks `x-hub-signature-256`.

### Inbound flow

`handleWebhook()` does:

1. Verify signature.
2. Parse incoming messages.
3. Normalize sender phone.
4. Resolve inbound channel.
5. Build lead payload.
6. Call `leadsService.createOrGetDuplicate()`.
7. Return processed results.

Lead source becomes channel label.
Message text becomes lead notes.

### Outbound flow

Two direct send methods exist:

- `sendTextMessage()`
- `sendTemplateMessage()`

Both first resolve channel.

Channel resolution priority:

1. explicit `phoneNumberId`
2. country mapping
3. default env channel

Then `whatsapp.api.js` sends message.

### Event-driven notifications

`whatsapp.subscribers.js` subscribes to event bus.

Current events:

- `leads.created`
- `leads.followup_overdue`
- `quotations.sent`
- `quotations.reminder_triggered`
- `bookings.pre_travel_reminder`
- `bookings.post_travel_feedback`

Service then sends:

- lead welcome
- follow-up reminder
- quotation notice
- quotation reminder
- pre-travel message
- post-travel message

If template exists,
template is used.
Else plain text is used.

## Main Difference

Meta module is inbound-only.
It receives lead ads events.

WhatsApp module is both ways.
It receives messages.
It also sends messages.

## Quick Mental Model

Use this memory shortcut:

- Meta webhook creates CRM leads from ads.
- WhatsApp webhook creates CRM leads from chats.
- WhatsApp API sends replies and notifications.
- DB config tables drive multi-country routing.

## Recommended Reading Order

Read in this order:

1. `backend/crm/modules/index.js`
2. `backend/crm/modules/metaWebhook/index.js`
3. `backend/crm/modules/metaWebhook/metaLead.service.js`
4. `backend/crm/modules/whatsapp/index.js`
5. `backend/crm/modules/whatsapp/whatsapp.service.js`
6. `docs/modules/meta-whatsapp-isolated-setup.md`
