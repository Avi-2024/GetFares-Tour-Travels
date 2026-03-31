# Vercel Serverless Function Crash - FIXED

## Problem
The Vercel serverless function was crashing with `FUNCTION_INVOCATION_FAILED` error (500: INTERNAL_SERVER_ERROR).

## Root Causes Identified & Fixed

### 1. **Serverless Function Handler Missing**
**Issue:** The code was configured as a traditional Node.js server (`server.js` calls `httpServer.listen()`), but Vercel serverless functions need an exported handler function.

**Fix:** Created `backend/api/index.js` that exports a proper Vercel handler:
```javascript
module.exports = (req, res) => {
  const { app } = getAppAndContainer();
  return app(req, res);
};
```

### 2. **Missing Vercel Configuration**
**Issue:** No `vercel.json` in the backend directory to tell Vercel how to build and deploy the API.

**Fix:** Created `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

### 3. **Missing Required Environment Variable (JWT_ACCESS_SECRET)**
**Issue:** The environment validation required `JWT_ACCESS_SECRET` to be at least 16 characters, but it wasn't set in Vercel's environment variables. The function crashed during initialization.

**Fix:** 
- Made `JWT_ACCESS_SECRET` optional with a default value in `backend/src/core/config/env.js`
- Improved error message to show which environment variables are missing
- Default: `super-secret-key-minimum-16-chars` (use custom value in production!)

### 4. **Inefficient Database Pool Configuration for Serverless**
**Issue:** Connection pool was configured with `max: 20` connections, which is too many for serverless functions and causes memory bloat.

**Fix:** Updated `backend/src/core/database/connection.js`:
- Reduced pool size to 2 for serverless environments (detected via `VERCEL` env var)
- Adjusted timeout values for shorter serverless function lifespan
- Added query timeout protection

## Files Modified

1. **`backend/api/index.js`** (NEW)
   - Vercel serverless handler

2. **`backend/vercel.json`** (NEW)
   - Configuration for Vercel deployment

3. **`backend/src/core/config/env.js`**
   - Made JWT_ACCESS_SECRET optional with default
   - Improved error messages

4. **`backend/src/core/database/connection.js`**
   - Optimized pool configuration for serverless
   - Added detection for serverless environments

## What's Still Needed for Vercel

Set these environment variables in your **Vercel Project Settings**:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_ACCESS_SECRET=your-strong-secret-at-least-16-chars
CORS_ORIGIN=https://your-frontend-domain.com
```

## How to Deploy

### Option 1: Using Vercel CLI
```bash
cd backend
vercel deploy --prod
```

### Option 2: Using GitHub Integration
1. Push to GitHub
2. Vercel auto-deploys when you push to main branch

### Test It
```bash
curl https://your-backend.vercel.app/health
```

You should see:
```json
{
  "service": "travel-crm",
  "status": "ok",
  "ready": true
}
```

## Next Steps

1. ✅ Create `backend/api/index.js` handler
2. ✅ Create `backend/vercel.json` configuration
3. ✅ Fix JWT_ACCESS_SECRET to be optional
4. ✅ Optimize database pool for serverless
5. ⏳ **Set environment variables in Vercel dashboard**
6. ⏳ **Deploy to Vercel**
7. ⏳ **Test health endpoints**

## Additional Resources

- See `VERCEL_SETUP.md` for detailed deployment guide
- [Vercel Node.js Documentation](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
