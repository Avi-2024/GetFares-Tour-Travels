# Website Enquiries -> CRM Lead Capture

## Goal

Capture public website forms and create CRM leads automatically.

## New Backend Module

- Module path: `backend/crm/modules/websiteEnquiries`
- Route: `POST /api/website-enquiries/capture`
- Mounted in: `backend/crm/modules/index.js`

## Request Contract

Accepted payload keys:

- `fullName` or `name`
- `email`
- `phone`
- `destination` / `destinationName`
- `nationality`
- `leadCountry` / `country`
- `travelDate`
- `budget`
- `numberOfDays`
- `numberOfTravellers`
- `subject`
- `message`
- `leadType` (`HOLIDAY | VISA | BOTH`)
- `source`
- `sourcePage`
- `pagePath`
- `pageUrl`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `clientCreatedAt`
- `clientTimezone`

At least one identifier is required:

- `fullName` or `name` or `email` or `phone`

## Backend Mapping Logic

Implemented in:

- `backend/crm/modules/websiteEnquiries/websiteEnquiries.service.js`

Key behavior:

- Derives `fullName` safely.
- Infers `leadType` from payload/source when not sent.
- Converts `numberOfDays` to `travelEndDate` when `travelDate` exists.
- Stores `subject/message/page metadata` inside lead `notes`.
- Calls `leadsService.createOrGetDuplicate(...)`.
- Keeps duplicate handling same as CRM webhook flow.

## Frontend Integrations Done

All updated to call new endpoint:

- `get2vacation/frontend/src/components/HelpandSupport/ContactSection.tsx`
- `get2vacation/frontend/src/components/VisaComp/ApplicationFormSection.tsx`
- `get2vacation/frontend/src/components/Destination/CTA.tsx`
- `get2vacation/frontendin/src/components/HelpandSupport/ContactSection.tsx`
- `get2vacation/frontendin/src/components/VisaComp/ApplicationFormSection.tsx`
- `get2vacation/frontendin/src/components/Destination/CTA.tsx`
- `get2vacation/frontenduae/src/components/HelpandSupport/ContactSection.tsx`
- `get2vacation/frontenduae/src/components/VisaComp/ApplicationFormSection.tsx`
- `get2vacation/frontenduae/src/components/Destination/CTA.tsx`

Regional tagging added:

- `frontendin`: `leadCountry/country = India`
- `frontenduae`: `leadCountry/country = UAE`

## Legacy Compatibility

Old endpoint still exists:

- `POST /api/webhooks/website-enquiry`

And now supports extra payload keys (`destination`, `nationality`, `subject`, `message`, etc.) through improved mapping in:

- `backend/crm/modules/webhooks/webhooks.service.js`

## Recommended Remaining Improvements

1. Add `nationality` input in `frontend` and `frontendin` visa forms.
2. Add `clientCreatedAt/clientTimezone` from browser on submit for wall-clock audit parity.
3. Add integration tests for:
   - `POST /api/website-enquiries/capture`
   - duplicate lead behavior
   - destination name -> destination id resolution
