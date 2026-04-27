# Meta And WhatsApp Isolated Setup

## Model

- India Meta app separate.
- UAE Meta app separate.
- India WhatsApp separate.
- UAE WhatsApp separate.
- Routing by ids only.

## Env only mode

- DB config rows optional.
- `.env` can drive routing.
- Routing still uses ids.
- Meta uses `page_id`.
- WhatsApp uses `phone_number_id`.

## Env template

```env
META_GRAPH_BASE_URL=https://graph.facebook.com
META_GRAPH_VERSION=v20.0
META_GRAPH_FIELDS=id,created_time,field_data,ad_id,adset_id,campaign_id,form_id
META_ALLOW_INSECURE_WEBHOOKS=false

META_INDIA_PAGE_ID=INDIA_PAGE_ID
META_INDIA_PAGE_NAME=India Page
META_INDIA_COUNTRY_CODE=IN
META_INDIA_COUNTRY_NAME=India
META_INDIA_SOURCE_LABEL=Meta India Page
META_INDIA_ACCESS_TOKEN=INDIA_META_SYSTEM_USER_TOKEN
META_INDIA_APP_SECRET=INDIA_META_APP_SECRET
META_INDIA_VERIFY_TOKEN=INDIA_META_VERIFY_TOKEN
META_INDIA_GRAPH_VERSION=v20.0

META_UAE_PAGE_ID=UAE_PAGE_ID
META_UAE_PAGE_NAME=UAE Page
META_UAE_COUNTRY_CODE=AE
META_UAE_COUNTRY_NAME=UAE
META_UAE_SOURCE_LABEL=Meta UAE Page
META_UAE_ACCESS_TOKEN=UAE_META_SYSTEM_USER_TOKEN
META_UAE_APP_SECRET=UAE_META_APP_SECRET
META_UAE_VERIFY_TOKEN=UAE_META_VERIFY_TOKEN
META_UAE_GRAPH_VERSION=v20.0

WHATSAPP_API_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v20.0
WHATSAPP_ALLOW_INSECURE_WEBHOOKS=false

WHATSAPP_INDIA_PHONE_NUMBER_ID=INDIA_PHONE_NUMBER_ID
WHATSAPP_INDIA_DISPLAY_PHONE_NUMBER=+91XXXXXXXXXX
WHATSAPP_INDIA_COUNTRY_CODE=IN
WHATSAPP_INDIA_COUNTRY_NAME=India
WHATSAPP_INDIA_SOURCE_LABEL=WhatsApp India
WHATSAPP_INDIA_ACCESS_TOKEN=INDIA_WHATSAPP_SYSTEM_USER_TOKEN
WHATSAPP_INDIA_APP_SECRET=INDIA_WHATSAPP_APP_SECRET
WHATSAPP_INDIA_VERIFY_TOKEN=INDIA_WHATSAPP_VERIFY_TOKEN
WHATSAPP_INDIA_APP_ID=INDIA_WHATSAPP_APP_ID
WHATSAPP_INDIA_API_VERSION=v20.0

WHATSAPP_UAE_PHONE_NUMBER_ID=UAE_PHONE_NUMBER_ID
WHATSAPP_UAE_DISPLAY_PHONE_NUMBER=+971XXXXXXXXX
WHATSAPP_UAE_COUNTRY_CODE=AE
WHATSAPP_UAE_COUNTRY_NAME=UAE
WHATSAPP_UAE_SOURCE_LABEL=WhatsApp UAE
WHATSAPP_UAE_ACCESS_TOKEN=UAE_WHATSAPP_SYSTEM_USER_TOKEN
WHATSAPP_UAE_APP_SECRET=UAE_WHATSAPP_APP_SECRET
WHATSAPP_UAE_VERIFY_TOKEN=UAE_WHATSAPP_VERIFY_TOKEN
WHATSAPP_UAE_APP_ID=UAE_WHATSAPP_APP_ID
WHATSAPP_UAE_API_VERSION=v20.0
```

## If tables already exist

- Skip migration rerun.
- Keep manual tables.
- Only verify structure.
- Then insert config rows.

## Verify tables

```sql
SHOW TABLES LIKE 'meta_page_configs';
SHOW TABLES LIKE 'meta_webhook_events';
SHOW TABLES LIKE 'whatsapp_channel_configs';
```

## Verify indexes

```sql
SHOW INDEX FROM meta_page_configs;
SHOW INDEX FROM meta_webhook_events;
SHOW INDEX FROM whatsapp_channel_configs;
```

Expected names:

- `uq_meta_page_configs_page_id`
- `uq_meta_webhook_events_event_key`
- `uq_whatsapp_channel_phone_number_id`

## Get country ids

```sql
SELECT id, name, code
FROM countries
ORDER BY name;
```

## Meta rows

Create one row per page.

```sql
INSERT INTO meta_page_configs (
  id,
  page_id,
  page_name,
  country_id,
  country_code,
  source_label,
  access_token,
  app_secret,
  verify_token,
  graph_version,
  is_active
) VALUES
(
  'india-page-uuid',
  'INDIA_PAGE_ID',
  'India Page',
  'INDIA_COUNTRY_UUID',
  'IN',
  'Meta India Page',
  'INDIA_META_SYSTEM_USER_TOKEN',
  'INDIA_META_APP_SECRET',
  'INDIA_META_VERIFY_TOKEN',
  'v20.0',
  TRUE
),
(
  'uae-page-uuid',
  'UAE_PAGE_ID',
  'UAE Page',
  'UAE_COUNTRY_UUID',
  'AE',
  'Meta UAE Page',
  'UAE_META_SYSTEM_USER_TOKEN',
  'UAE_META_APP_SECRET',
  'UAE_META_VERIFY_TOKEN',
  'v20.0',
  TRUE
);
```

## WhatsApp rows

Create one row per number.

```sql
INSERT INTO whatsapp_channel_configs (
  id,
  phone_number_id,
  display_phone_number,
  country_id,
  country_code,
  access_token,
  app_secret,
  verify_token,
  app_id,
  api_base_url,
  api_version,
  source_label,
  is_active
) VALUES
(
  'india-wa-uuid',
  'INDIA_PHONE_NUMBER_ID',
  '+91XXXXXXXXXX',
  'INDIA_COUNTRY_UUID',
  'IN',
  'INDIA_WHATSAPP_SYSTEM_USER_TOKEN',
  'INDIA_WHATSAPP_APP_SECRET',
  'INDIA_WHATSAPP_VERIFY_TOKEN',
  'INDIA_WHATSAPP_APP_ID',
  'https://graph.facebook.com',
  'v20.0',
  'WhatsApp India',
  TRUE
),
(
  'uae-wa-uuid',
  'UAE_PHONE_NUMBER_ID',
  '+971XXXXXXXXX',
  'UAE_COUNTRY_UUID',
  'AE',
  'UAE_WHATSAPP_SYSTEM_USER_TOKEN',
  'UAE_WHATSAPP_APP_SECRET',
  'UAE_WHATSAPP_VERIFY_TOKEN',
  'UAE_WHATSAPP_APP_ID',
  'https://graph.facebook.com',
  'v20.0',
  'WhatsApp UAE',
  TRUE
);
```

## Runtime

- Meta reads `page_id`.
- Meta resolves page row.
- Lead fetch uses row token.
- Signature uses row secret.
- WhatsApp reads `phone_number_id`.
- WhatsApp resolves channel row.
- Send uses row token.
- Signature uses row secret.

## Fallback

- Env stays fallback only.
- DB rows stay primary.
- Unknown ids never route.
