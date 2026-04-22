# Backend API Summary

Generated from backend code and route collections on 2026-04-17T12:44:40.763Z.

Swagger/OpenAPI scan:
- No Swagger/OpenAPI file detected in `backend/`.

Auth detection:
- JWT bearer auth is primary auth flow.
- Logout blacklists JWT by `jti`.
- No refresh-token endpoint detected in code.
- No OAuth flow detected.
- No API-key auth for business APIs detected.
- Metrics endpoints optionally use `x-metrics-token`.

Assumptions:
- `History`, `Lead Activities`, `Currency`, `Website Enquiries`, `Metrics`, and `Negative Cases` request examples were inferred from validation/controllers.
- Imported CRM route folders came from `Travel-CRM-Full-Routers.postman_collection.json` and were aligned with mounted backend routes.
- CMS folders came from code-generated CMS collection aligned to `backend/cms/modules`.

Total requests: 351

## Health (3)

- `GET /health` | public
- `GET /health/live` | public
- `GET /health/ready` | public

## Auth (5)

- `POST /api/auth/login` | public
- `POST /api/auth/logout` | bearer
- `GET /api/auth/me` | bearer
- `POST /api/auth/register` | public
- `POST /api/auth/toggle-active` | bearer

## Bookings (12)

- `GET /api/bookings` | bearer
- `POST /api/bookings` | bearer
- `GET /api/bookings/{{id}}` | bearer
- `PATCH /api/bookings/{{id}}` | bearer
- `POST /api/bookings/{{id}}/approve` | bearer
- `GET /api/bookings/{{id}}/invoices` | bearer
- `POST /api/bookings/{{id}}/invoices/generate` | bearer
- `POST /api/bookings/{{id}}/status` | bearer
- `GET /api/bookings/{{id}}/status-history` | bearer
- `POST /api/bookings/deadlines/process` | bearer
- `POST /api/bookings/reminders/run` | bearer
- `GET /api/bookings/stats` | bearer

## Campaigns (4)

- `GET /api/campaigns` | bearer
- `POST /api/campaigns` | bearer
- `GET /api/campaigns/{{id}}` | bearer
- `PATCH /api/campaigns/{{id}}` | bearer

## Complaints (6)

- `GET /api/complaints` | bearer
- `POST /api/complaints` | bearer
- `GET /api/complaints/{{id}}` | bearer
- `PATCH /api/complaints/{{id}}` | bearer
- `GET /api/complaints/{{id}}/activities` | bearer
- `POST /api/complaints/{{id}}/activities` | bearer

## Countries (4)

- `GET /api/countries` | bearer
- `POST /api/countries` | bearer
- `GET /api/countries/{{id}}` | bearer
- `PATCH /api/countries/{{id}}` | bearer

## Customers (5)

- `GET /api/customers` | bearer
- `POST /api/customers` | bearer
- `DELETE /api/customers/{{id}}` | bearer
- `GET /api/customers/{{id}}` | bearer
- `PATCH /api/customers/{{id}}` | bearer

## Dashboard (4)

- `GET /api/dashboard/lead-sources` | bearer
- `GET /api/dashboard/revenue` | bearer
- `GET /api/dashboard/stats` | bearer
- `GET /api/dashboard/test` | bearer

## Destinations (7)

- `GET /api/destinations` | bearer
- `POST /api/destinations` | bearer
- `GET /api/destinations/{{id}}` | bearer
- `PATCH /api/destinations/{{id}}` | bearer
- `GET /api/destinations/{{id}}/pricing` | bearer
- `POST /api/destinations/{{id}}/pricing` | bearer
- `PATCH /api/destinations/pricing/{{pricingId}}` | bearer

## Employees (7)

- `GET /api/employees/attendance` | bearer
- `POST /api/employees/attendance/check-in` | bearer
- `POST /api/employees/attendance/check-out` | bearer
- `GET /api/employees/directory` | bearer
- `GET /api/employees/leaves` | bearer
- `POST /api/employees/leaves` | bearer
- `PATCH /api/employees/leaves/{{id}}/status` | bearer

## Leads (16)

