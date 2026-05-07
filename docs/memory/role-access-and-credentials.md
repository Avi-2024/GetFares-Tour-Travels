# Role Access and Default Credentials

Purpose: single reference for role-based page access and seeded test logins.

## Default Credentials (Seeded)

These are created by `scripts/seed-dummy-data.js`.

| Role             | Email                    | Password  |
| ---------------- | ------------------------ | --------- |
| Admin            | admin@travel-crm.com     | admin@123 |
| Sales Consultant | rajesh@travel-crm.com    | user@123  |
| Sales Consultant | priya@travel-crm.com     | user@123  |
| Sales Consultant | anand@travel-crm.com     | user@123  |
| Visa Executive   | visa@travel-crm.com      | user@123  |
| Accounts         | finance@travel-crm.com   | user@123  |
| Marketing        | marketing@travel-crm.com | user@123  |

Notes:

1. Change passwords immediately in production.
2. If you run a custom seed, emails or passwords may differ.
3. Roles like Operations, Management, HR are supported in UI specs but not seeded by default.

## Role Access Matrix (Summary)

Source: `docs/frontend-page-specs.md` and `docs/role-page-srs.md`.

| Role             | Primary Access                                            |
| ---------------- | --------------------------------------------------------- |
| Admin            | Full system control, configuration, users, roles, reports |
| Manager          | Team monitoring, lead oversight, performance, escalations |
| Sales Consultant | Leads, follow-ups, quotations, booking conversion         |
| Visa Executive   | Visa cases, documents, appointments, status               |
| Accounts Team    | Payments, invoices, refunds, finance views                |
| Marketing Team   | Campaigns, segmentation, outreach, ROI                    |
| Operations Team  | Complaints, cancellations, post-sales cases               |
| Management       | Read-only strategic dashboards and monthly summaries      |

## Pages by Role

### Admin

Access:

1. `/dashboard/admin` Admin Dashboard
2. `/leads` Leads List
3. `/leads/:id` Lead Detail
4. `/quotations` Quotation List
5. `/quotations/:id` Quotation Detail
6. `/quotations/new` Quotation Builder
7. `/quotation-templates` Quotation Templates
8. `/bookings` Booking List
9. `/bookings/:id` Booking Detail
10. `/payments` Payments Console
11. `/refunds` Refund Management
12. `/visa` Visa Dashboard/List
13. `/visa/:id` Visa Detail
14. `/customers` Customer List
15. `/customers/:id` Customer Profile
16. `/campaigns` Campaign Dashboard
17. `/suppliers` Supplier Management
18. `/employees` Employee Management
19. `/operations` Operations Console
20. `/packages` Package Management
21. `/integrations` Integration Settings
22. `/reports` Reports Hub
23. `/users` Users and RBAC

### Manager

Access:

1. `/dashboard/manager` Manager Dashboard
2. `/leads` Leads List
3. `/leads/:id` Lead Detail
4. `/quotations` Quotation List
5. `/quotations/:id` Quotation Detail
6. `/bookings` Booking List
7. `/bookings/:id` Booking Detail
8. `/payments` Payments Console (read)
9. `/refunds` Refund Management
10. `/visa` Visa Dashboard/List
11. `/visa/:id` Visa Detail
12. `/customers` Customer List
13. `/customers/:id` Customer Profile
14. `/campaigns` Campaign Dashboard (read)
15. `/suppliers` Supplier Management (read)
16. `/operations` Operations Console
17. `/reports` Reports Hub

### Sales Consultant

Access:

1. `/dashboard/sales` Sales Dashboard
2. `/leads` Leads List
3. `/leads/:id` Lead Detail
4. `/quotations` Quotation List
5. `/quotations/:id` Quotation Detail
6. `/quotations/new` Quotation Builder
7. `/bookings` Booking List
8. `/bookings/:id` Booking Detail
9. `/customers` Customer List
10. `/customers/:id` Customer Profile

### Visa Executive

Access:

1. `/visa` Visa Dashboard/List
2. `/visa/:id` Visa Detail
3. `/customers/:id` Customer Profile (read)
4. `/bookings/:id` Booking Detail (read)

### Accounts Team

Access:

1. `/payments` Payments Console
2. `/refunds` Refund Management
3. `/bookings` Booking List
4. `/bookings/:id` Booking Detail
5. `/suppliers` Supplier Management
6. `/reports` Reports Hub (finance views)

### Marketing Team

Access:

1. `/campaigns` Campaign Dashboard
2. `/customers` Customer List
3. `/customers/:id` Customer Profile
4. `/packages` Package Management
5. `/reports` Reports Hub (marketing views)

### Operations Team

Access:

1. `/operations` Operations Console
2. `/complaints/:id` Complaint Detail
3. `/refunds` Refund Management (read)
4. `/bookings/:id` Booking Detail (read)
5. `/suppliers` Supplier Management

### Management (Read-only)

Access:

1. `/reports` Reports Hub
2. `/dashboard/admin` or `/dashboard/manager` (read-only summary view)

## Related Files

1. `docs/frontend-page-specs.md` for full UI spec.
2. `docs/role-page-srs.md` for detailed role behavior and workflow.
