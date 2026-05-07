# Quick Reference Guide

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **PROJECT_SUMMARY.md** | Executive overview | Start here - understand the big picture |
| **CMS_ARCHITECTURE.md** | Detailed architecture | Planning implementation, understanding design decisions |
| **CRM_COMPATIBILITY.md** | CRM integration guide | Before modifying packages table, understanding shared data |
| **IMPLEMENTATION_GUIDE.md** | Step-by-step guide | During development, deployment |
| **CMS_SCREENS.md** | UI specifications | Building frontend, understanding user flows |
| **ARCHITECTURE_DIAGRAMS.md** | Visual diagrams | Understanding data flow, system relationships |
| **This File** | Quick reference | Quick lookups, common tasks |

---

## 🚀 Quick Start

### 1. First Time Setup
```bash
# Backup database
pg_dump -U user -d database > backup.sql

# Run migrations
psql -U user -d database -f backend/database/migrations/001_add_crm_package_fields.sql
psql -U user -d database -f backend/database/cms-schema.sql

# Verify
psql -U user -d database -c "\dt" | grep -E "(landing_places|destinations|main_packages)"
```

### 2. Verify CRM Still Works
```bash
# Test CRM package operations
npm test -- crm/packages

# Or manually test:
# - Create package in CRM
# - Generate quotation
# - Verify no errors
```

### 3. Start Development
```bash
# Backend
cd backend
npm install
npm run dev

# CMS Frontend
cd cms-frontend
npm install
npm run dev

# Get2Vacation Website
cd get2vacation/frontendin
npm install
npm run dev
```

---

## 📋 Common Tasks

### Add New Landing Place
```javascript
// POST /api/cms/landing-places
{
  "name": "Switzerland",
  "description": "Alpine paradise",
  "tag": "Luxury",
  "imageUrl": "https://...",
  "displayOrder": 1
}
```

### Create Destination
```javascript
// POST /api/cms/destinations
{
  "name": "Maldives",
  "slug": "maldives",
  "description": "Tropical paradise...",
  "country": "Maldives",
  "region": "Asia",
  "category": "Honeymoon",
  "rating": 4.9,
  "heroImageUrl": "https://...",
  "isPopular": true,
  "isActive": true
}
```

### Map Package to Destination
```javascript
// 1. Create main package entry
// POST /api/cms/packages/main
{
  "packageId": "uuid-from-crm",
  "displayOrder": 1,
  "isFeatured": true
}

// 2. Map to destination
// POST /api/cms/destinations/:destinationId/packages
{
  "mainPackageId": "uuid-from-step-1",
  "displayOrder": 1
}
```

### Add Season Card
```javascript
// POST /api/cms/destinations/:id/seasons
{
  "title": "Summer",
  "fromMonth": "Jun",
  "toMonth": "Aug",
  "description": "Best time to visit...",
  "tag": "Best Time",
  "iconName": "sun",
  "iconColor": "#f59e0b",
  "bgColor": "#fef3c7",
  "displayOrder": 1
}
```

### Upload Media
```javascript
// POST /api/cms/destinations/:id/media
// Content-Type: multipart/form-data
{
  "file": [binary],
  "mediaType": "image",
  "title": "Beach view",
  "displayOrder": 1,
  "isFeatured": true
}
```

---

## 🗄️ Database Quick Reference

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `landing_places` | Homepage cards | name, image_url, tag, display_order |
| `destinations` | Destinations | name, slug, description, rating, is_active |
| `destination_media` | Media gallery | destination_id, media_url, display_order |
| `season_cards` | Best time to visit | destination_id, title, from_month, to_month |
| `packages` | **SHARED** with CRM | name, starting_price, publish_to_website |
| `main_packages` | CMS hierarchy | package_id, display_order, is_featured |
| `destination_package_map` | Dest ↔ Package | destination_id, main_package_id |
| `sub_packages` | Package variants | main_package_id, package_id |
| `visa_destinations` | Visa services | title, slug, processing_time |

### Important Queries

**Get all published packages:**
```sql
SELECT * FROM packages 
WHERE publish_to_website = true 
  AND is_deleted = false;
```