- `GET /api/leads` | bearer
- `POST /api/leads` | bearer
- `GET /api/leads/{{id}}` | bearer
- `PATCH /api/leads/{{id}}` | bearer
- `POST /api/leads/{{id}}/assign` | bearer
- `POST /api/leads/{{id}}/disable-calls` | bearer
- `GET /api/leads/{{id}}/followups` | bearer
- `POST /api/leads/{{id}}/followups` | bearer
- `POST /api/leads/distribute` | bearer
- `GET /api/leads/followups/overdue` | bearer
- `POST /api/leads/followups/process-cadence-automation` | bearer
- `POST /api/leads/followups/process-non-responsive` | bearer
- `POST /api/leads/followups/process-overdue` | bearer
- `POST /api/leads/public-capture` | bearer
- `POST /api/leads/reassign-inactive` | bearer
- `POST /api/leads/sla/process-breaches` | bearer

## Mail (2)

- `POST /api/mail/send-test` | bearer
- `GET /api/mail/verify` | bearer

## Meta Webhook (2)

- `GET /webhook/meta` | public
- `POST /webhook/meta` | public

## Notifications (4)

- `GET /api/notifications` | bearer
- `PATCH /api/notifications/{{id}}/read` | bearer
- `PATCH /api/notifications/read-all` | bearer
- `GET /api/notifications/unread-count` | bearer

## Packages (7)

- `GET /api/packages` | bearer
- `POST /api/packages` | bearer
- `GET /api/packages/{{id}}` | bearer
- `PATCH /api/packages/{{id}}` | bearer
- `GET /api/packages/{{id}}/enquiries` | bearer
- `POST /api/packages/{{id}}/enquiries` | bearer
- `POST /api/packages/{{id}}/publish` | bearer

## Payments (6)

- `GET /api/payments` | bearer
- `POST /api/payments` | bearer
- `GET /api/payments/{{id}}` | bearer
- `PATCH /api/payments/{{id}}` | bearer
- `POST /api/payments/{{id}}/verify` | bearer
- `GET /api/payments/stats` | bearer

## Quotations (17)

- `GET /api/quotations` | bearer
- `POST /api/quotations` | bearer
- `GET /api/quotations/{{id}}` | bearer
- `PATCH /api/quotations/{{id}}` | bearer
- `POST /api/quotations/{{id}}/approve-margin` | bearer
- `POST /api/quotations/{{id}}/generate-pdf` | bearer
- `POST /api/quotations/{{id}}/send` | bearer
- `GET /api/quotations/{{id}}/send-logs` | bearer
- `POST /api/quotations/{{id}}/status` | bearer
- `GET /api/quotations/{{id}}/versions` | bearer
- `POST /api/quotations/{{id}}/viewed` | bearer
- `GET /api/quotations/{{id}}/views` | bearer
- `POST /api/quotations/reminders/run` | bearer
- `GET /api/quotations/reports/lead-to-quote` | bearer
- `GET /api/quotations/templates` | bearer
- `POST /api/quotations/templates` | bearer
- `PATCH /api/quotations/templates/{{id}}` | bearer

## Rbac (20)

- `GET /api/permissions` | bearer
- `POST /api/permissions` | bearer
- `PATCH /api/permissions/{{id}}` | bearer
- `POST /api/rbac/assign` | bearer
- `GET /api/rbac/me/permissions` | bearer
- `GET /api/rbac/permissions` | bearer
- `POST /api/rbac/permissions` | bearer
- `PATCH /api/rbac/permissions/{{id}}` | bearer
- `GET /api/rbac/roles` | bearer
- `POST /api/rbac/roles` | bearer
- `PATCH /api/rbac/roles/{{id}}` | bearer
- `GET /api/rbac/roles/{{id}}/permissions` | bearer
- `PATCH /api/rbac/roles/{{id}}/permissions` | bearer
- `GET /api/rbac/roles/{{role}}/permissions` | bearer
- `PUT /api/rbac/roles/{{role}}/permissions` | bearer
- `GET /api/roles` | bearer
- `POST /api/roles` | bearer
- `PATCH /api/roles/{{id}}` | bearer
- `GET /api/roles/{{id}}/permissions` | bearer
- `PATCH /api/roles/{{id}}/permissions` | bearer

