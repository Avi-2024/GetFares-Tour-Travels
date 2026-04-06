# Travel CRM - User Login Credentials

## Default Password for All Users
**Password:** `Welcome@123`

---

## User Accounts by Role

### 1. Super Admin
- **Email:** admin@travel-crm.com
- **Password:** Welcome@123
- **Role:** super_admin
- **Permissions:** Full system access (all permissions)

### 2. Admin Manager
- **Name:** Admin Manager
- **Email:** admin.mgr@getfares.com
- **Phone:** 9800000001
- **Password:** Welcome@123
- **Role:** admin
- **Permissions:** Full system access (all permissions)

### 3. Manager
- **Name:** Rahul Sharma
- **Email:** rahul@getfares.com
- **Phone:** 9800000002
- **Password:** Welcome@123
- **Role:** manager
- **Permissions:** 
  - Users (read)
  - Leads (full access)
  - Quotations (full access)
  - Bookings (full access)
  - Customers (full access)
  - Complaints (full access)
  - Campaigns (read)
  - Visa (read)
  - Payments (read)
  - Refunds (read)
  - Reports (read)
  - Suppliers (read, create, update)
  - Packages (read)
  - Destinations (read)
  - Notifications (read, update)
  - Employees (read)

### 4. Sales Consultant
- **Name:** Priya Verma
- **Email:** priya@getfares.com
- **Phone:** 9800000003
- **Password:** Welcome@123
- **Role:** sales_consultant
- **Permissions:**
  - Leads (full access)
  - Quotations (full access)
  - Bookings (create, read, update)
  - Customers (read, create, update)
  - Visa (read)
  - Suppliers (read, create, update)
  - Complaints (create, read)
  - Packages (read)
  - Destinations (read)
  - Notifications (read, update)

### 5. Visa Executive
- **Name:** Sneha Joshi
- **Email:** sneha@getfares.com
- **Phone:** 9800000004
- **Password:** Welcome@123
- **Role:** visa_executive
- **Permissions:**
  - Visa (full access)
  - Leads (read)
  - Quotations (read)
  - Bookings (read)
  - Customers (read)
  - Complaints (read)
  - Notifications (read, update)

### 6. Accounts
- **Name:** Amit Gupta
- **Email:** amit@getfares.com
- **Phone:** 9800000005
- **Password:** Welcome@123
- **Role:** accounts
- **Permissions:**
  - Payments (full access)
  - Refunds (full access)
  - Bookings (read)
  - Quotations (read)
  - Customers (read)
  - Suppliers (read, update)
  - Reports (read)
  - Notifications (read, update)

### 7. Marketing
- **Name:** Neha Kapoor
- **Email:** neha@getfares.com
- **Phone:** 9800000006
- **Password:** Welcome@123
- **Role:** marketing
- **Permissions:**
  - Campaigns (full access)
  - Leads (read)
  - Customers (read)
  - Quotations (read)
  - Packages (read, create, update)
  - Destinations (read)
  - Reports (read)
  - Notifications (read, update)

### 8. Management
- **Name:** Vikram Mehta
- **Email:** vikram@getfares.com
- **Phone:** 9800000007
- **Password:** Welcome@123
- **Role:** management
- **Permissions:** Read-only executive view
  - Reports (read)
  - Leads (read)
  - Quotations (read)
  - Bookings (read)
  - Payments (read)
  - Refunds (read)
  - Visa (read)
  - Campaigns (read)
  - Customers (read)
  - Complaints (read)
  - Suppliers (read)
  - Packages (read)
  - Destinations (read)
  - Notifications (read, update)

---

## Quick Reference Table

| Role | Name | Email | Phone | Password |
|------|------|-------|-------|----------|
| Super Admin | - | admin@travel-crm.com | - | Welcome@123 |
| Admin | Admin Manager | admin.mgr@getfares.com | 9800000001 | Welcome@123 |
| Manager | Rahul Sharma | rahul@getfares.com | 9800000002 | Welcome@123 |
| Sales Consultant | Priya Verma | priya@getfares.com | 9800000003 | Welcome@123 |
| Visa Executive | Sneha Joshi | sneha@getfares.com | 9800000004 | Welcome@123 |
| Accounts | Amit Gupta | amit@getfares.com | 9800000005 | Welcome@123 |
| Marketing | Neha Kapoor | neha@getfares.com | 9800000006 | Welcome@123 |
| Management | Vikram Mehta | vikram@getfares.com | 9800000007 | Welcome@123 |

---

## Notes
- All users have the same default password: **Welcome@123**
- Users should change their password after first login
- Super Admin and Admin have full system access
- Each role has specific permissions tailored to their responsibilities
- To seed these users, run: `node scripts/seed-roles-users.js` from the backend directory

---

## Security Recommendations
1. ⚠️ Change all default passwords immediately in production
2. ⚠️ Enable two-factor authentication for admin accounts
3. ⚠️ Regularly audit user permissions
4. ⚠️ Remove or disable unused accounts
5. ⚠️ Keep this file secure and do not commit to public repositories
