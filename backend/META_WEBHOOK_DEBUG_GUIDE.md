# Meta Webhook Debugging Guide

## Overview
This guide helps you debug why Meta Lead Ads webhooks are not creating leads in your CRM system.

## Webhook URL
Your webhook callback URL is: `https://your-domain.com/webhook/meta`

## Debugging Steps Added

### 1. Console Logging
Comprehensive console.log statements have been added at every critical point:

- **Route Registration**: Shows when routes are mounted
- **Webhook Verification (GET)**: Logs all verification parameters
- **Webhook Receipt (POST)**: Logs headers, body, signature
- **Signature Validation**: Shows if validation passes/fails
- **Lead Event Extraction**: Shows how many events were found
- **Page Config Resolution**: Shows which page configs are available
- **Meta API Calls**: Shows lead data fetched from Facebook
- **Campaign Creation**: Shows campaign auto-creation process
- **Lead Creation**: Shows final lead payload and creation result

### 2. Check Server Logs

Start your server and watch for these initialization logs:

```
========== META LEAD SERVICE INITIALIZED ==========
Verify token configured: YES/NO
App secret configured: YES/NO
Allow insecure webhooks: true/false
Environment pages count: X

Page 1:
  Page ID: 1021995967663811
  Page Name: India Page
  Country: India (IN)
  Source Label: Meta India Page
  Access Token: [CONFIGURED]
  App Secret: [CONFIGURED]
  Verify Token: [CONFIGURED]
...
```

### 3. Test Webhook Verification

Meta will first verify your webhook with a GET request:

```bash
curl "https://your-domain.com/webhook/meta?hub.mode=subscribe&hub.verify_token=g2v_secret_2024&hub.challenge=test123"
```

**Expected Response**: Should return the challenge value

**Check Console For**:
```
========== META WEBHOOK VERIFICATION ==========
Query params: { ... }
hub.mode: subscribe
hub.verify_token: g2v_secret_2024
hub.challenge: test123
Verification successful, returning challenge: test123
```

### 4. Test Webhook Receipt

When Meta sends a lead, you'll see:

```
========== META WEBHOOK RECEIVED ==========
Timestamp: 2024-...
Headers: { ... }
Body: { object: 'page', entry: [...] }
Signature: sha256=...

========== SERVICE: handleWebhook START ==========
Payload object type: page
Payload entry count: 1

========== EXTRACTED LEAD EVENTS ==========
Lead events count: 1
Lead events: [
  {
    leadgenId: "123456789",
    pageId: "1021995967663811",
    formId: "...",
    ...
  }
]

========== PROCESSING LEAD EVENT ==========
Event: { ... }

========== PAGE CONFIG RESOLUTION ==========
Looking for page ID: 1021995967663811
Normalized page ID: 1021995967663811
Checking environment pages...
Environment pages count: 2
Env page 0: { pageId: '1021995967663811', pageName: 'India Page', ... }
Found in environment pages: { ... }

========== FETCHING META LEAD DATA ==========
Meta lead fetched: {
  id: "123456789",
  created_time: "...",
  field_data: [
    { name: "full_name", values: ["John Doe"] },
    { name: "email", values: ["john@example.com"] },
    { name: "phone_number", values: ["+919876543210"] }
  ],
  ...
}

========== BUILDING LEAD PAYLOAD ==========
Lead payload: {
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+919876543210",
  source: "Meta India Page",
  leadCountry: "India",
  countryId: null,
  campaignId: 123,
  metaLeadId: "123456789",
  ...
}

========== CREATING LEAD IN CRM ==========
Lead creation result: { leadId: 456, duplicate: false }
Lead processing complete - Success

========== FINAL SUMMARY ==========
{
  processed: 1,
  duplicates: 0,
  skipped: 0,
  leads: [...]
}
```

## Common Issues & Solutions

### Issue 1: No Logs Appearing
**Problem**: Server receives request but no logs appear
**Solution**: 
- Check if server is running: `npm start` or `node src/index.js`
- Verify webhook URL is correct in Meta Business Suite
- Check firewall/network settings

### Issue 2: Verification Fails
**Problem**: Meta says webhook verification failed
**Symptoms**:
```
hub.verify_token: WRONG_TOKEN
Error: Invalid verify token
```
**Solution**:
- Check `.env` file has correct `META_INDIA_VERIFY_TOKEN` and `META_UAE_VERIFY_TOKEN`
- Verify token in Meta Business Suite matches exactly
- Token is case-sensitive

### Issue 3: Page Config Not Found
**Problem**: Leads are quarantined with "unknown_page" reason
**Symptoms**:
```
Page config found: NO
Page config not found for page ID: 958886697315918
```
**Solution**:
- Verify page ID in `.env` matches Meta page ID exactly
- Check environment variables are loaded: `META_INDIA_PAGE_ID`, `META_UAE_PAGE_ID`
- Restart server after changing `.env`

### Issue 4: Signature Validation Fails
**Problem**: Webhook rejected with "Invalid signature"
**Symptoms**:
```
Signature validation FAILED
Error: Invalid signature
```
**Solution**:
- Check `META_INDIA_APP_SECRET` and `META_UAE_APP_SECRET` in `.env`
- Get correct app secret from Meta App Dashboard
- Temporarily set `META_ALLOW_INSECURE_WEBHOOKS=true` for testing (NOT for production)