**Get destination with packages:**
```sql
SELECT d.*, p.name as package_name, p.starting_price
FROM destinations d
JOIN destination_package_map dpm ON d.id = dpm.destination_id
JOIN main_packages mp ON dpm.main_package_id = mp.id
JOIN packages p ON mp.package_id = p.id
WHERE d.slug = 'maldives'
  AND d.is_active = true
  AND p.publish_to_website = true
ORDER BY dpm.display_order;
```

**Get destination media:**
```sql
SELECT * FROM destination_media
WHERE destination_id = 'uuid'
ORDER BY is_featured DESC, display_order ASC;
```

**Get season cards:**
```sql
SELECT * FROM season_cards
WHERE destination_id = 'uuid'
ORDER BY display_order;
```

---

## 🔌 API Endpoints

### CMS API (Admin - Requires Auth)

```
Landing Places:
  GET    /api/cms/landing-places
  POST   /api/cms/landing-places
  PUT    /api/cms/landing-places/:id
  DELETE /api/cms/landing-places/:id

Destinations:
  GET    /api/cms/destinations
  POST   /api/cms/destinations
  PUT    /api/cms/destinations/:id
  DELETE /api/cms/destinations/:id
  
  GET    /api/cms/destinations/:id/media
  POST   /api/cms/destinations/:id/media
  DELETE /api/cms/destinations/:id/media/:mediaId
  
  GET    /api/cms/destinations/:id/seasons
  POST   /api/cms/destinations/:id/seasons
  PUT    /api/cms/destinations/:id/seasons/:seasonId
  DELETE /api/cms/destinations/:id/seasons/:seasonId
  
  GET    /api/cms/destinations/:id/packages
  POST   /api/cms/destinations/:id/packages
  DELETE /api/cms/destinations/:id/packages/:packageId

Packages:
  GET    /api/cms/packages (published from CRM)
  POST   /api/cms/packages/main
  PUT    /api/cms/packages/main/:id
  POST   /api/cms/packages/sub
  PUT    /api/cms/packages/sub/:id

Visa:
  GET    /api/cms/visa-destinations
  POST   /api/cms/visa-destinations
  PUT    /api/cms/visa-destinations/:id
  DELETE /api/cms/visa-destinations/:id
```

### Public API (Website - No Auth)

```
Landing:
  GET /api/public/landing/places

Destinations:
  GET /api/public/destinations
  GET /api/public/destinations/:slug
  GET /api/public/destinations/:slug/media
  GET /api/public/destinations/:slug/seasons
  GET /api/public/destinations/:slug/packages

Packages:
  GET /api/public/packages/:id
  GET /api/public/packages/:id/sub

Visa:
  GET /api/public/visa/destinations
  GET /api/public/visa/:slug
```

---

## 🔐 Authentication

### CMS API
```javascript
// Login
POST /api/cms/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}

// Response
{
  "token": "jwt-token",
  "user": { ... }
}

// Use token in headers
Authorization: Bearer jwt-token
```

### Public API
No authentication required, but rate limited.

---

## 🎨 Frontend Integration

### React Query Example
```typescript
// Get landing places
const { data: places } = useQuery({
  queryKey: ['landing-places'],
  queryFn: () => 
    fetch('/api/public/landing/places').then(r => r.json())
});

// Get destination
const { data: destination } = useQuery({
  queryKey: ['destination', slug],
  queryFn: () => 
    fetch(`/api/public/destinations/${slug}`).then(r => r.json())
});

// Get destination packages
const { data: packages } = useQuery({
  queryKey: ['destination-packages', slug],
  queryFn: () => 
    fetch(`/api/public/destinations/${slug}/packages`).then(r => r.json())
});
```

