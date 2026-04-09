# Travel CRM - Roles & Permissions Documentation

## Document Overview

This document provides a complete reference for all user roles and their associated permissions in the Get2Vacation Travel CRM system, based on the Product Requirements Document (PRD) and Standard Operating Procedures (SOP).

---

## Table of Contents

1. [User Roles Overview](#user-roles-overview)
2. [Role Descriptions & Responsibilities](#role-descriptions--responsibilities)
3. [Complete Permissions List](#complete-permissions-list)
4. [Role-Permission Matrix](#role-permission-matrix)
5. [Permission Details by Module](#permission-details-by-module)

---

## User Roles Overview

The Travel CRM system supports **8 distinct user roles**, each designed for specific operational responsibilities:

| #   | Role Name                             | Code               | Primary Function                            |
| --- | ------------------------------------- | ------------------ | ------------------------------------------- |
| 1   | Super Admin                           | `super_admin`      | Complete system control and configuration   |
| 2   | Admin                                 | `admin`            | Full operational access and user management |
| 3   | Manager                               | `manager`          | Team oversight and performance monitoring   |
| 4   | Sales Consultant / Holiday Consultant | `sales_consultant` | Lead management and quotation creation      |
| 5   | Visa Executive / Visa Consultant      | `visa_executive`   | Visa application processing                 |
| 6   | Accounts Team                         | `accounts`         | Financial operations and payment tracking   |
| 7   | Marketing                             | `marketing`        | Campaign management and lead analytics      |
| 8   | Management                            | `management`       | Dashboard monitoring and reporting          |

---

## Role Descriptions & Responsibilities

### 1. Super Admin

**Access Level**: Complete system access

**Responsibilities**:

- System configuration and settings
- Role and permission management
- Database administration
- Security and access control
- All administrative functions

**Key Capabilities**:

- Add/edit/delete all users
- Modify system-wide settings
- Access all modules and data
- Configure RBAC permissions
- Manage integrations (Meta Ads, WhatsApp, etc.)

---

### 2. Admin

**Access Level**: Full operational access

**Responsibilities**:

- User management (add/edit/delete users)
- Access to reports & revenue dashboard
- Modify margins & pricing settings
- Oversee all operational modules
- System configuration

**Key Capabilities**:

- Complete access to all modules
- Revenue and profit tracking
- Pricing and margin adjustments
- Team performance monitoring
- Supplier coordination

---

### 3. Manager

**Access Level**: Team oversight and operational management

**Responsibilities**:

- Monitor team performance
- Lead distribution and assignment
- Quotation approval (high-value files)
- Booking oversight
- Customer relationship management
- Supplier coordination

**Key Capabilities**:

- View and manage all leads
- Create and approve quotations
- Monitor booking pipeline
- Access customer profiles
- View reports and analytics
- Manage suppliers
- Cannot modify system settings or user roles

**SOP Requirements**:

- Review quotations for customized/complex packages
- Approve bookings above AED 25,000
- Intervene in force majeure cancellation cases
- Conduct daily 10-minute review meetings

---

### 4. Sales Consultant / Holiday Consultant

**Access Level**: Lead-to-booking workflow

**Responsibilities**:

- Respond to leads within 15 minutes (SLA)
- Lead qualification using 7-question script
- Create quotations (ready packages: 30 min, customized: 2 hours)
- Follow-up management (4 follow-ups + 1 final reminder)
- Convert leads to bookings
- Upload travel documents
- Customer communication

**Key Capabilities**:

- Access assigned leads
- Create and send quotations
- Update lead status
- Create bookings
- Upload documents (passport, visa, tickets, vouchers)
- View customer profiles
- Access supplier information
- Create complaints
- Cannot access payments or refunds directly

**SOP Requirements**:

- 15-minute lead response time
- Use lead qualification script (7 questions)
- Minimum 4 follow-ups before marking non-responsive
- Send final itinerary 72 hours before departure
- Daily reporting (leads received, quotes sent, conversions)

**Lead Qualification Questions**:

1. Destination
2. Travel Dates
3. Number of Adults/Children/Infants
4. Budget Range
5. Visa Required
6. Preferred Hotel Category
7. Purpose of Travel

---

### 5. Visa Executive / Visa Consultant

**Access Level**: Visa processing workflow

**Responsibilities**:

- Manage visa leads and applications
- Upload visa documents
- Track application stages
- Update visa status
- Monitor appointment dates
- Process visa deliveries

**Key Capabilities**:

- Full access to visa module
- View related leads and bookings
- Access customer profiles
- View quotations
- Track visa fees and supplier payments
- Cannot create bookings or manage payments

**Visa Workflow Stages**:

1. Document Collection
2. Application Submitted
3. Biometrics Scheduled
4. Under Process
5. Approved
6. Rejected
7. Delivered

**SOP Requirements**:

- Maintain country-specific visa checklists
- Track appointment dates and expiry reminders
- Monitor SLA for visa processing
- Coordinate with suppliers for visa submissions

---

### 6. Accounts Team

**Access Level**: Financial operations

**Responsibilities**:

- Update payment status
- Generate invoices
- Process refunds
- Track supplier payments
- Profit calculation
- Revenue reporting

**Key Capabilities**:

- Full access to payments and refunds
- View bookings and quotations
- Access customer profiles
- View and update supplier payment details
- Generate financial reports
- Cannot create leads or quotations

**Payment Rules (SOP)**:

- Minimum 50% advance payment required
- 100% payment for non-refundable bookings
- Balance payment before D-2 (2 days before supplier deadline)
- No service confirmation without payment proof
- Process refunds within 3-5 working days after receiving supplier refund

**Refund Processing**:

- Verify cancellation policy (airline, hotel, DMC, visa, insurance)
- Calculate refund: Total Paid - Supplier Penalty - Visa Charges - Service Charges
- Communicate refund timeline (airline: 15-30 days, DMC: 7-21 days)
- Require Department Head approval for refunds above AED 10,000

---

### 7. Marketing

**Access Level**: Campaign and analytics

**Responsibilities**:

- Manage marketing campaigns
- Track lead sources
- Monitor campaign performance
- Calculate cost per lead and ROI
- Access customer segmentation
- View conversion analytics

**Key Capabilities**:

- Full access to campaigns module
- View leads (read-only)
- Access customer database
- View quotations and reports
- Cannot create bookings or manage payments

**Lead Sources Tracked**:

- Meta Ads (Facebook/Instagram)
- Website Enquiry
- Walk-in
- WhatsApp
- Referral
- Corporate
- Google Ads

---

### 8. Management

**Access Level**: Dashboard and reporting (view-only)

**Responsibilities**:

- Monitor KPIs
- View conversion reports
- Track revenue and profit
- Oversee team performance
- Strategic decision-making

**Key Capabilities**:

- Dashboard view only
- Access all reports
- View leads, quotations, bookings
- View payments and refunds
- View visa applications
- View campaigns and customers
- Cannot create or modify any records

**KPIs Monitored**:

- Total Leads (Daily/Weekly/Monthly)
- Conversion Rate %
- Revenue Generated
- Profit Generated
- Consultant-wise performance
- Destination-wise revenue
- Visa vs Holiday revenue split
- Lead source performance
- Response time average

---

## Complete Permissions List

### Total Permissions: 53

#### Core System (2)

1. `*` - All permissions (wildcard)
2. `rbac:manage` - Manage roles and permissions

#### Users Module (3)

3. `users:read` - View users
4. `users:create` - Create users
5. `users:update` - Update users

#### Settings Module (2)

6. `settings:read` - View settings
7. `settings:update` - Update settings

#### Leads Module (4)

8. `leads:read` - View leads
9. `leads:create` - Create leads
10. `leads:update` - Update leads (assign, followups, status)
11. `leads:*` - All lead permissions

#### Quotations Module (4)

12. `quotations:read` - View quotations
13. `quotations:create` - Create quotations
14. `quotations:update` - Update quotations
15. `quotations:*` - All quotation permissions

#### Bookings Module (4)

16. `bookings:read` - View bookings
17. `bookings:create` - Create bookings
18. `bookings:update` - Update bookings (status, approval)
19. `bookings:*` - All booking permissions

#### Payments Module (4)

20. `payments:read` - View payments
21. `payments:create` - Create payments
22. `payments:update` - Update payments
23. `payments:*` - All payment permissions

#### Refunds Module (4)

24. `refunds:read` - View refunds
25. `refunds:create` - Create refunds
26. `refunds:update` - Update refunds
27. `refunds:*` - All refund permissions

#### Customers Module (4)

28. `customers:read` - View customers
29. `customers:create` - Create customers
30. `customers:update` - Update customers
31. `customers:*` - All customer permissions

#### Campaigns Module (4)

32. `campaigns:read` - View campaigns
33. `campaigns:create` - Create campaigns
34. `campaigns:update` - Update campaigns
35. `campaigns:*` - All campaign permissions

#### Visa Module (4)

36. `visa:read` - View visa applications
37. `visa:create` - Create visa applications
38. `visa:update` - Update visa applications
39. `visa:*` - All visa permissions

#### Complaints Module (4)

40. `complaints:read` - View complaints
41. `complaints:create` - Create complaints
42. `complaints:update` - Update complaints
43. `complaints:*` - All complaint permissions

#### Reports Module (1)

44. `reports:read` - View reports and analytics

#### Notifications Module (2)

45. `notifications:read` - View notifications
46. `notifications:update` - Update notifications (mark as read)

#### Suppliers Module (3)

47. `suppliers:read` - View suppliers
48. `suppliers:create` - Create suppliers
49. `suppliers:update` - Update suppliers

#### Employees Module (2)

50. `employees:read` - View employees
51. `employees:update` - Update employees

---

## Role-Permission Matrix

### Quick Reference Table

| Permission             | Super Admin | Admin | Manager | Sales Consultant | Visa Executive | Accounts | Marketing | Management |
| ---------------------- | :---------: | :---: | :-----: | :--------------: | :------------: | :------: | :-------: | :--------: |
| `*` (All)              |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `rbac:manage`          |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `users:read`           |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `users:create`         |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `users:update`         |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `settings:read`        |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `settings:update`      |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `leads:*`              |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `leads:read`           |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ❌    |    ✅     |     ✅     |
| `quotations:*`         |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `quotations:read`      |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ✅    |    ✅     |     ✅     |
| `bookings:*`           |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `bookings:read`        |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ✅    |    ❌     |     ✅     |
| `bookings:create`      |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `bookings:update`      |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `payments:*`           |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ✅    |    ❌     |     ❌     |
| `payments:read`        |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ✅    |    ❌     |     ✅     |
| `refunds:*`            |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ✅    |    ❌     |     ❌     |
| `refunds:read`         |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ✅    |    ❌     |     ✅     |
| `customers:*`          |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `customers:read`       |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ✅    |    ✅     |     ✅     |
| `campaigns:*`          |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ✅     |     ❌     |
| `campaigns:read`       |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ❌    |    ✅     |     ✅     |
| `visa:*`               |     ✅      |  ✅   |   ❌    |        ❌        |       ✅       |    ❌    |    ❌     |     ❌     |
| `visa:read`            |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ❌    |    ❌     |     ✅     |
| `complaints:*`         |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `complaints:read`      |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ❌    |    ❌     |     ✅     |
| `complaints:create`    |     ✅      |  ✅   |   ❌    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `reports:read`         |     ✅      |  ✅   |   ✅    |        ❌        |       ❌       |    ✅    |    ✅     |     ✅     |
| `notifications:read`   |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ✅    |    ✅     |     ✅     |
| `notifications:update` |     ✅      |  ✅   |   ✅    |        ✅        |       ✅       |    ✅    |    ✅     |     ✅     |
| `suppliers:read`       |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ✅    |    ❌     |     ✅     |
| `suppliers:create`     |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ❌    |    ❌     |     ❌     |
| `suppliers:update`     |     ✅      |  ✅   |   ✅    |        ✅        |       ❌       |    ✅    |    ❌     |     ❌     |
| `employees:read`       |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |
| `employees:update`     |     ✅      |  ✅   |   ❌    |        ❌        |       ❌       |    ❌    |    ❌     |     ❌     |

---

## Permission Details by Module

### 1. Super Admin Role

**Permission**: `*` (All permissions)

**Complete Access To**:

- All modules
- All operations (create, read, update, delete)
- System configuration
- Role and permission management
- Database operations
- Integration settings

---

### 2. Admin Role

**Permission**: `*` (All permissions)

**Complete Access To**:

- All modules
- User management
- System settings
- Pricing and margins
- Reports and dashboards
- All operational functions

---

### 3. Manager Role

**Permissions** (16 total):

```
users:read
leads:*
quotations:*
bookings:*
customers:*
campaigns:read
visa:read
payments:read
refunds:read
complaints:read
reports:read
suppliers:read
suppliers:create
suppliers:update
notifications:read
notifications:update
```

**Can Do**:

- View team members
- Full lead management (create, assign, update, followup)
- Full quotation management (create, approve, send)
- Full booking management (create, approve, update status)
- Full customer management
- View campaigns
- View visa applications
- View payments and refunds (read-only)
- View complaints
- Access all reports
- Manage suppliers
- Receive and manage notifications

**Cannot Do**:

- Create or modify users
- Change system settings
- Process payments or refunds
- Create or manage campaigns
- Create or process visa applications

---

### 4. Sales Consultant / Holiday Consultant Role

**Permissions** (14 total):

```
leads:*
quotations:*
bookings:create
bookings:read
bookings:update
customers:read
visa:read
suppliers:read
suppliers:create
suppliers:update
complaints:create
complaints:read
notifications:read
notifications:update
```

**Can Do**:

- Full lead management (create, qualify, assign, update, followup)
- Full quotation management (create ready/customized packages, send)
- Create bookings from converted leads
- View and update booking details
- View customer profiles and history
- View visa application status
- View, create, and update supplier information
- Create and view complaints
- Receive notifications

**Cannot Do**:

- View or manage users
- Access system settings
- Process payments or refunds
- Create or manage campaigns
- Create or process visa applications
- Access financial reports

**SOP Workflow**:

1. Receive lead → Respond within 15 minutes
2. Qualify lead using 7-question script
3. Categorize as Hot/Warm/Cold
4. Create quotation (Ready: 30 min, Customized: 2 hours, Complex: 6 hours)
5. Follow-up sequence (4 attempts + 1 final reminder)
6. Convert to booking after payment confirmation
7. Upload documents 72 hours before departure
8. Daily reporting

---

### 5. Visa Executive / Visa Consultant Role

**Permissions** (8 total):

```
visa:*
leads:read
quotations:read
bookings:read
customers:read
complaints:read
notifications:read
notifications:update
```

**Can Do**:

- Full visa management (create, update, track stages)
- Upload visa documents
- Track appointment dates
- Update visa status through workflow stages
- View related leads
- View quotations
- View bookings
- View customer profiles
- View complaints
- Receive notifications

**Cannot Do**:

- Create or manage leads
- Create quotations
- Create bookings
- Process payments or refunds
- Manage campaigns
- Access financial data

**Visa Workflow**:

1. Document Collection
2. Application Submitted
3. Biometrics Scheduled
4. Under Process
5. Approved
6. Rejected
7. Delivered

---

### 6. Accounts Team Role

**Permissions** (11 total):

```
payments:*
refunds:*
bookings:read
quotations:read
customers:read
suppliers:read
suppliers:update
reports:read
notifications:read
notifications:update
```

**Can Do**:

- Full payment management (create, update, track)
- Full refund management (process, calculate, approve)
- Generate invoices
- View bookings and quotations
- View customer profiles
- View and update supplier payment details
- Access financial reports
- Receive notifications

**Cannot Do**:

- Create or manage leads
- Create quotations
- Create bookings
- Manage visa applications
- Create campaigns
- Modify system settings

**Payment Rules**:

- Minimum 50% advance required
- 100% for non-refundable bookings
- Balance before D-2
- No service confirmation without payment proof

**Refund Calculation**:

```
Refundable Amount = Total Paid - Supplier Penalty - Visa Charges - Service Charges
```

---

### 7. Marketing Role

**Permissions** (8 total):

```
campaigns:*
leads:read
customers:read
quotations:read
reports:read
notifications:read
notifications:update
```

**Can Do**:

- Full campaign management (create, track, analyze)
- View all leads (read-only)
- View customer database
- View quotations
- Access marketing reports (lead source, ROI, cost per lead)
- Receive notifications

**Cannot Do**:

- Create or modify leads
- Create quotations
- Create bookings
- Process payments or refunds
- Manage visa applications
- Modify system settings

**Analytics Tracked**:

- Lead source performance
- Campaign ROI
- Cost per lead
- Conversion rates by source
- Customer segmentation

---

### 8. Management Role

**Permissions** (13 total):

```
reports:read
leads:read
quotations:read
bookings:read
payments:read
refunds:read
visa:read
campaigns:read
customers:read
complaints:read
suppliers:read
notifications:read
notifications:update
```

**Can Do**:

- View all reports and dashboards
- View all leads (read-only)
- View all quotations (read-only)
- View all bookings (read-only)
- View payment status (read-only)
- View refund status (read-only)
- View visa applications (read-only)
- View campaigns (read-only)
- View customer profiles (read-only)
- View complaints (read-only)
- View suppliers (read-only)
- Receive notifications

**Cannot Do**:

- Create or modify any records
- Process any transactions
- Change system settings
- Manage users

**Dashboard KPIs**:

- Total Leads (Daily/Weekly/Monthly)
- Conversion Rate %
- Revenue Generated
- Profit Generated
- Consultant-wise performance
- Destination-wise revenue
- Visa vs Holiday revenue split
- Lead source performance
- Response time average

---

## Permission Patterns & Rules

### Wildcard Permissions

- `*` - Grants ALL permissions across ALL modules
- `module:*` - Grants ALL actions (read, create, update) for a specific module

### Hierarchical Matching

Permissions are checked hierarchically:

1. **Exact match**: `leads:read` matches `leads:read`
2. **Wildcard match**: `leads:*` matches `leads:read`, `leads:create`, `leads:update`
3. **Global wildcard**: `*` matches everything

### Permission Inheritance

- Super Admin and Admin have `*` permission (all access)
- Other roles have specific permission sets
- Permissions are cached for 60 seconds for performance

---

## SOP Compliance Requirements

### Lead Response Time

- **15-minute SLA** for all leads
- Escalation to manager if not contacted within 15 minutes
- Applies to: Meta ads, website, WhatsApp, phone, walk-ins, email

### Quotation Response Time

| Package Type         | Response Time | Notes                             |
| -------------------- | ------------- | --------------------------------- |
| Ready Package        | 30 minutes    | Pre-costed, pre-approved          |
| Customized Itinerary | 2 hours       | Requires supplier rate check      |
| Complex Itinerary    | 6 hours       | Multi-country, multiple suppliers |

### Follow-Up Sequence

1. **Follow-Up 1**: Same day (evening)
2. **Follow-Up 2**: Day 2 (morning)
3. **Follow-Up 3**: Day 2 (evening)
4. **Follow-Up 4**: Day 3 (morning) - Final Reminder
5. **Day 4**: Mark as "Non-Responsive" if no response

**Compliance Rule**: A lead cannot be marked as "Closed – No Response" unless:

- 4 call attempts completed
- 2 WhatsApp messages sent
- 1 Final Reminder sent
- All logged in CRM

### Payment Rules

- Minimum 50% advance payment required
- 100% payment for non-refundable bookings
- Balance payment before D-2 (2 days before supplier deadline)
- No service confirmation without payment proof

### Documentation Timeline

- Final itinerary must be sent **72 hours before departure**
- Includes: passport, visa, tickets, hotel vouchers, transfers, tours, emergency contacts

### Booking Approval

- Bookings above **AED 25,000** require Department Head (Manager) approval
- Margin verification required
- All vouchers must be verified

---

## Adding New Permissions

### Database Method

```sql
INSERT INTO permissions (key, description, is_active)
VALUES ('module:action', 'Description of permission', true);
```

### Seed File Method

Update `database/seed-rbac.json`:

```json
{
  "key": "module:action",
  "description": "Description of permission",
  "isActive": true
}
```

### Assign to Role

```sql
INSERT INTO role_permissions (role_id, permission_id, is_active)
VALUES (
  (SELECT id FROM roles WHERE name = 'role_name'),
  (SELECT id FROM permissions WHERE key = 'module:action'),
  true
);
```

### Apply in Routes

```javascript
router.get(
  "/",
  requireAuth,
  authorize("module:action"),
  asyncHandler(controller.method),
);
```

---

## Security Notes

- All permissions are stored in the `permissions` table
- Role-permission mappings are in the `role_permissions` table
- Permissions can be dynamically managed via the RBAC API
- Inactive permissions (`is_active = false`) are not enforced
- Permission checks are cached for 60 seconds for performance
- Only Super Admin can have `*` permission (single active Super Admin enforced)
- JWT tokens contain user role information
- All API endpoints are protected with authentication and authorization middleware

---

## Success Metrics

The CRM system aims to achieve:

- ✅ **15-minute lead response compliance**
- ✅ **20-30% conversion ratio**
- ✅ **Real-time revenue visibility**
- ✅ **Reduced manual follow-up errors**
- ✅ **Automated reporting**
- ✅ **Team accountability and transparency**

---

**Document Version**: 1.0
**Last Updated**: 2025
**Total Roles**: 8
**Total Permissions**: 53
**Based On**: PRD - CRM.pdf, HOLIDAYS SOP.pdf
