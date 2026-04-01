# CMS Backend Integration Guide

## Quick Integration with Existing Backend

### Option 1: Standalone CMS Server

Create `backend/cms-server.js`:

```javascript
import { createCmsApp } from "./cms/index.js";

const { app, logger } = createCmsApp();

const PORT = process.env.CMS_PORT || 3001;

app.listen(PORT, () => {
  logger.info(`CMS API running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`CMS API: http://localhost:${PORT}/api/cms/*`);
  logger.info(`Public API: http://localhost:${PORT}/api/public/*`);
});
```

Run:

```bash
node backend/cms-server.js
```

---

### Option 2: Integrate with Main Backend

Update `backend/src/app.js` or `backend/src/server.js`:

```javascript
import express from "express";
import { createCmsApp } from "./cms/index.js";
import { createCrmApp } from "./crm/index.js"; // Your existing CRM

const app = express();

// Initialize CMS
const { app: cmsApp, modules: cmsModules } = createCmsApp();

// Mount CMS routes
app.use(cmsApp);

// Mount CRM routes (existing)
// app.use('/api/crm', crmRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### Option 3: Mount as Middleware

```javascript
import express from "express";
import { createCmsModules } from "./cms/modules/index.js";
import { createDatabaseConnection } from "./crm/core/database/connection.js";
import { createLogger } from "./crm/core/logger/logger.js";
import { config } from "./cms/core/config/index.js";

const app = express();
const logger = createLogger({ name: "main" });
const db = createDatabaseConnection({ config, logger });

// Initialize CMS modules
const cmsModules = createCmsModules({ db });

// Mount CMS routes
app.use("/api/cms/landing-places", cmsModules.landing.routes);
app.use("/api/cms/destinations", cmsModules.destinations.routes);
app.use("/api/cms/packages", cmsModules.packages.routes);
app.use("/api/cms/visa-destinations", cmsModules.visa.routes);

// Public API routes
app.get("/api/public/landing/places", async (req, res) => {
  const places = await cmsModules.landing.service.list({ active: true });
  res.json({ success: true, data: places });
});

// ... other routes
```

---

## Adding Authentication

### Create Auth Middleware

Create `backend/cms/core/middlewares/auth.js`:

```javascript
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";
import { config } from "../config/index.js";

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new AppError(401, "Invalid token", "INVALID_TOKEN"));
    } else if (error.name === "TokenExpiredError") {
      next(new AppError(401, "Token expired", "TOKEN_EXPIRED"));
    } else {
      next(error);
    }
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
    }

    next();
  };
}

export { authMiddleware, requireRole };
```

### Apply to Routes

Update route files to add auth:

```javascript
import express from "express";
import { authMiddleware, requireRole } from "../../core/middlewares/auth.js";

function createLandingRoutes({ controller }) {
  const router = express.Router();

  // Public routes (no auth)
  router.get("/", controller.list);
  router.get("/:id", controller.getById);

  // Protected routes (auth required)
  router.post(
    "/",
    authMiddleware,
    requireRole("admin", "editor"),
    controller.create,
  );
  router.put(
    "/:id",
    authMiddleware,
    requireRole("admin", "editor"),
    controller.update,
  );
  router.delete(
    "/:id",
    authMiddleware,
    requireRole("admin"),
    controller.delete,
  );
  router.patch(
    "/reorder",
    authMiddleware,
    requireRole("admin", "editor"),
    controller.reorder,
  );

  return router;
}

export { createLandingRoutes };
```

---

## Environment Variables

Add to `.env`:

```bash
# CMS Configuration
CMS_PORT=3001
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads/cms

# Cache (optional)
CACHE_ENABLED=true
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# Storage (optional)
STORAGE_TYPE=local
AWS_S3_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

---

## Testing the Integration

### 1. Start the Server

```bash
npm run dev
# or
node backend/cms-server.js
```

### 2. Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "ok": true,
    "adapter": "postgres",
    "latencyMs": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Test CMS Endpoints

```bash
# List landing places
curl http://localhost:3000/api/cms/landing-places

# Create landing place
curl -X POST http://localhost:3000/api/cms/landing-places \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Switzerland",
    "description": "Alpine paradise",
    "tag": "Luxury",
    "imageUrl": "https://example.com/image.jpg"
  }'

# List destinations
curl http://localhost:3000/api/cms/destinations

# Get public destinations
curl http://localhost:3000/api/public/destinations
```

### 4. Test with Authentication (if implemented)

```bash
# Login (use your existing auth endpoint)
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# Use token
curl http://localhost:3000/api/cms/landing-places \
  -H "Authorization: Bearer $TOKEN"
```

---

## Database Migration

Before using CMS, ensure database is set up:

```bash
# Run CRM compatibility migration
psql -U user -d database -f backend/database/migrations/001_add_crm_package_fields.sql

# Run CMS schema
psql -U user -d database -f backend/database/cms-schema.sql

# Verify tables
psql -U user -d database -c "\dt" | grep -E "(landing_places|destinations|main_packages)"
```

---

## Troubleshooting

### Issue: Module not found

**Solution**: Ensure you're using ES modules. Check `package.json`:

```json
{
  "type": "module"
}
```

### Issue: Database connection error

**Solution**: Verify `DATABASE_URL` in `.env`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### Issue: CORS errors

**Solution**: Update CORS configuration in `cms/core/config/index.js`:

```javascript
cors: {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}
```

### Issue: Port already in use

**Solution**: Change port in `.env`:

```bash
CMS_PORT=3001
```

---

## Production Deployment

### 1. Environment Setup

```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/prod_db
JWT_SECRET=strong-random-secret-key
CORS_ORIGIN=https://yourdomain.com
```

### 2. Build & Start

```bash
npm run build
npm start
```

### 3. Process Manager (PM2)

```bash
pm2 start backend/cms-server.js --name cms-api
pm2 save
pm2 startup
```

### 4. Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/cms {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/public {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache public API responses
        proxy_cache public_cache;
        proxy_cache_valid 200 1h;
    }
}
```

---

## Monitoring

### Add Logging

```javascript
import { createLogger } from "./crm/core/logger/logger.js";

const logger = createLogger({ name: "cms" });

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});
```

### Health Monitoring

```bash
# Check health every minute
*/1 * * * * curl -f http://localhost:3000/health || echo "CMS API is down"
```

---

## Next Steps

1. ✅ Integrate CMS with main backend
2. ✅ Add authentication middleware
3. ✅ Test all endpoints
4. ✅ Deploy to staging
5. ✅ Update Get2Vacation website to use API
6. ✅ Deploy to production

---

## Support

For issues or questions:

1. Check `cms/README.md`
2. Review `cms/IMPLEMENTATION_SUMMARY.md`
3. Check database schema in `database/cms-schema.sql`
4. Review architecture in `database/CMS_ARCHITECTURE.md`
