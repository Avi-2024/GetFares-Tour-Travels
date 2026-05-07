# CMS Architecture for Get2Vacation Website Management

## Overview
This document outlines the architecture for managing Get2Vacation website content through a CMS system. The CMS will control dynamic elements on the website while maintaining compatibility with the existing CRM package management system.

---

## 1. Dynamic Elements to be Managed

### 1.1 Homepage Floating Cards (Landing Places)
- **Location**: Homepage hero section
- **Purpose**: Showcase 4 featured destinations
- **Table**: `landing_places`
- **CMS Screen**: Landing Page Management

### 1.2 Destinations
- **Location**: Destinations page & navbar
- **Purpose**: List all available travel destinations
- **Table**: `destinations`
- **CMS Screen**: Destinations Management

### 1.3 Destination Packages (Main Packages)
- **Location**: Individual destination detail pages
- **Purpose**: Display packages available for each destination
- **Tables**: `main_packages`, `destination_package_map`
- **CMS Screen**: Package Management (shared with CRM)

### 1.4 Best Time to Visit (Season Cards)
- **Location**: Destination detail pages
- **Purpose**: Show seasonal travel recommendations
- **Table**: `season_cards`
- **CMS Screen**: Destination Seasonal Info

### 1.5 Sub-Packages
- **Location**: Package detail pages
- **Purpose**: Show package variants/options
- **Table**: `sub_packages`
- **CMS Screen**: Package Variants Management

### 1.6 Destination Media Gallery
- **Location**: Destination detail pages
- **Purpose**: Display images and videos for destinations
- **Table**: `destination_media`
- **CMS Screen**: Destination Media Manager

### 1.7 Visa Service Destinations
- **Location**: Visa services page
- **Purpose**: Display visa service offerings
- **Table**: `visa_destinations`
- **CMS Screen**: Visa Services Management

---

## 2. Database Schema Architecture

### 2.1 Core Tables

#### `landing_places`
- Manages homepage floating cards
- Fields: name, description, image, tag, display_order, active status

#### `destinations`
- Central destination registry
- Enhanced with: description, rating, country, images
- Used by both CRM and CMS

#### `packages` (Shared Table)
- **Critical**: Used by both CRM and CMS
- CRM uses for quotation generation
- CMS uses for website display
- Fields include: `publish_to_website`, `website_slug` for CMS control

#### `main_packages`
- Links packages to be displayed as main offerings
- References `packages` table
- Hierarchy: Destination → Main Package → Sub Packages

#### `destination_package_map`
- Maps destinations to their main packages
- Enables multiple packages per destination

#### `sub_packages`
- Package variants under main packages
- References both `main_packages` and `packages`

#### `season_cards`
- Seasonal travel information per destination
- Includes: month ranges, descriptions, tags, icons

#### `destination_media`
- Images and videos for destinations
- Supports ordering and categorization

#### `visa_destinations`
- Visa service offerings
- Includes: processing time, requirements, pricing

---

## 3. Package Management Strategy

### 3.1 Shared Package Architecture

**Problem**: Packages table is used by both CRM (for quotations) and CMS (for website display)

**Solution**: Dual-purpose package system with clear separation

```
packages (base table)
├── CRM Usage: All packages for quotation generation
└── CMS Usage: Only packages with publish_to_website = true

main_packages (CMS hierarchy)
├── References packages.id
└── Used for website display hierarchy

sub_packages (CMS variants)
├── References main_packages.id
└── References packages.id for variant details
```

### 3.2 Package Workflow

#### CRM Flow:
1. Create package in CRM
2. Set pricing, inclusions, exclusions
3. Use for quotation generation
4. Optional: Mark `publish_to_website = true`

#### CMS Flow:
1. View all packages where `publish_to_website = true`
2. Create `main_package` entry for website hierarchy
3. Map to destination via `destination_package_map`
4. Add sub-packages if needed
5. Control display order and visibility

### 3.3 Preventing CRM Breakage

**Key Principles**:
- Never modify core `packages` table structure
- CRM queries filter by `is_deleted = false`
- CMS adds metadata, doesn't change core fields
- Use separate tables for CMS-specific relationships

**Safe Operations**:
- ✅ Add new columns to `packages` (with defaults)
- ✅ Create mapping tables (`main_packages`, `destination_package_map`)
- ✅ Use `publish_to_website` flag for filtering
- ❌ Don't remove existing columns
- ❌ Don't change existing constraints
- ❌ Don't modify CRM-critical fields without testing

---

## 4. CMS Frontend Screens

### 4.1 Dashboard
- Overview of published content
- Quick stats: destinations, packages, media items
- Recent changes log

### 4.2 Landing Page Management
- Manage 4 floating cards
- Drag-and-drop ordering
- Image upload
- Active/inactive toggle

### 4.3 Destinations Management
- List all destinations
- Add/edit destination details
- Upload destination images
- Set rating, country, description
- Activate/deactivate

### 4.4 Destination Detail Editor
- **Season Cards**: Add/edit best time to visit
- **Media Gallery**: Upload images/videos with ordering
- **Package Mapping**: Link main packages to destination

### 4.5 Package Management
- View all published packages (from CRM)
- Create main package hierarchy
- Add sub-packages
- Set display order
- Preview on website