## Refunds (7)

- `GET /api/refunds` | bearer
- `POST /api/refunds` | bearer
- `GET /api/refunds/{{id}}` | bearer
- `PATCH /api/refunds/{{id}}` | bearer
- `POST /api/refunds/{{id}}/approve` | bearer
- `POST /api/refunds/{{id}}/process` | bearer
- `POST /api/refunds/{{id}}/reject` | bearer

## Reports (22)

- `GET /api/reports/dashboard/executive-kpis` | bearer
- `GET /api/reports/finance/cost-breakup` | bearer
- `GET /api/reports/followups/call-log` | bearer
- `GET /api/reports/followups/missed` | bearer
- `GET /api/reports/followups/today` | bearer
- `GET /api/reports/forecast/pipeline` | bearer
- `GET /api/reports/funnel/conversion` | bearer
- `GET /api/reports/leads/aging` | bearer
- `GET /api/reports/leads/by-consultant` | bearer
- `GET /api/reports/leads/by-source` | bearer
- `GET /api/reports/leads/lost` | bearer
- `GET /api/reports/marketing/performance` | bearer
- `GET /api/reports/monthly-summary` | bearer
- `GET /api/reports/payments/mode` | bearer
- `GET /api/reports/payments/outstanding` | bearer
- `GET /api/reports/profit/margin` | bearer
- `GET /api/reports/revenue/by-destination` | bearer
- `GET /api/reports/revenue/by-service-type` | bearer
- `GET /api/reports/revenue/monthly` | bearer
- `GET /api/reports/sales/target-vs-achievement` | bearer
- `GET /api/reports/suppliers/performance` | bearer
- `GET /api/reports/visa/summary` | bearer

## Settings (6)

- `GET /api/settings` | bearer
- `GET /api/settings/integrations` | bearer
- `PATCH /api/settings/integrations` | bearer
- `GET /api/settings/system` | bearer
- `PATCH /api/settings/system` | bearer
- `GET /api/settings/system/preferences` | bearer

## Suppliers (8)

- `GET /api/suppliers` | bearer
- `POST /api/suppliers` | bearer
- `GET /api/suppliers/{{id}}` | bearer
- `PATCH /api/suppliers/{{id}}` | bearer
- `GET /api/suppliers/{{id}}/payables` | bearer
- `POST /api/suppliers/{{id}}/payables` | bearer
- `PATCH /api/suppliers/payables/{{payableId}}` | bearer
- `POST /api/suppliers/payables/process-deadline-alerts` | bearer

## Users (5)

- `GET /api/users` | bearer
- `POST /api/users` | bearer
- `GET /api/users/{{id}}` | bearer
- `PATCH /api/users/{{id}}` | bearer
- `GET /api/users/roles` | bearer

## Visa (11)

- `GET /api/visa` | bearer
- `POST /api/visa` | bearer
- `GET /api/visa/{{id}}` | bearer
- `PATCH /api/visa/{{id}}` | bearer
- `GET /api/visa/{{id}}/checklist` | bearer
- `PATCH /api/visa/{{id}}/checklist` | bearer
- `GET /api/visa/{{id}}/documents` | bearer
- `POST /api/visa/{{id}}/documents` | bearer
- `POST /api/visa/{{id}}/status` | bearer
- `PATCH /api/visa/documents/{{documentId}}/verify` | bearer
- `GET /api/visa/reports/summary` | bearer

## Webhooks (3)

- `POST /api/webhooks/meta-leads` | public
- `POST /api/webhooks/website-enquiry` | public
- `POST /api/webhooks/whatsapp-enquiry` | public

## Whatsapp (5)

- `GET /api/whatsapp` | bearer
- `POST /api/whatsapp` | bearer
- `GET /api/whatsapp/config-status` | bearer
- `POST /api/whatsapp/send` | bearer
- `POST /api/whatsapp/send-template` | bearer

## Currency (2)

- `GET /api/currency/rates` | public
- `GET /api/currency/convert?amount=100&from=AED&to=INR` | public

## History (2)

- `POST /api/history` | bearer
- `GET /api/history?limit=20` | bearer

