# CMS Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing the CMS system for Get2Vacation website management.

---

## Prerequisites

- PostgreSQL database
- Node.js backend (Express)
- React frontend for CMS
- Existing CRM system running

---

## Phase 1: Database Setup

### Step 1.1: Backup Current Database
```bash
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d).sql
```

### Step 1.2: Run Package Migration
```bash
psql -U your_user -d your_database -f backend/database/migrations/001_add_crm_package_fields.sql
```

This adds missing CRM fields to the packages table safely.

### Step 1.3: Deploy CMS Schema
```bash
psql -U your_user -d your_database -f backend/database/cms-schema.sql
```

This creates all CMS-specific tables.

### Step 1.4: Verify Tables
```sql
-- Check all CMS tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'landing_places',
    'destinations',
    'destination_media',
    'season_cards',
    'main_packages',
    'destination_package_map',
    'sub_packages',
    'visa_destinations',
    'visa_destination_details',
    'featured_picks',
    'cms_activity_log'
);
```

---

## Phase 2: Backend API Development

### Step 2.1: Create CMS Module Structure
```
backend/cms/
├── modules/
│   ├── landing/
│   │   ├── landing.controller.js
│   │   ├── landing.service.js
│   │   ├── landing.repository.js
│   │   ├── landing.routes.js
│   │   └── landing.validation.js
│   ├── destinations/
│   │   ├── destinations.controller.js
│   │   ├── destinations.service.js
│   │   ├── destinations.repository.js
│   │   ├── destinations.routes.js
│   │   └── destinations.validation.js
│   ├── packages/
│   │   ├── cms-packages.controller.js
│   │   ├── cms-packages.service.js
│   │   ├── cms-packages.repository.js
│   │   ├── cms-packages.routes.js
│   │   └── cms-packages.validation.js
│   ├── visa/
│   │   ├── visa.controller.js
│   │   ├── visa.service.js
│   │   ├── visa.repository.js
│   │   ├── visa.routes.js
│   │   └── visa.validation.js
│   └── media/
│       ├── media.controller.js
│       ├── media.service.js
│       └── media.routes.js
└── index.js
```

### Step 2.2: Implement Landing Places API

**landing.repository.js**
```javascript
export function createLandingRepository({ db }) {
  return {
    async findAll() {
      return db.query(
        'SELECT * FROM landing_places WHERE is_active = true ORDER BY display_order'
      );
    },
    
    async create(data) {
      return db.insert('landing_places', data);
    },
    
    async update(id, data) {
      return db.update('landing_places', id, data);
    },
    
    async delete(id) {
      return db.update('landing_places', id, { is_active: false });
    }
  };
}
```

**landing.service.js**
```javascript
export function createLandingService({ repository }) {
  return {
    async list() {
      const places = await repository.findAll();
      return places.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        tag: p.tag,
        imageUrl: p.image_url,
        displayOrder: p.display_order
      }));
    },
    
    async create(data) {
      return repository.create({
        name: data.name,
        description: data.description,
        tag: data.tag,
        image_url: data.imageUrl,
        display_order: data.displayOrder || 0,
        is_active: true
      });
    }
  };
}
```

**landing.routes.js**
```javascript
import express from 'express';

export function createLandingRoutes({ controller, auth }) {
  const router = express.Router();
  
  router.get('/', controller.list);
  router.post('/', auth.required, controller.create);
  router.put('/:id', auth.required, controller.update);
  router.delete('/:id', auth.required, controller.delete);
  
  return router;
}
```

### Step 2.3: Implement Destinations API

**destinations.service.js**
```javascript
export function createDestinationsService({ repository, mediaRepository }) {
  return {
    async list(filters = {}) {
      const destinations = await repository.findAll(filters);
      return destinations.map(d => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        description: d.description,
        country: d.country,
        rating: d.rating,
        heroImageUrl: d.hero_image_url,
        isPopular: d.is_popular,
        isNew: d.is_new
      }));
    },
    
    async getBySlug(slug) {
      const destination = await repository.findBySlug(slug);
      if (!destination) throw new Error('Destination not found');
      
      const media = await mediaRepository.findByDestination(destination.id);
      const seasons = await repository.getSeasonCards(destination.id);
      
      return {
        ...destination,
        media,
        seasons
      };
    },
    
    async addMedia(destinationId, mediaData) {
      return mediaRepository.create({
        destination_id: destinationId,
        media_type: mediaData.type,
        media_url: mediaData.url,
        thumbnail_url: mediaData.thumbnail,
        title: mediaData.title,
        display_order: mediaData.order || 0
      });
    }
  };
}
```