### Issue 5: No Lead Events Extracted
**Problem**: Webhook received but no leads extracted
**Symptoms**:
```
Lead events count: 0
No leadgen events found in payload
```
**Solution**:
- Check webhook payload structure
- Verify Meta is sending `leadgen` field type
- Check if `entry[].changes[].field === 'leadgen'`

### Issue 6: Meta API Fetch Fails
**Problem**: Cannot fetch lead data from Facebook Graph API
**Symptoms**:
```
Meta Graph API request failed
Error: Unable to reach Meta Graph API
```
**Solution**:
- Verify `META_INDIA_ACCESS_TOKEN` and `META_UAE_ACCESS_TOKEN` are valid
- Check token hasn't expired (regenerate in Meta Business Suite)
- Verify page access token has `leads_retrieval` permission
- Check network connectivity to graph.facebook.com

### Issue 7: Lead Creation Fails
**Problem**: Lead data fetched but not saved to database
**Symptoms**:
```
Lead creation error: ...
```
**Solution**:
- Check database connection
- Verify `leads` table exists
- Check required fields are present
- Review database error logs

## Environment Variables Checklist

### Common Settings
```env
META_GRAPH_BASE_URL=https://graph.facebook.com
META_GRAPH_VERSION=v20.0
META_GRAPH_FIELDS=id,created_time,field_data,ad_id,adset_id,campaign_id,form_id
META_ALLOW_INSECURE_WEBHOOKS=false
```

### India Configuration
```env
META_INDIA_PAGE_ID=1021995967663811
META_INDIA_PAGE_NAME=India Page
META_INDIA_COUNTRY_CODE=IN
META_INDIA_COUNTRY_NAME=India
META_INDIA_SOURCE_LABEL=Meta India Page
META_INDIA_ACCESS_TOKEN=EAAqvqlAZCU60BR...
META_INDIA_APP_SECRET=2a410f1869ac516374cedd875c823b89
META_INDIA_VERIFY_TOKEN=g2v_secret_2024
META_INDIA_GRAPH_VERSION=v20.0
```

### UAE Configuration
```env
META_UAE_PAGE_ID=958886697315918
META_UAE_PAGE_NAME=UAE Page
META_UAE_COUNTRY_CODE=AE
META_UAE_COUNTRY_NAME=UAE
META_UAE_SOURCE_LABEL=Meta UAE Page
META_UAE_ACCESS_TOKEN=EAAd4J0eZAcPwBRT...
META_UAE_APP_SECRET=897be9c8d6716c36ba22f424ebe8fafa
META_UAE_VERIFY_TOKEN=g2v_secret_2024
META_UAE_GRAPH_VERSION=v20.0
```

## Testing with cURL

### Test Verification
```bash
curl -X GET "http://localhost:3000/webhook/meta?hub.mode=subscribe&hub.verify_token=g2v_secret_2024&hub.challenge=test123"
```

### Test Webhook (Mock)
```bash
curl -X POST http://localhost:3000/webhook/meta \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "1021995967663811",
      "time": 1234567890,
      "changes": [{
        "field": "leadgen",
        "value": {
          "leadgen_id": "123456789",
          "page_id": "1021995967663811",
          "form_id": "987654321",
          "ad_id": "111111",
          "adset_id": "222222",
          "campaign_id": "333333"
        }
      }]
    }]
  }'
```

## Meta Business Suite Configuration

1. **Go to Meta Business Suite** → Your App → Webhooks
2. **Callback URL**: `https://your-domain.com/webhook/meta`
3. **Verify Token**: Must match `META_INDIA_VERIFY_TOKEN` or `META_UAE_VERIFY_TOKEN`
4. **Subscribe to**: `leadgen` field
5. **Page**: Select the correct page (India or UAE)

## Database Tables to Check

### meta_webhook_events
Check if events are being recorded:
```sql
SELECT * FROM meta_webhook_events ORDER BY created_at DESC LIMIT 10;
```

Status values:
- `RECEIVED` - Event received
- `PROCESSED` - Lead created successfully
- `DUPLICATE_META_LEAD` - Lead already exists (by meta_lead_id)
- `DUPLICATE_CONTACT` - Lead already exists (by email/phone)
- `QUARANTINED_UNKNOWN_PAGE` - Page config not found
- `FAILED` - Processing error

### leads
Check if leads are being created:
```sql
SELECT id, full_name, email, phone, source, lead_country, meta_lead_id, created_at 
FROM leads 
WHERE source LIKE 'Meta%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Next Steps

1. **Start the server** and watch console output
2. **Test verification** with cURL or Meta's test button
3. **Submit a test lead** through your Meta Lead Ad form
4. **Watch the logs** for each step of processing
5. **Check database** for webhook events and leads
6. **Review errors** and match to common issues above

## Support

If issues persist after following this guide:
1. Copy the full console output
2. Check the `meta_webhook_events` table for error messages
3. Verify all environment variables are set correctly
4. Ensure Meta access tokens haven't expired
