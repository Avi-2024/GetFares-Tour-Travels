# Frontend Integration README

## Purpose

Send website form entries to CRM leads.

## API Endpoint

- Method: `POST`
- URL: `{{baseUrl}}/api/website-enquiries/capture`
- Content-Type: `application/json`

## Three Website Source Rules

Use these values exactly.

1. Global website (`get2vacation/frontend`)
- `source`: `Website Global - ...`
- `utmSource`: `website_global`
- `leadCountry`: `Global`
- `country`: `Global`

2. India website (`get2vacation/frontendin`)
- `source`: `Website India - ...`
- `utmSource`: `website_india`
- `leadCountry`: `India`
- `country`: `India`

3. UAE website (`get2vacation/frontenduae`)
- `source`: `Website UAE - ...`
- `utmSource`: `website_uae`
- `leadCountry`: `UAE`
- `country`: `UAE`

This is how CRM shows lead origin.

## Recommended Payload

```json
{
  "fullName": "User Name",
  "email": "user@example.com",
  "phone": "919999999999",
  "destination": "Maldives",
  "nationality": "Indian",
  "travelDate": "2026-05-20",
  "budget": 150000,
  "numberOfDays": 5,
  "numberOfTravellers": 2,
  "subject": "Holiday enquiry",
  "message": "Need detailed quote.",
  "leadType": "HOLIDAY",
  "source": "Website India - Destination Inquiry",
  "sourcePage": "Destination",
  "leadCountry": "India",
  "country": "India",
  "pagePath": "/destination#custom-itinerary",
  "pageUrl": "https://localhost:5174/destination#custom-itinerary",
  "utmSource": "website_india",
  "utmMedium": "contact_form",
  "utmCampaign": "destination_inquiry"
}
```

## Required Identifier Rule

At least one must exist:

- `fullName` or `name`
- `email`
- `phone`

## Response Behavior

- `201`: New lead created.
- `200`: Duplicate found, existing lead returned.

Both are success paths.

## Postman File

Import this file:

- `postman/Website-Enquiries-3-Sites.postman_collection.json`

Requests included:

- Global Help submit.
- India Destination submit.
- UAE Visa submit.

## Frontend Checklist

1. Set `VITE_CRM_BASE_URL`.
2. Use endpoint `/api/website-enquiries/capture`.
3. Send exact site source tags.
4. Send `pagePath` and `pageUrl`.
5. Treat `200` and `201` as success.