### 4.6 Visa Services Management
- Add/edit visa destinations
- Set processing time, requirements
- Upload visa-related images
- Manage pricing information

### 4.7 Media Library
- Centralized media management
- Upload images/videos
- Tag and categorize
- Usage tracking

---

## 5. Backend API Structure

### 5.1 CMS API Routes (`/backend/cms`)

```
/api/cms/landing-places
  GET    /           - List all landing places
  POST   /           - Create landing place
  PUT    /:id        - Update landing place
  DELETE /:id        - Delete landing place
  PATCH  /:id/order  - Update display order

/api/cms/destinations
  GET    /           - List all destinations
  POST   /           - Create destination
  PUT    /:id        - Update destination
  DELETE /:id        - Soft delete destination
  GET    /:id/media  - Get destination media
  POST   /:id/media  - Add media to destination

/api/cms/destinations/:id/seasons
  GET    /           - List season cards
  POST   /           - Create season card
  PUT    /:seasonId  - Update season card
  DELETE /:seasonId  - Delete season card

/api/cms/destinations/:id/packages
  GET    /           - Get mapped packages
  POST   /           - Map package to destination
  DELETE /:packageId - Unmap package

/api/cms/packages
  GET    /           - List published packages (from CRM)
  POST   /main       - Create main package entry
  PUT    /main/:id   - Update main package
  POST   /sub        - Create sub-package
  PUT    /sub/:id    - Update sub-package

/api/cms/visa-destinations
  GET    /           - List visa destinations
  POST   /           - Create visa destination
  PUT    /:id        - Update visa destination
  DELETE /:id        - Delete visa destination

/api/cms/media
  POST   /upload     - Upload media file
  GET    /           - List all media
  DELETE /:id        - Delete media
```

### 5.2 Public API Routes (for Get2Vacation website)

```
/api/public/landing
  GET /places       - Get active landing places

/api/public/destinations
  GET /             - List all active destinations
  GET /:slug        - Get destination details
  GET /:slug/media  - Get destination media
  GET /:slug/seasons - Get season cards
  GET /:slug/packages - Get destination packages

/api/public/packages
  GET /:id          - Get package details
  GET /:id/sub      - Get sub-packages

/api/public/visa
  GET /destinations - List visa destinations
  GET /:slug        - Get visa destination details
```

---

## 6. Data Flow Architecture

### 6.1 CRM → CMS Flow
```
CRM creates package
    ↓
Package saved in `packages` table
    ↓
CRM marks `publish_to_website = true`
    ↓
Package appears in CMS package list
    ↓
CMS admin creates `main_package` entry
    ↓
CMS admin maps to destination
    ↓
Package visible on website
```

### 6.2 CMS → Website Flow
```
CMS admin updates content
    ↓
Data saved to database
    ↓
Public API serves data
    ↓
Get2Vacation website fetches via API
    ↓
Content displayed to users
```

---

## 7. Implementation Phases

### Phase 1: Database Schema
- ✅ Create/update all CMS tables
- ✅ Add indexes for performance
- ✅ Set up foreign key relationships

### Phase 2: Backend API (CMS)
- Create CMS API routes
- Implement CRUD operations
- Add authentication/authorization
- File upload handling

### Phase 3: Backend API (Public)
- Create public API routes
- Optimize queries for performance
- Add caching layer
- API documentation

### Phase 4: CMS Frontend
- Build admin dashboard
- Create management screens
- Implement media library
- Add preview functionality

### Phase 5: Integration
- Connect Get2Vacation website to public API
- Replace hardcoded content with API calls
- Testing and optimization

---

## 8. Security Considerations

### 8.1 CMS Access
- Role-based access control (RBAC)
- Separate CMS users from CRM users
- Audit logging for all changes

### 8.2 API Security
- CMS API: JWT authentication required
- Public API: Rate limiting, CORS configuration
- Input validation and sanitization

### 8.3 Media Security
- File type validation
- Size limits
- Virus scanning
- CDN integration for serving

---

## 9. Performance Optimization

### 9.1 Database
- Indexes on frequently queried columns
- Materialized views for complex queries
- Connection pooling

### 9.2 API
- Response caching (Redis)
- Pagination for list endpoints
- Lazy loading for media

### 9.3 Frontend
- Image optimization and lazy loading
- API response caching
- CDN for static assets

---

## 10. Migration Strategy

### 10.1 Existing Data
- Import current destinations from CRM
- Migrate existing packages
- Preserve CRM functionality

### 10.2 Rollout
- Deploy database changes first
- Deploy backend APIs
- Deploy CMS frontend
- Update Get2Vacation website gradually

---

## 11. Monitoring & Maintenance

### 11.1 Monitoring
- API performance metrics
- Error tracking
- Usage analytics

### 11.2 Maintenance
- Regular database backups
- Media cleanup jobs
- Cache invalidation strategies

---

## 12. Future Enhancements

- Multi-language content support
- Content versioning and rollback
- Scheduled publishing
- A/B testing for content
- Analytics integration
- SEO optimization tools

---

## Conclusion

This architecture provides a scalable, maintainable solution for managing Get2Vacation website content while preserving CRM functionality. The key is the separation of concerns through the package hierarchy system and careful use of flags like `publish_to_website` to control visibility without breaking existing workflows.