### Step 2.4: Implement CMS Packages API

**cms-packages.service.js**
```javascript
export function createCmsPackagesService({ 
  packageRepository, 
  mainPackageRepository,
  destinationMapRepository 
}) {
  return {
    // Get all published packages from CRM
    async listPublished() {
      return packageRepository.findPublished();
    },
    
    // Create main package entry for CMS
    async createMainPackage(packageId, data) {
      const mainPackage = await mainPackageRepository.create({
        package_id: packageId,
        display_order: data.displayOrder || 0,
        is_featured: data.isFeatured || false
      });
      
      return mainPackage;
    },
    
    // Map package to destination
    async mapToDestination(mainPackageId, destinationId, order = 0) {
      return destinationMapRepository.create({
        destination_id: destinationId,
        main_package_id: mainPackageId,
        display_order: order
      });
    },
    
    // Get packages for a destination
    async getDestinationPackages(destinationId) {
      return destinationMapRepository.findByDestination(destinationId);
    }
  };
}
```

### Step 2.5: Create Public API for Website

**public-api.routes.js**
```javascript
import express from 'express';

export function createPublicApiRoutes({ services }) {
  const router = express.Router();
  
  // Landing page data
  router.get('/landing/places', async (req, res) => {
    const places = await services.landing.list();
    res.json(places);
  });
  
  // Destinations
  router.get('/destinations', async (req, res) => {
    const destinations = await services.destinations.list(req.query);
    res.json(destinations);
  });
  
  router.get('/destinations/:slug', async (req, res) => {
    const destination = await services.destinations.getBySlug(req.params.slug);
    res.json(destination);
  });
  
  router.get('/destinations/:slug/packages', async (req, res) => {
    const packages = await services.packages.getByDestinationSlug(req.params.slug);
    res.json(packages);
  });
  
  // Visa destinations
  router.get('/visa/destinations', async (req, res) => {
    const visaDestinations = await services.visa.list();
    res.json(visaDestinations);
  });
  
  router.get('/visa/:slug', async (req, res) => {
    const visaDestination = await services.visa.getBySlug(req.params.slug);
    res.json(visaDestination);
  });
  
  return router;
}
```

---

## Phase 3: CMS Frontend Development

### Step 3.1: Create CMS Dashboard

