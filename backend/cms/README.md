# CMS Backend API

Complete backend implementation for Get2Vacation CMS system.

## Structure

```
cms/
├── core/
│   ├── config/          # Configuration
│   ├── utils/           # Utility functions
│   └── middlewares/     # Express middlewares
├── modules/
│   ├── landing/         # Landing places management
│   ├── destinations/    # Destinations management
│   ├── packages/        # Package hierarchy management
│   └── visa/            # Visa services management
└── index.js             # Main CMS app
```

## API Endpoints

### CMS API (Admin - Requires Auth)

#### Landing Places

```
GET    /api/cms/landing-places
GET    /api/cms/landing-places/:id
POST   /api/cms/landing-places
PUT    /api/cms/landing-places/:id
DELETE /api/cms/landing-places/:id
PATCH  /api/cms/landing-places/reorder
```

#### Destinations

```
GET    /api/cms/destinations
GET    /api/cms/destinations/:id
GET    /api/cms/destinations/slug/:slug
POST   /api/cms/destinations
PUT    /api/cms/destinations/:id

# Media
GET    /api/cms/destinations/:id/media
POST   /api/cms/destinations/:id/media
PUT    /api/cms/destinations/:id/media/:mediaId
DELETE /api/cms/destinations/:id/media/:mediaId

# Seasons
GET    /api/cms/destinations/:id/seasons
POST   /api/cms/destinations/:id/seasons
PUT    /api/cms/destinations/:id/seasons/:seasonId
DELETE /api/cms/destinations/:id/seasons/:seasonId

# Packages
GET    /api/cms/destinations/:id/packages
POST   /api/cms/destinations/:id/packages
DELETE /api/cms/destinations/:id/packages/:mapId
```

#### Packages

```
GET    /api/cms/packages/published
GET    /api/cms/packages/published/:id

# Main Packages
GET    /api/cms/packages/main
GET    /api/cms/packages/main/:id
POST   /api/cms/packages/main
PUT    /api/cms/packages/main/:id
DELETE /api/cms/packages/main/:id

# Sub Packages
GET    /api/cms/packages/main/:mainPackageId/sub
POST   /api/cms/packages/sub
PUT    /api/cms/packages/sub/:id
DELETE /api/cms/packages/sub/:id
```

#### Visa Destinations

```
GET    /api/cms/visa-destinations
GET    /api/cms/visa-destinations/:id
GET    /api/cms/visa-destinations/slug/:slug
POST   /api/cms/visa-destinations
PUT    /api/cms/visa-destinations/:id
DELETE /api/cms/visa-destinations/:id

# Details
GET    /api/cms/visa-destinations/:id/details
POST   /api/cms/visa-destinations/:id/details
PUT    /api/cms/visa-destinations/:id/details/:detailId
DELETE /api/cms/visa-destinations/:id/details/:detailId
```

### Public API (Website - No Auth)

```
GET /public/cms/home
GET /public/cms/landing-places
GET /public/cms/destinations
GET /public/cms/destinations/:slug
GET /public/cms/destinations/:slug/media
GET /public/cms/destinations/:slug/season-cards
GET /public/cms/destinations/:slug/packages
GET /public/cms/packages/published
GET /public/cms/packages/main
GET /public/cms/packages/main/:mainPackageId/sub
GET /public/cms/visa-destinations
GET /public/cms/visa-destinations/:slug
GET /public/cms/visa-destinations/:slug/details
GET /public/cms/featured-picks
GET /public/cms/season-cards
GET /public/cms/hero-sections
```

Alias prefix also available: `/api/public/cms/*`

## Usage

### Standalone

```javascript
import { createCmsApp } from "./cms/index.js";

const { app, db, modules, logger } = createCmsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`CMS API running on port ${PORT}`);
});
```

### Integrated with existing backend

```javascript
import express from "express";
import { createCmsApp } from "./cms/index.js";

const mainApp = express();
const { app: cmsApp } = createCmsApp();

// Mount CMS routes
mainApp.use(cmsApp);

// Other routes...
```

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/db
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
```

## Features

- ✅ Complete CRUD operations for all entities
- ✅ Slug generation and validation
- ✅ Hierarchical package system
- ✅ Media management
- ✅ Season cards management
- ✅ Visa services with details
- ✅ Public API for website
- ✅ Error handling
- ✅ Request logging
- ✅ Health check endpoint

## Testing

```bash
# Test landing places
curl http://localhost:3000/api/cms/landing-places

# Test destinations
curl http://localhost:3000/api/cms/destinations

# Test public API
curl http://localhost:3000/api/public/landing/places
```

## Notes

- All `/cms/*` routes require authentication and `CMS_ACCESS` role
- CMS users are stored in the shared CRM `users` table
- Public API routes are open for website consumption
- Uses existing CRM database connection
- Compatible with CRM package system
