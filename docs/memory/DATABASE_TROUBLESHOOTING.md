# AWS RDS Database Connection Troubleshooting

## Problem
Database connection times out or fails to connect to AWS RDS

## Immediate Solutions

### Option 1: Check AWS RDS Security Group (Most Common Issue)

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **RDS** → **Databases**
3. Click your database: `database-1`
4. Go to **Connectivity & security** tab
5. Check **VPC security groups** section
6. Click the security group (e.g., `default`)
7. Go to **Inbound rules**
8. Verify PostgreSQL rule (port 5432) exists and:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Your IP or `0.0.0.0/0` (for development only)

### Option 2: Find Your Current IP

```bash
# Windows PowerShell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content

# Or visit: https://www.whatismyipaddress.com
```

### Option 3: Add Your IP to RDS Security Group

1. Go to RDS → Database → Connectivity & security
2. Under **VPC security groups**, click the group
3. **Edit inbound rules**
4. **Add rule**:
   - Type: PostgreSQL
   - Source: Your IP/32 (e.g., `203.0.113.45/32`)
   - Or use `0.0.0.0/0` for any IP (development only)
5. **Save**
6. Try connecting again (may take a minute to apply)

---

## Verify Connection

Once security group is fixed, run:

```bash
node scripts/check-db.js
```

Expected output:
```
✅ Connected to database!
PostgreSQL: PostgreSQL 15.x
Current Time: 2026-03-17T12:30:45.123Z
Tables: 0 found
```

---

## Alternative: Use Local PostgreSQL for Testing

If RDS is not accessible, use local PostgreSQL instead:

### On Windows

1. **Install PostgreSQL** from https://www.postgresql.org/download/windows/
2. **Start PostgreSQL service** (should auto-start)
3. **Create database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE travel_crm;"
   ```
4. **Update .env**:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/travel_crm
   ```
5. Test connection again

---

## Common Connection Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | RDS not running | Check AWS Console, restart RDS |
| `ENOTFOUND` | Wrong hostname | Verify endpoint in AWS Console |
| `FATAL: password authentication failed` | Wrong password | Check credentials in .env |
| `Connection timeout` | Security group blocking | Add your IP to inbound rules |
| `SSL error` | SSL certificate issue | Already handled with `rejectUnauthorized: false` |

---

## Database Setup After Connection Works

Once connection is verified, run migrations:

```bash
cd backend

# Create tables
npm run db:migrate

# Add roles and permissions
npm run db:seed:rbac

# Add dummy data
npm run db:seed:data
```

Or all at once:
```bash
npm run db:setup
```

---

## Verify Setup Complete

```bash
# List all tables
node scripts/check-db.js

# Should show: "Tables: 15+ found"
```

---

## Quick Checklist

- [ ] AWS RDS instance is running (check AWS Console)
- [ ] Security group inbound rule for port 5432 exists
- [ ] Your IP is added to security group
- [ ] DATABASE_URL in .env is correct
- [ ] Connection test passes: `node scripts/check-db.js`
- [ ] Migrations run successfully: `npm run db:migrate`
- [ ] Dummy data loaded: `npm run db:seed:rbac && npm run db:seed:data`
- [ ] Frontend and backend are running

---

## Still Having Issues?

Run comprehensive diagnostics:

```bash
# Check environment
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')"

# Check if can reach host (Windows)
Test-NetConnection -ComputerName "database-1.c16ecme0uera.ap-south-1.rds.amazonaws.com" -Port 5432

# Check Node modules
npm ls pg
```

If all else fails, switch to local PostgreSQL database for development.