## Lead Activities (2)

- `POST /api/lead-activities` | bearer
- `GET /api/lead-activities?lead_id={{leadId}}` | bearer

## Website Enquiries (1)

- `POST /api/website-enquiries/capture` | public

## Website Enquiries Capture (3)

- `POST /api/website-enquiries/capture` | public
- `POST /api/website-enquiries/capture` | public
- `POST /api/website-enquiries/capture` | public

## Metrics (2)

- `GET /metrics` | public
- `GET /metrics/json` | public

## CMS Protected (99)

- `GET /cms?active=true&country={{country}}&includeDeleted=false` | bearer
- `GET /cms/deleted?country={{country}}` | bearer
- `GET /cms/{{landingId}}` | bearer
- `POST /cms?country={{country}}` | bearer
- `PUT /cms/{{landingId}}?country={{country}}` | bearer
- `DELETE /cms/{{landingId}}` | bearer
- `PATCH /cms/{{landingId}}/status` | bearer
- `PATCH /cms/{{landingId}}/restore` | bearer
- `DELETE /cms/{{landingId}}/hard-delete` | bearer
- `PATCH /cms/reorder` | bearer
- `GET /cms/destinations?country={{country}}&region={{region}}&category={{category}}&isActive=true&isPopular=false&includeDeleted=false` | bearer
- `GET /cms/destinations/deleted?country={{country}}` | bearer
- `GET /cms/destinations/{{destinationId}}` | bearer
- `GET /cms/destinations/slug/{{slug}}` | bearer
- `POST /cms/destinations?country={{country}}` | bearer
- `PUT /cms/destinations/{{destinationId}}?country={{country}}` | bearer
- `DELETE /cms/destinations/{{destinationId}}` | bearer
- `PATCH /cms/destinations/{{destinationId}}/status` | bearer
- `PATCH /cms/destinations/{{destinationId}}/restore` | bearer
- `DELETE /cms/destinations/{{destinationId}}/hard-delete` | bearer
- `GET /cms/destinations/{{destinationId}}/media` | bearer
- `POST /cms/destinations/{{destinationId}}/media` | bearer
- `PUT /cms/destinations/{{destinationId}}/media/{{mediaId}}` | bearer
- `DELETE /cms/destinations/{{destinationId}}/media/{{mediaId}}` | bearer
- `DELETE /cms/destinations/{{destinationId}}/media/{{mediaId}}/hard-delete` | bearer
- `GET /cms/destinations/{{destinationId}}/seasons` | bearer
- `POST /cms/destinations/{{destinationId}}/seasons` | bearer
- `PUT /cms/destinations/{{destinationId}}/seasons/{{seasonId}}` | bearer
- `DELETE /cms/destinations/{{destinationId}}/seasons/{{seasonId}}` | bearer
- `DELETE /cms/destinations/{{destinationId}}/seasons/{{seasonId}}/hard-delete` | bearer
- `GET /cms/packages/published?country={{country}}&includeDeleted=false` | bearer
- `GET /cms/packages/published/deleted?country={{country}}` | bearer
- `POST /cms/packages/published` | bearer
- `GET /cms/packages/published/{{packageId}}` | bearer
- `PUT /cms/packages/published/{{packageId}}` | bearer
- `DELETE /cms/packages/published/{{packageId}}` | bearer
- `PATCH /cms/packages/published/{{packageId}}/restore` | bearer
- `DELETE /cms/packages/published/{{packageId}}/hard-delete` | bearer
- `GET /cms/packages/main?country={{country}}&isFeatured=true&includeDeleted=false` | bearer
- `GET /cms/packages/main/deleted?country={{country}}` | bearer
- `POST /cms/packages/main?country={{country}}` | bearer
- `GET /cms/packages/main/{{mainPackageId}}` | bearer
- `PUT /cms/packages/main/{{mainPackageId}}?country={{country}}` | bearer
- `DELETE /cms/packages/main/{{mainPackageId}}` | bearer
- `PATCH /cms/packages/main/{{mainPackageId}}/restore` | bearer
- `DELETE /cms/packages/main/{{mainPackageId}}/hard-delete` | bearer
- `GET /cms/packages/main/{{mainPackageId}}/sub?country={{country}}&includeDeleted=false` | bearer
- `GET /cms/packages/sub/deleted` | bearer
- `POST /cms/packages/sub` | bearer
- `PUT /cms/packages/sub/{{subPackageId}}` | bearer
- `DELETE /cms/packages/sub/{{subPackageId}}` | bearer
- `PATCH /cms/packages/sub/{{subPackageId}}/restore` | bearer
- `DELETE /cms/packages/sub/{{subPackageId}}/hard-delete` | bearer
- `GET /cms/visa?country={{country}}&isActive=true&includeDeleted=false` | bearer
- `GET /cms/visa/deleted?country={{country}}` | bearer
- `GET /cms/visa/{{visaId}}` | bearer
- `GET /cms/visa/slug/{{slug}}` | bearer
- `POST /cms/visa?country={{country}}` | bearer
- `PUT /cms/visa/{{visaId}}?country={{country}}` | bearer
- `DELETE /cms/visa/{{visaId}}` | bearer
- `PATCH /cms/visa/{{visaId}}/status` | bearer
- `PATCH /cms/visa/{{visaId}}/restore` | bearer
- `DELETE /cms/visa/{{visaId}}/hard-delete` | bearer
- `GET /cms/experience/featured-picks?country={{country}}&isActive=true&sectionKey=featured-hot-picks&campaignType=featured&includeDeleted=false` | bearer
- `GET /cms/experience/creative-toolkit?country={{country}}&isActive=true&sectionKey=creative-toolkit&campaignType=creative&includeDeleted=false` | bearer
- `GET /cms/experience/featured-picks/deleted?country={{country}}&sectionKey=featured-hot-picks&campaignType=featured` | bearer
- `GET /cms/experience/creative-toolkit/deleted?country={{country}}&sectionKey=creative-toolkit&campaignType=creative` | bearer
- `POST /cms/experience/featured-picks?country={{country}}` | bearer
- `POST /cms/experience/creative-toolkit?country={{country}}` | bearer
- `GET /cms/experience/featured-picks/{{featuredPickId}}` | bearer
- `GET /cms/experience/creative-toolkit/{{featuredPickId}}` | bearer
- `PUT /cms/experience/featured-picks/{{featuredPickId}}?country={{country}}` | bearer
- `PUT /cms/experience/creative-toolkit/{{featuredPickId}}?country={{country}}` | bearer
- `DELETE /cms/experience/featured-picks/{{featuredPickId}}` | bearer
- `DELETE /cms/experience/creative-toolkit/{{featuredPickId}}` | bearer
- `PATCH /cms/experience/featured-picks/{{featuredPickId}}/status` | bearer
- `PATCH /cms/experience/creative-toolkit/{{featuredPickId}}/status` | bearer
- `PATCH /cms/experience/featured-picks/{{featuredPickId}}/restore` | bearer
- `PATCH /cms/experience/creative-toolkit/{{featuredPickId}}/restore` | bearer
- `DELETE /cms/experience/featured-picks/{{featuredPickId}}/hard-delete` | bearer
- `DELETE /cms/experience/creative-toolkit/{{featuredPickId}}/hard-delete` | bearer
- `GET /cms/experience/season-cards?country={{country}}&destinationId={{destinationId}}&isActive=true&includeDeleted=false` | bearer
- `GET /cms/experience/season-cards/deleted?country={{country}}&destinationId={{destinationId}}` | bearer
- `POST /cms/experience/season-cards` | bearer
- `GET /cms/experience/season-cards/{{seasonCardId}}` | bearer
- `PUT /cms/experience/season-cards/{{seasonCardId}}` | bearer
- `DELETE /cms/experience/season-cards/{{seasonCardId}}` | bearer
- `PATCH /cms/experience/season-cards/{{seasonCardId}}/status` | bearer
- `PATCH /cms/experience/season-cards/{{seasonCardId}}/restore` | bearer
- `DELETE /cms/experience/season-cards/{{seasonCardId}}/hard-delete` | bearer
- `GET /cms/experience/hero-sections?country={{country}}&isActive=true` | bearer
- `PUT /cms/experience/hero-sections/{{sectionKey}}?country={{country}}` | bearer
- `POST /cms/media/upload` | bearer
- `GET /cms/media?entityType={{entityType}}&entityId={{entityId}}&mediaKind=image&isActive=true` | bearer
- `POST /cms/media` | bearer
- `GET /cms/media/{{mediaId}}` | bearer
- `PUT /cms/media/{{mediaId}}` | bearer
- `DELETE /cms/media/{{mediaId}}` | bearer
- `PATCH /cms/media/{{mediaId}}/status` | bearer