**Dashboard.tsx**
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['cms-stats'],
    queryFn: () => fetch('/api/cms/stats').then(r => r.json())
  });
  
  return (
    <div className="dashboard">
      <h1>CMS Dashboard</h1>
      <div className="stats-grid">
        <StatCard title="Destinations" value={stats?.destinations || 0} />
        <StatCard title="Packages" value={stats?.packages || 0} />
        <StatCard title="Media Items" value={stats?.media || 0} />
        <StatCard title="Visa Services" value={stats?.visaServices || 0} />
      </div>
    </div>
  );
}
```

### Step 3.2: Landing Places Manager

**LandingPlacesManager.tsx**
```typescript
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function LandingPlacesManager() {
  const { data: places } = useQuery({
    queryKey: ['landing-places'],
    queryFn: () => fetch('/api/cms/landing-places').then(r => r.json())
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => 
      fetch('/api/cms/landing-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
  });
  
  return (
    <div>
      <h2>Landing Places</h2>
      <button onClick={() => setShowForm(true)}>Add New</button>
      <div className="places-grid">
        {places?.map(place => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </div>
  );
}
```

### Step 3.3: Destination Editor

**DestinationEditor.tsx**
```typescript
import React from 'react';
import { useParams } from 'react-router-dom';

export function DestinationEditor() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('details');
  
  return (
    <div className="destination-editor">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="details">Details</Tab>
        <Tab value="media">Media Gallery</Tab>
        <Tab value="seasons">Best Time to Visit</Tab>
        <Tab value="packages">Packages</Tab>
      </Tabs>
      
      {activeTab === 'details' && <DestinationDetailsForm id={id} />}
      {activeTab === 'media' && <MediaGalleryManager destinationId={id} />}
      {activeTab === 'seasons' && <SeasonCardsManager destinationId={id} />}
      {activeTab === 'packages' && <PackageMapper destinationId={id} />}
    </div>
  );
}
```

---

## Phase 4: Integration with Get2Vacation Website

### Step 4.1: Update Get2Vacation to Use API

**Before (Hardcoded)**
```typescript
// indiaSiteContent.ts
export const homeFloatingCards = [
  { name: "Switzerland", tag: "Luxury", image: "..." },
  // ...
];
```

**After (API-driven)**
```typescript
// hooks/useLandingPlaces.ts
export function useLandingPlaces() {
  return useQuery({
    queryKey: ['landing-places'],
    queryFn: () => 
      fetch('https://api.get2vacation.in/public/landing/places')
        .then(r => r.json())
  });
}

// LandingPage.tsx
function LandingPage() {
  const { data: places } = useLandingPlaces();
  
  return (
    <HeroSection floatingCards={places || []} />
  );
}
```

### Step 4.2: Update Destinations Page

```typescript
// hooks/useDestinations.ts
export function useDestinations(filters) {
  return useQuery({
    queryKey: ['destinations', filters],
    queryFn: () => 
      fetch(`https://api.get2vacation.in/public/destinations?${new URLSearchParams(filters)}`)
        .then(r => r.json())
  });
}
```

### Step 4.3: Update Destination Detail Page

```typescript
// pages/DestinationDetail.tsx
export function DestinationDetail() {
  const { slug } = useParams();
  const { data: destination } = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => 
      fetch(`https://api.get2vacation.in/public/destinations/${slug}`)
        .then(r => r.json())
  });
  
  return (
    <>
      <HeroSection destination={destination} />
      <MediaGallery media={destination?.media} />
      <SeasonSection seasons={destination?.seasons} />
      <PackagesSection packages={destination?.packages} />
    </>
  );
}
```

---

## Phase 5: Testing & Deployment

### Step 5.1: Test CRM Compatibility
```bash
# Run CRM tests
npm test -- crm/packages

# Verify:
# - Create package
# - Update package
# - Generate quotation
# - Publish to website
```

### Step 5.2: Test CMS Operations
```bash
# Run CMS tests
npm test -- cms

# Verify:
# - CRUD operations on all entities
# - File uploads
# - Package mapping
```

### Step 5.3: Test Website Integration
```bash
# Run E2E tests
npm run test:e2e

# Verify:
# - Homepage loads with dynamic data
# - Destinations page filters work
# - Destination detail pages display correctly
# - Visa services page works
```

### Step 5.4: Deploy
```bash
# Deploy database changes
psql -U prod_user -d prod_db -f migrations/001_add_crm_package_fields.sql
psql -U prod_user -d prod_db -f cms-schema.sql

# Deploy backend
npm run build
pm2 restart backend

# Deploy CMS frontend
cd cms-frontend
npm run build
# Upload to hosting

# Deploy Get2Vacation updates
cd get2vacation/frontendin
npm run build
# Upload to Vercel
```

---

## Monitoring & Maintenance

### Monitor API Performance
```javascript
// Add logging middleware
app.use('/api/public', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});
```

### Set Up Caching
```javascript
// Redis caching for public API
import Redis from 'ioredis';
const redis = new Redis();

async function getCachedDestinations() {
  const cached = await redis.get('destinations:all');
  if (cached) return JSON.parse(cached);
  
  const destinations = await db.query('SELECT * FROM destinations WHERE is_active = true');
  await redis.setex('destinations:all', 3600, JSON.stringify(destinations));
  
  return destinations;
}
```

---

## Troubleshooting

### Issue: CRM packages not showing in CMS
**Solution**: Ensure `publish_to_website = true` on packages

### Issue: Website not updating after CMS changes
**Solution**: Clear cache or reduce cache TTL

### Issue: Images not loading
**Solution**: Check CORS settings and CDN configuration

---

## Next Steps

1. ✅ Review architecture documents
2. ✅ Run database migrations
3. ✅ Implement backend APIs
4. ✅ Build CMS frontend
5. ✅ Update Get2Vacation website
6. ✅ Test thoroughly
7. ✅ Deploy to production

For questions or issues, refer to:
- `CMS_ARCHITECTURE.md` - Full architecture details
- `CRM_COMPATIBILITY.md` - CRM integration guide
