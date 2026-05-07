# Travel CRM - Complete Permissions List

## Overview
This document lists all 53 permissions defined in the Get2Vacation Travel CRM system. Permissions follow the pattern `module:action` where action can be `read`, `create`, `update`, or `*` (all actions for that module).

---

## Permission Categories

### 1. Core System Permissions

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `*` | All permissions (wildcard) | Super admin access to everything |
| `rbac:manage` | Manage roles and permissions | Create/update roles and assign permissions |

---

### 2. Users Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `users:read` | View users | List and view user details |
| `users:create` | Create users | Add new users to the system |
| `users:update` | Update users | Modify user information |

---

### 3. Settings Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `settings:read` | View settings | Access system settings |
| `settings:update` | Update settings | Modify system configuration |

---

### 4. Leads Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `leads:read` | View leads | List and view lead details |
| `leads:create` | Create leads | Add new leads |
| `leads:update` | Update leads | Modify lead information, assign, create followups |
| `leads:*` | All lead permissions | Full access to leads module |

---

### 5. Quotations Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `quotations:read` | View quotations | List and view quotation details |
| `quotations:create` | Create quotations | Generate new quotations |
| `quotations:update` | Update quotations | Modify quotation information |
| `quotations:*` | All quotation permissions | Full access to quotations module |

---

### 6. Bookings Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `bookings:read` | View bookings | List and view booking details, stats, invoices |
| `bookings:create` | Create bookings | Add new bookings |
| `bookings:update` | Update bookings | Modify bookings, approve, transition status |
| `bookings:*` | All booking permissions | Full access to bookings module |

---

### 7. Payments Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `payments:read` | View payments | List and view payment details |
| `payments:create` | Create payments | Record new payments |
| `payments:update` | Update payments | Modify payment information |
| `payments:*` | All payment permissions | Full access to payments module |

---

### 8. Refunds Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `refunds:read` | View refunds | List and view refund requests |
| `refunds:create` | Create refunds | Initiate refund requests |
| `refunds:update` | Update refunds | Process and modify refunds |
| `refunds:*` | All refund permissions | Full access to refunds module |

---

### 9. Customers Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `customers:read` | View customers | List and view customer profiles |
| `customers:create` | Create customers | Add new customers |
| `customers:update` | Update customers | Modify customer information |
| `customers:*` | All customer permissions | Full access to customers module |

---

### 10. Campaigns Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `campaigns:read` | View campaigns | List and view marketing campaigns |
| `campaigns:create` | Create campaigns | Launch new campaigns |
| `campaigns:update` | Update campaigns | Modify campaign details |
| `campaigns:*` | All campaign permissions | Full access to campaigns module |

---

### 11. Visa Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `visa:read` | View visa applications | List and view visa cases |
| `visa:create` | Create visa applications | Add new visa cases |
| `visa:update` | Update visa applications | Modify visa case status and documents |
| `visa:*` | All visa permissions | Full access to visa module |

---

### 12. Complaints Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `complaints:read` | View complaints | List and view customer complaints |
| `complaints:create` | Create complaints | Register new complaints |
| `complaints:update` | Update complaints | Resolve and modify complaints |
| `complaints:*` | All complaint permissions | Full access to complaints module |

---

### 13. Reports Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `reports:read` | View reports | Access analytics and reports |

---

### 14. Notifications Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `notifications:read` | View notifications | Access notification list |
| `notifications:update` | Update notifications | Mark notifications as read |

---

### 15. Suppliers Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `suppliers:read` | View suppliers | List and view supplier details |
| `suppliers:create` | Create suppliers | Add new suppliers |
| `suppliers:update` | Update suppliers | Modify supplier information |

---

### 16. Employees Module

| Permission Key | Description | Usage |
|---------------|-------------|-------|
| `employees:read` | View employees | List and view employee details |
| `employees:update` | Update employees | Modify employee information |

---

## Role-Based Permission Assignments

### Super Admin
- `*` (All permissions)

### Admin
- `*` (All permissions)

### Manager
- `users:read`
- `leads:*`
- `quotations:*`
- `bookings:*`
- `customers:*`
- `campaigns:read`
- `visa:read`
- `payments:read`
- `refunds:read`
- `complaints:read`
- `reports:read`
- `suppliers:read`, `suppliers:create`, `suppliers:update`
- `notifications:read`, `notifications:update`

### Sales Consultant
- `leads:*`
- `quotations:*`
- `bookings:create`, `bookings:read`, `bookings:update`
- `customers:read`
- `visa:read`
- `suppliers:read`, `suppliers:create`, `suppliers:update`
- `complaints:create`, `complaints:read`
- `notifications:read`, `notifications:update`

### Visa Executive
- `visa:*`
- `leads:read`
- `quotations:read`
- `bookings:read`
- `customers:read`
- `complaints:read`
- `notifications:read`, `notifications:update`

### Accounts
- `payments:*`
- `refunds:*`
- `bookings:read`
- `quotations:read`
- `customers:read`
- `suppliers:read`, `suppliers:update`
- `reports:read`
- `notifications:read`, `notifications:update`

### Marketing
- `campaigns:*`
- `leads:read`
- `customers:read`
- `quotations:read`
- `reports:read`
- `notifications:read`, `notifications:update`

### Management
- `reports:read`
- `leads:read`
- `quotations:read`
- `bookings:read`
- `payments:read`
- `refunds:read`
- `visa:read`
- `campaigns:read`
- `customers:read`
- `complaints:read`
- `suppliers:read`
- `notifications:read`, `notifications:update`

---

## Permission Patterns

### Wildcard Permissions
- `*` - Grants all permissions across all modules
- `module:*` - Grants all actions (read, create, update) for a specific module

### Hierarchical Matching
Permissions are checked hierarchically:
1. Exact match: `leads:read` matches `leads:read`
2. Wildcard match: `leads:*` matches `leads:read`, `leads:create`, `leads:update`
3. Global wildcard: `*` matches everything

---

## Adding New Permissions

To add a new permission:

1. **Database**: Insert into `permissions` table
   ```sql
   INSERT INTO permissions (key, description, is_active)
   VALUES ('module:action', 'Description', true);
   ```

2. **Seed File**: Update `database/seed-rbac.json`
   ```json
   {
     "key": "module:action",
     "description": "Description",
     "isActive": true
   }
   ```

3. **Routes**: Apply in route definitions
   ```javascript
   router.get('/', requireAuth, authorize('module:action'), handler);
   ```

---

## Notes

- All permissions are stored in the `permissions` table
- Role-permission mappings are in the `role_permissions` table
- Permissions can be dynamically managed via the RBAC API
- Inactive permissions (`is_active = false`) are not enforced
- Permission checks are cached for 60 seconds for performance

---

**Last Updated**: 2025
**Total Permissions**: 53
