# Vercel Deployment Guide

## Overview
The Travel CRM application is deployed as a Vercel monorepo with:
- **Backend**: Serverless Node.js API functions
- **Frontend**: Static React/TypeScript site

The backend and frontend can be deployed separately or together using Vercel's monorepo functionality.

## Backend Deployment

### Prerequisites
- Vercel CLI or GitHub integration
- Environment variables configured in Vercel project

### Required Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment mode | `production` |
| `JWT_ACCESS_SECRET` | No* | JWT signing secret (min 16 chars, defaults to auto-generated) | `your-secret-key-minimum-16` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CORS_ORIGIN` | No | CORS origin for frontend | `https://yourdomain.com` |
| `LOG_LEVEL` | No | Logging level | `info` |
| `METRICS_ENABLED` | No | Enable Prometheus metrics | `true` |
| `METRICS_TOKEN` | No | Token for metrics endpoint | `your-metrics-token` |

*JWT_ACCESS_SECRET now has a built-in default for development, but **you must set a strong custom value in production**.

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Link to Vercel** (if not already done)
   ```bash
   vercel link
   vercel env pull
   ```

3. **Set Environment Variables in Vercel Dashboard**
   - Go to your Vercel project → Settings → Environment Variables
   - Add each required variable
   - Make sure `DATABASE_URL` is set correctly

4. **Deploy**
   ```bash
   vercel deploy --prod
   ```

### Vercel Configuration
The backend uses `backend/vercel.json` which:
- Builds from `backend/` directory
- Exports API handler from `api/index.js`
- Routes all requests to the Express app

## Frontend Deployment

The frontend is configured in `frontend/vercel.json` for rewrites. Deploy separately:

```bash
cd frontend
vercel deploy --prod
```

## Troubleshooting

### Error: `FUNCTION_INVOCATION_FAILED`
**Causes:**
1. Missing or invalid `DATABASE_URL` environment variable
2. Missing `JWT_ACCESS_SECRET` (now defaults to auto-generated value)
3. Database connection timeout
4. Missing dependencies in build

**Solutions:**
- Check Vercel environment variables are set correctly
- View Vercel function logs: `vercel logs [project-name]`
- Ensure database is accessible from Vercel region
- Check `backend/package.json` has all dependencies

### Error: `timeout` or `ERR_CONNECT_REFUSED`
**Cause:** Database connection issues

**Solutions:**
- Verify `DATABASE_URL` is correct in Vercel
- Check if database firewall allows Vercel IPs
- For Render.com: Add Vercel IPs to whitelist
- For AWS RDS: Check security group rules

### High Memory Usage
**Cause:** Database connection pool size too large

**Solution:** Already optimized for serverless (max 2 connections), but you can further adjust in `backend/src/core/database/connection.js`

## Deployment Checklist

- [ ] `NODE_ENV=production` set in Vercel
- [ ] `DATABASE_URL` set and accessible
- [ ] `JWT_ACCESS_SECRET` set to a strong value
- [ ] `CORS_ORIGIN` set to your frontend domain
- [ ] Both `backend/package.json` and `frontend/package.json` dependencies are current
- [ ] `backend/vercel.json` exists and is correct
- [ ] `frontend/vercel.json` exists (for rewrites)
- [ ] Test the health endpoints:
  - `https://your-api.vercel.app/health`
  - `https://your-api.vercel.app/health/ready`

## Local Development

Run locally:
```bash
cd backend
npm install
npm run dev
```

This starts the Express server on port 3000.

## Database Setup

Make sure your PostgreSQL database is initialized with migrations:

```bash
cd backend
npm run db:migrate
npm run db:seed:rbac  # Optional: seed RBAC roles
```

## Performance Tips

1. **Use connection pooling** - Already configured for serverless
2. **Enable caching** - Frontend and backend can use ETags
3. **Monitor cold starts** - Vercel shows cold start times in logs
4. **Use regional databases** - Place database close to your Vercel region
