# System Architecture Diagram

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND APPLICATIONS                        │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│   CRM Frontend  │  CMS Frontend   │    Get2Vacation Website         │
│   (Existing)    │     (New)       │         (Existing)              │
│                 │                 │                                 │
│  - Leads        │  - Dashboard    │  - Homepage                     │
│  - Quotations   │  - Destinations │  - Destinations                 │
│  - Bookings     │  - Packages     │  - Packages                     │
│  - Packages     │  - Media        │  - Visa Services                │
│  - Payments     │  - Visa         │  - Contact                      │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         │ JWT Auth        │ JWT Auth        │ Public (No Auth)
         │                 │                 │
┌────────▼─────────────────▼─────────────────▼────────────────────────┐
│                         BACKEND API LAYER                            │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│   /api/crm/*    │   /api/cms/*    │      /api/public/*              │
│   (Existing)    │     (New)       │         (New)                   │
│                 │                 │                                 │
│  - Leads        │  - Landing      │  - Landing Places               │
│  - Quotations   │  - Destinations │  - Destinations                 │
│  - Bookings     │  - Packages     │  - Packages                     │
│  - Packages     │  - Media        │  - Visa Services                │
│  - Payments     │  - Visa         │  - Media                        │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         │                 │                 │ Redis Cache
         │                 │                 │
┌────────▼─────────────────▼─────────────────▼────────────────────────┐
│                      DATABASE (PostgreSQL)                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CRM TABLES (Existing)                     │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  users, roles, permissions, leads, quotations, bookings,    │   │
│  │  payments, customers, campaigns, suppliers, visa_cases      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 SHARED TABLE (CRM + CMS)                     │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  packages (used by both CRM for quotes & CMS for website)   │   │
│  │  destinations (enhanced for CMS, used by CRM)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CMS TABLES (New)                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  landing_places, destination_media, season_cards,           │   │
│  │  main_packages, destination_package_map, sub_packages,      │   │
│  │  visa_destinations, visa_destination_details,               │   │
│  │  featured_picks, cms_activity_log                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Package Hierarchy Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PACKAGE SYSTEM                               │
└─────────────────────────────────────────────────────────────────────┘

                            packages (base table)
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                CRM Usage                       CMS Usage
                    │                               │
        ┌───────────┴───────────┐       ┌──────────┴──────────┐
        │                       │       │                     │
    Quotations            Package   publish_to_website    main_packages
    Generation            Enquiries      = true               │
        │                       │           │                 │
        │                       │           │         ┌───────┴───────┐
        │                       │           │         │               │
        └───────────────────────┴───────────┘   destination_    sub_packages
                                                 package_map
                                                      │
                                                      │
                                            Get2Vacation Website
```

### Flow Explanation:

1. **CRM Creates Package**
   - Package saved in `packages` table
   - Used for quotation generation
   - Can be marked `publish_to_website = true`

2. **CMS Layer**
   - Reads packages WHERE `publish_to_website = true`
   - Creates `main_packages` entry (adds display order, featured flag)
   - Maps to destinations via `destination_package_map`
   - Adds variants via `sub_packages`

3. **Website Display**
   - Queries through CMS hierarchy
   - Joins back to `packages` for full details
   - Displays to end users

---

## Data Flow Diagrams

### 1. CRM Package Creation Flow

```
┌──────────────┐
│ CRM User     │
│ Creates      │
│ Package      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /api/crm/packages               │
│                                      │
│ {                                    │
│   name: "Maldives Luxury",           │
│   destination: "Maldives",           │
│   baseCost: 75000,                   │
│   markupPercent: 20,                 │
│   startingPrice: 90000,              │
│   publishToWebsite: true             │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ packages.service.js                  │
│ - Validates data                     │
│ - Calculates pricing                 │
│ - Saves to database                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ INSERT INTO packages                 │
│ (name, destination, base_cost,       │
│  markup_percent, starting_price,     │
│  publish_to_website, ...)            │
└──────┬───────────────────────────────┘
       │
       ├─────────────────┬──────────────┐
       ▼                 ▼              ▼
┌─────────────┐   ┌─────────────┐  ┌──────────┐
│ Available   │   │ Available   │  │ Visible  │
│ for CRM     │   │ for CMS     │  │ on       │
│ Quotations  │   │ (if true)   │  │ Website  │
└─────────────┘   └─────────────┘  └──────────┘
```

### 2. CMS Package Mapping Flow

```
┌──────────────┐
│ CMS Admin    │
│ Maps Package │
│ to Dest.     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /api/cms/destinations/:id/      │
│      packages                        │
│                                      │
│ {                                    │
│   packageId: "uuid-123",             │
│   displayOrder: 1,                   │
│   isFeatured: true                   │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ cms-packages.service.js              │
│ 1. Create main_package entry         │
│ 2. Create destination_package_map    │
└──────┬───────────────────────────────┘
       │
       ├─────────────────┬──────────────┐
       ▼                 ▼              │
┌─────────────────┐  ┌──────────────────┤
│ INSERT INTO     │  │ INSERT INTO      │
│ main_packages   │  │ destination_     │
│ (package_id,    │  │ package_map      │
│  display_order, │  │ (destination_id, │
│  is_featured)   │  │  main_package_id)│
└─────────────────┘  └──────────────────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Package now     │
       │ visible on      │
       │ destination     │
       │ page            │
       └─────────────────┘
```

### 3. Website Display Flow

```
┌──────────────┐
│ User Visits  │
│ Destination  │
│ Page         │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ GET /api/public/destinations/        │
│     maldives/packages                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ public-api.service.js                │
│ - Find destination by slug           │
│ - Get mapped packages                │
│ - Join with package details          │
│ - Return formatted data              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ SQL Query:                           │
│                                      │
│ SELECT p.*, mp.display_order,        │
│        mp.is_featured                │
│ FROM destination_package_map dpm     │
│ JOIN main_packages mp                │
│   ON dpm.main_package_id = mp.id     │
│ JOIN packages p                      │
│   ON mp.package_id = p.id            │
│ WHERE dpm.destination_id = ?         │
│   AND p.publish_to_website = true    │
│   AND p.is_deleted = false           │
│ ORDER BY dpm.display_order           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Response:                            │
│ [                                    │
│   {                                  │
│     id: "uuid-123",                  │
│     name: "Maldives Luxury Escape",  │
│     duration: "5N/6D",               │
│     startingPrice: 90000,            │
│     isFeatured: true,                │
│     displayOrder: 1                  │
│   },                                 │
│   ...                                │
│ ]                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Website renders package cards        │
└──────────────────────────────────────┘
```

---

## Database Relationships

```
destinations
    │
    ├─── destination_media (1:N)
    │    └─── media_type, media_url, display_order
    │
    ├─── season_cards (1:N)
    │    └─── title, from_month, to_month, description
    │
    └─── destination_package_map (1:N)
         └─── main_packages (N:1)
              ├─── packages (N:1) [SHARED WITH CRM]
              │    └─── name, price, inclusions, etc.
              │
              └─── sub_packages (1:N)
                   └─── packages (N:1) [SHARED WITH CRM]

visa_destinations
    │
    └─── visa_destination_details (1:N)
         └─── section_type, label, value

landing_places (standalone)
    └─── name, image_url, tag, display_order

featured_picks (standalone)
    └─── title, category, reference_id, image_url
```

---

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ROLES & PERMISSIONS                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ CRM Users (Existing)                                       │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ - Sales Agents: Create leads, quotations                   │    │
│  │ - Managers: Approve quotations, view reports               │    │
│  │ - Admins: Full CRM access                                  │    │
│  │                                                             │    │
│  │ Access: /api/crm/* (JWT authenticated)                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ CMS Users (New)                                            │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ - Content Editors: Manage destinations, media              │    │
│  │ - Marketing: Manage landing page, featured picks           │    │
│  │ - CMS Admins: Full CMS access                              │    │
│  │                                                             │    │
│  │ Access: /api/cms/* (JWT authenticated)                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Public (Website Visitors)                                  │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ - No authentication required                               │    │
│  │ - Read-only access to published content                    │    │
│  │                                                             │    │
│  │ Access: /api/public/* (No auth, rate limited)              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  CRM Frontend    │     │  CMS Frontend    │     │  Get2Vacation    │
│  (Vercel)        │     │  (Vercel/Netlify)│     │  Website         │
│                  │     │                  │     │  (Vercel)        │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Load Balancer / CDN    │
                    │   (Cloudflare/AWS)       │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │   Backend API Server     │
                    │   (Node.js/Express)      │
                    │   (AWS EC2/Heroku)       │
                    └──────────┬───────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │PostgreSQL│   │  Redis   │   │   S3     │
        │ Database │   │  Cache   │   │  Media   │
        │          │   │          │   │  Storage │
        └──────────┘   └──────────┘   └──────────┘
```

---

## Summary

This architecture provides:

✅ **Separation of Concerns** - CRM, CMS, and Website are independent
✅ **Shared Data Model** - Single source of truth for packages
✅ **Non-Breaking Design** - CRM continues to work unchanged
✅ **Scalability** - Can handle growth in content and traffic
✅ **Security** - Proper authentication and authorization
✅ **Performance** - Caching and optimized queries
✅ **Maintainability** - Clear structure and documentation

The system is designed to be flexible, allowing for future enhancements without major architectural changes.