## Public CMS (36)

- `GET /api/public/cms/home?country={{country}}` | public
- `GET /api/public/cms/landing-places?country={{country}}` | public
- `GET /api/public/cms/destinations?country={{country}}&region={{region}}&category={{category}}&isPopular=true` | public
- `GET /api/public/cms/destinations/{{slug}}?country={{country}}` | public
- `GET /api/public/cms/destinations/{{slug}}/highlights?country={{country}}` | public
- `GET /api/public/cms/destinations/{{slug}}/media?country={{country}}` | public
- `GET /api/public/cms/destinations/{{slug}}/season-cards?country={{country}}` | public
- `GET /api/public/cms/destinations/{{slug}}/packages?country={{country}}` | public
- `GET /api/public/cms/packages/published?country={{country}}` | public
- `GET /api/public/cms/packages/main?country={{country}}` | public
- `GET /api/public/cms/packages/main/{{mainPackageId}}/sub?country={{country}}` | public
- `GET /api/public/cms/visa-destinations?country={{country}}` | public
- `GET /api/public/cms/visa-destinations/{{slug}}?country={{country}}` | public
- `GET /api/public/cms/visa-destinations/{{slug}}/details?country={{country}}&sectionType=overview` | public
- `GET /api/public/cms/featured-picks?country={{country}}&campaignType=featured&sectionKey=featured-hot-picks` | public
- `GET /api/public/cms/creative-toolkit?country={{country}}&campaignType=creative&sectionKey=creative-toolkit` | public
- `GET /api/public/cms/season-cards?country={{country}}&destinationId={{destinationId}}&destinationSlug={{slug}}` | public
- `GET /api/public/cms/hero-sections?country={{country}}` | public
- `GET /public/cms/home?country={{country}}` | public
- `GET /public/cms/landing-places?country={{country}}` | public
- `GET /public/cms/destinations?country={{country}}&region={{region}}&category={{category}}&isPopular=true` | public
- `GET /public/cms/destinations/{{slug}}?country={{country}}` | public
- `GET /public/cms/destinations/{{slug}}/highlights?country={{country}}` | public
- `GET /public/cms/destinations/{{slug}}/media?country={{country}}` | public
- `GET /public/cms/destinations/{{slug}}/season-cards?country={{country}}` | public
- `GET /public/cms/destinations/{{slug}}/packages?country={{country}}` | public
- `GET /public/cms/packages/published?country={{country}}` | public
- `GET /public/cms/packages/main?country={{country}}` | public
- `GET /public/cms/packages/main/{{mainPackageId}}/sub?country={{country}}` | public
- `GET /public/cms/visa-destinations?country={{country}}` | public
- `GET /public/cms/visa-destinations/{{slug}}?country={{country}}` | public
- `GET /public/cms/visa-destinations/{{slug}}/details?country={{country}}&sectionType=overview` | public
- `GET /public/cms/featured-picks?country={{country}}&campaignType=featured&sectionKey=featured-hot-picks` | public
- `GET /public/cms/creative-toolkit?country={{country}}&campaignType=creative&sectionKey=creative-toolkit` | public
- `GET /public/cms/season-cards?country={{country}}&destinationId={{destinationId}}&destinationSlug={{slug}}` | public
- `GET /public/cms/hero-sections?country={{country}}` | public

## Negative Cases (6)

- `POST /api/auth/login` | public
- `GET /api/auth/me` | bearer
- `POST /api/leads` | bearer
- `GET /api/currency/convert` | public
- `POST /api/website-enquiries/capture` | public
- `GET /cms/destinations` | bearer