### Axios Example
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
const destinations = await api.get('/cms/destinations');
const created = await api.post('/cms/destinations', data);
```

---

## 🐛 Troubleshooting

### Issue: CRM packages not showing in CMS
**Check:**
```sql
SELECT id, name, publish_to_website, is_deleted 
FROM packages 
WHERE id = 'your-package-id';
```
**Fix:** Ensure `publish_to_website = true` and `is_deleted = false`

### Issue: Package not showing on website
**Check:**
```sql
-- Is it mapped?
SELECT * FROM destination_package_map 
WHERE main_package_id IN (
  SELECT id FROM main_packages WHERE package_id = 'your-package-id'
);

-- Is destination active?
SELECT is_active FROM destinations WHERE id = 'destination-id';
```

### Issue: Images not loading
**Check:**
- CORS settings on CDN/S3
- Image URLs are absolute
- File permissions

### Issue: Slow API responses
**Check:**
- Database indexes exist
- Redis cache is running
- Query optimization needed

---

## 📊 Monitoring

### Key Metrics to Track
```javascript
// API response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      duration,
      status: res.statusCode
    });
  });
  next();
});

// Database query times
// Cache hit rates
// Error rates
// User activity
```

### Health Check Endpoint
```javascript
GET /api/health

Response:
{
  "status": "ok",
  "database": "connected",
  "cache": "connected",
  "uptime": 123456
}
```

---

## 🔄 Cache Management

### Clear Cache
```javascript
// Clear all cache
await redis.flushall();

// Clear specific cache
await redis.del('destinations:all');
await redis.del('destination:maldives');

// Clear pattern
const keys = await redis.keys('destination:*');
if (keys.length > 0) {
  await redis.del(...keys);
}
```

### Cache Strategy
```javascript
// Cache for 1 hour
const TTL = 3600;

async function getCachedDestinations() {
  const cached = await redis.get('destinations:all');
  if (cached) return JSON.parse(cached);
  
  const destinations = await db.query('SELECT * FROM destinations');
  await redis.setex('destinations:all', TTL, JSON.stringify(destinations));
  
  return destinations;
}
```

---

## 🧪 Testing

### Unit Tests
```javascript
// Test package service
describe('PackageService', () => {
  it('should list published packages', async () => {
    const packages = await service.listPublished();
    expect(packages).toBeArray();
    expect(packages[0]).toHaveProperty('publishToWebsite', true);
  });
});
```

### Integration Tests
```javascript
// Test API endpoint
describe('GET /api/public/destinations', () => {
  it('should return active destinations', async () => {
    const response = await request(app)
      .get('/api/public/destinations')
      .expect(200);
    
    expect(response.body).toBeArray();
    expect(response.body[0]).toHaveProperty('isActive', true);
  });
});
```

### E2E Tests
```javascript
// Test website flow
describe('Destination Page', () => {
  it('should display packages', async () => {
    await page.goto('/destination-detail/maldives');
    await page.waitForSelector('.package-card');
    
    const packages = await page.$$('.package-card');
    expect(packages.length).toBeGreaterThan(0);
  });
});
```

---

## 📝 Cheat Sheet

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
AWS_S3_BUCKET=your-bucket
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://api.example.com
REACT_APP_CDN_URL=https://cdn.example.com
```

### Common Commands
```bash
# Database
psql -U user -d db -c "SELECT COUNT(*) FROM destinations;"
psql -U user -d db -f schema.sql

# Redis
redis-cli FLUSHALL
redis-cli KEYS "destination:*"

# Node
npm run dev
npm run build
npm test
npm run lint

# Git
git status
git add .
git commit -m "message"
git push origin main
```

---

## 🆘 Getting Help

1. **Check Documentation** - Start with PROJECT_SUMMARY.md
2. **Review Architecture** - Understand the design in CMS_ARCHITECTURE.md
3. **Check Diagrams** - Visual reference in ARCHITECTURE_DIAGRAMS.md
4. **Search Issues** - Look for similar problems
5. **Ask Team** - Reach out to developers

---

## 📞 Support Contacts

- **Architecture Questions**: Refer to CMS_ARCHITECTURE.md
- **Implementation Help**: See IMPLEMENTATION_GUIDE.md
- **CRM Integration**: Check CRM_COMPATIBILITY.md
- **UI/UX**: Review CMS_SCREENS.md

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Ready for Implementation
