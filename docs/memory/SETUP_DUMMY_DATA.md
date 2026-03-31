# Database Dummy Data - Quick Setup Guide

## 📋 Option 1: Run SQL Script Directly in PostgreSQL (Recommended for Testing)

### Using pgAdmin or DBeaver:
1. Open your PostgreSQL admin tool (pgAdmin / DBeaver)
2. Connect to your `production_db_0nxp` database
3. Open a new query window
4. Copy all content from: `backend/database/seed-dummy-data.sql`
5. Paste and execute the script
6. Done! ✅

### Using psql (Command Line):
```bash
psql "" < backend/database/seed-dummy-data.sql
```

---

## 📋 Option 2: Run Node.js Seed Scripts

### Prerequisites:
```bash
cd backend
npm install  # Install dependencies if not already done
```

### Step 1: Run Migrations (Create table structure)
```bash
npm run db:migrate
```

### Step 2: Seed RBAC (Create roles & permissions)
```bash
npm run db:seed:rbac
```

### Step 3: Seed Dummy Data (Populate test data)
```bash
npm run db:seed:data
```

### Or do all at once:
```bash
npm run db:seed:all
```

---

## 🔐 Test User Credentials

After seeding, you can log in with these accounts:

| Email | Password | Role |
|-------|----------|------|
| rajesh@travel-crm.com | user@123 | Sales Consultant |
| priya@travel-crm.com | user@123 | Sales Consultant |
| anand@travel-crm.com | user@123 | Sales Consultant |
| visa@travel-crm.com | user@123 | Visa Executive |
| finance@travel-crm.com | user@123 | Accounts |
| marketing@travel-crm.com | user@123 | Marketing |

---

## 📊 What Gets Created?

### Users (6)
- 3 Sales Consultants with targets and incentives
- 1 Visa Executive
- 1 Finance Manager
- 1 Marketing Manager

### Test Data
- **Destinations**: 15 (Bali, Maldives, Dubai, Singapore, India, Europe, USA, Canada, etc.)
- **Campaigns**: 5 marketing campaigns with budgets and spend tracking
- **Leads**: 8 leads at various stages (Open, Contacted, WIP, Quoted, Converted)
- **Quotations**: 5 quotations (some accepted, some pending)
- **Bookings**: 3 confirmed bookings worth ₹745,000
- **Payments**: 5 payment transactions (completed and pending)
- **Customers**: 8 customers linked to bookings
- **Packages**: 6 tour packages ready for showcase
- **Suppliers**: 5 suppliers in different countries
- **Complaints**: 2 complaints for testing complaint management

---

## 🚀 Start Testing Frontend

After seeding:

1. Start the backend server:
```bash
npm run dev  # from backend folder
```

2. Start the frontend dev server:
```bash
npm run dev  # from frontend folder
```

3. Open http://localhost:5173 in your browser

4. Login with any test user credentials above

---

## 🔍 Verify Data in Database

Check if data was inserted correctly:

```sql
-- Check users
SELECT email, role_id FROM users WHERE email LIKE '%@travel-crm.com';

-- Check leads
SELECT full_name, email, status FROM leads;

-- Check bookings
SELECT COUNT(*) as booking_count FROM bookings;

-- Check total records
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM leads) as leads,
    (SELECT COUNT(*) FROM bookings) as bookings,
    (SELECT COUNT(*) FROM quotations) as quotations,
    (SELECT COUNT(*) FROM payments) as payments;
```

---

## ⚠️ Troubleshooting

### "DATABASE_URL is required"
```bash
# Make sure .env file exists in backend folder with:
DATABASE_URL=postgresql://postgres_user:48QtIzqBfu0NZo41wyRsa7axKhSuRn4U@dpg-d6ru8mhaae7s73d0g3h0-a.singapore-postgres.render.com/production_db_0nxp
```

### "Connection refused" or "ECONNRESET"
- Check if your database server is accessible
- Verify DATABASE_URL is correct
- For Render.com: Make sure your IP is whitelisted

### "Column does not exist"
- Make sure migrations have been run first: `npm run db:migrate`

### "Duplicate key value"
- If re-running the seed script, all queries have `ON CONFLICT DO NOTHING` to handle this

---

## 🎯 Next Steps for Testing

1. ✅ Seed dummy data (this guide)
2. ✅ Start backend server
3. ✅ Start frontend dev server  
4. ✅ Login with test users
5. ✅ Test Lead Management flows
6. ✅ Test Booking & Quotation features
7. ✅ Test Payment tracking
8. ✅ Test Reports and dashboards

---

## 📝 Notes

- All example data is fictional and for testing only
- Test user passwords are simple: `user@123` (change in production!)
- Dummy data includes realistic scenarios:
  - Some leads are converted (won)
  - Some are still in progress
  - Payments have different statuses
  - Complaints are both resolved and pending

Happy Testing! 🎉
