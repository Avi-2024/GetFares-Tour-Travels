# CMS API Summary

Generated at: 2026-04-17T10:29:56.455Z

## Scope

- Included: CMS admin routes (/cms/*), website public CMS routes (/api/public/cms/* and /public/cms/*), legacy CMS app routes (/api/cms/landing-places*, /api/public/landing/places, /health), and auth routes for CMS token flow (/api/auth/*).
- Excluded: all non-CMS CRM business modules (leads, bookings, payments, suppliers, etc.).

## Modules

- auth: 5 endpoints
- cms-admin: 42 endpoints
- legacy-cms: 2 endpoints
- website-api-public-cms: 16 endpoints
- website-public-cms: 16 endpoints

## Endpoints

- POST /api/auth/login | module=auth | auth=none | source=backend/crm/modules/auth/auth.routes.js
- POST /api/auth/logout | module=auth | auth=bearer | source=backend/crm/modules/auth/auth.routes.js
- GET /api/auth/me | module=auth | auth=bearer | source=backend/crm/modules/auth/auth.routes.js
- POST /api/auth/register | module=auth | auth=none | source=backend/crm/modules/auth/auth.routes.js
- POST /api/auth/toggle-active | module=auth | auth=bearer | source=backend/crm/modules/auth/auth.routes.js
- DELETE /cms/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/landing/landing.routes.js
- PATCH /cms/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/landing/landing.routes.js
- PATCH /cms/:id/status | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/landing/landing.routes.js
- GET /cms/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/landing/landing.routes.js
- GET /cms/destinations | module=cms-admin | auth=bearer | source=backend/cms/modules/destinations/destinations.routes.js
- POST /cms/destinations | module=cms-admin | auth=bearer | source=backend/cms/modules/destinations/destinations.routes.js
- DELETE /cms/destinations/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/destinations/destinations.routes.js
- DELETE /cms/destinations/:id/media/:mediaId/hard-delete | module=cms-admin | auth=bearer params=[id, mediaId] | source=backend/cms/modules/destinations/destinations.routes.js
- PATCH /cms/destinations/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/destinations/destinations.routes.js
- DELETE /cms/destinations/:id/seasons/:seasonId/hard-delete | module=cms-admin | auth=bearer params=[id, seasonId] | source=backend/cms/modules/destinations/destinations.routes.js
- PATCH /cms/destinations/:id/status | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/destinations/destinations.routes.js
- GET /cms/destinations/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/destinations/destinations.routes.js
- GET /cms/destinations/slug/:slug | module=cms-admin | auth=bearer params=[slug] | source=backend/cms/modules/destinations/destinations.routes.js
- DELETE /cms/experience/creative-toolkit/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- PATCH /cms/experience/creative-toolkit/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- GET /cms/experience/creative-toolkit/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/experience/experience.routes.js
- DELETE /cms/experience/featured-picks/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- PATCH /cms/experience/featured-picks/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- GET /cms/experience/featured-picks/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/experience/experience.routes.js
- GET /cms/experience/hero-sections | module=cms-admin | auth=bearer | source=backend/cms/modules/experience/experience.routes.js
- DELETE /cms/experience/season-cards/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- PATCH /cms/experience/season-cards/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/experience/experience.routes.js
- GET /cms/experience/season-cards/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/experience/experience.routes.js
- PATCH /cms/media/:id/status | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/media/media.routes.js
- POST /cms/media/upload | module=cms-admin | auth=bearer uploads=[file] | source=backend/cms/modules/media/media.routes.js
- DELETE /cms/packages/main/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- PATCH /cms/packages/main/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- GET /cms/packages/main/:mainPackageId/sub | module=cms-admin | auth=bearer params=[mainPackageId] | source=backend/cms/modules/packages/packages.routes.js
- GET /cms/packages/main/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/packages/packages.routes.js
- DELETE /cms/packages/published/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- PATCH /cms/packages/published/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- GET /cms/packages/published/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/packages/packages.routes.js
- POST /cms/packages/sub | module=cms-admin | auth=bearer uploads=[files[]] | source=backend/cms/modules/packages/packages.routes.js
- DELETE /cms/packages/sub/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- PATCH /cms/packages/sub/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/packages/packages.routes.js
- GET /cms/packages/sub/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/packages/packages.routes.js
- PATCH /cms/reorder | module=cms-admin | auth=bearer | source=backend/cms/modules/landing/landing.routes.js
- DELETE /cms/visa/:id/hard-delete | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/visa/visa.routes.js
- PATCH /cms/visa/:id/restore | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/visa/visa.routes.js
- PATCH /cms/visa/:id/status | module=cms-admin | auth=bearer params=[id] | source=backend/cms/modules/visa/visa.routes.js
- GET /cms/visa/deleted | module=cms-admin | auth=bearer | source=backend/cms/modules/visa/visa.routes.js
- GET /cms/visa/slug/:slug | module=cms-admin | auth=bearer params=[slug] | source=backend/cms/modules/visa/visa.routes.js
- GET /api/public/landing/places | module=legacy-cms | auth=none | source=backend/cms/CmsApplication.js
- GET /health | module=legacy-cms | auth=none | source=backend/cms/CmsApplication.js
- GET /api/public/cms/creative-toolkit | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/destinations | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/destinations/:slug | module=website-api-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/destinations/:slug/media | module=website-api-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/destinations/:slug/packages | module=website-api-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/featured-picks | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/hero-sections | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/home | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/landing-places | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/packages/main | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/packages/main/:mainPackageId/sub | module=website-api-public-cms | auth=none params=[mainPackageId] | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/packages/published | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/season-cards | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/visa-destinations | module=website-api-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/visa-destinations/:slug | module=website-api-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /api/public/cms/visa-destinations/:slug/details | module=website-api-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/creative-toolkit | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/destinations | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/destinations/:slug | module=website-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/destinations/:slug/media | module=website-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/destinations/:slug/packages | module=website-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/featured-picks | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/hero-sections | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/home | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/landing-places | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/packages/main | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/packages/main/:mainPackageId/sub | module=website-public-cms | auth=none params=[mainPackageId] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/packages/published | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/season-cards | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/visa-destinations | module=website-public-cms | auth=none | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/visa-destinations/:slug | module=website-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js
- GET /public/cms/visa-destinations/:slug/details | module=website-public-cms | auth=none params=[slug] | source=backend/cms/modules/public/public.routes.js

## Assumptions

- Request body/query examples are inferred where explicit validation schemas are not exposed in route files.
- Response examples are representative envelopes and may differ from runtime controller payload shape.
- If a route is implemented but guarded dynamically in middleware, auth is inferred from mount and route conventions.
