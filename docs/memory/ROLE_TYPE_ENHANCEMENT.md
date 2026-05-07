# Role Type Enhancement - Backend API Changes Needed

## Problem
Currently, the frontend checks role names (e.g., "agent", "manager") to determine role behavior. This is fragile because:
- Name comparisons are case-sensitive
- Different naming conventions (Agent, agent, Agent-AT, sales_consultant)
- Backend should not do string comparisons

## Solution: Add `roleType` or `roleCategory` Field

### Backend Changes Required

#### 1. Add `role_type` column to `roles` table

```sql
-- Migration: Add role_type column
ALTER TABLE roles 
ADD COLUMN role_type VARCHAR(50) DEFAULT 'STANDARD';

-- Update existing roles
UPDATE roles SET role_type = 'SUPER_ADMIN' WHERE name = 'super_admin';
UPDATE roles SET role_type = 'ADMIN' WHERE name = 'admin';
UPDATE roles SET role_type = 'MANAGER' WHERE name IN ('manager', 'management');
UPDATE roles SET role_type = 'AGENT' WHERE name IN ('sales_consultant', 'visa_executive', 'Agent', 'Agent-AT');
UPDATE roles SET role_type = 'ACCOUNTS' WHERE name = 'accounts';
UPDATE roles SET role_type = 'MARKETING' WHERE name = 'marketing';
```

#### 2. Update Role API Response

```typescript
// Backend: src/modules/rbac/roles.service.ts
interface RoleResponse {
  id: string
  name: string
  description?: string
  country?: string
  roleType: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'ACCOUNTS' | 'MARKETING' | 'STANDARD'
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

#### 3. Update Role Creation API

```typescript
// Backend: POST /api/rbac/roles
interface CreateRoleRequest {
  name: string
  description?: string
  country?: string
  roleType?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'ACCOUNTS' | 'MARKETING' | 'STANDARD'
}
```

### Frontend Changes

#### 1. Update Role Interface

```typescript
// frontend/src/pages/users/UsersPage.tsx
type RoleOption = {
  id: string
  name: string
  description?: string | null
  country?: string | null
  roleType?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'ACCOUNTS' | 'MARKETING' | 'STANDARD'
}
```

#### 2. Update Agent Role Check (ID-based)

```typescript
// Instead of checking name
const isAgentRole = selectedRoleName.includes('agent')

// Use roleType from backend
const isAgentRole = selectedRole?.roleType === 'AGENT'
```

#### 3. Update Manager Filter (ID-based)

```typescript
// Instead of checking name
.filter(candidate => (candidate.role || '').toLowerCase().includes('manager'))

// Use roleType from backend
.filter(candidate => {
  const userRole = roles.find(r => r.id === candidate.roleId)
  return userRole?.roleType === 'MANAGER' || userRole?.roleType === 'ADMIN'
})
```

### Benefits

✅ **No string comparisons** - Use enum values
✅ **Case-insensitive** - No need to worry about "Agent" vs "agent"
✅ **Flexible naming** - Role can be named anything, behavior is determined by roleType
✅ **Backend controlled** - Backend defines role behavior, not frontend
✅ **Scalable** - Easy to add new role types

### Role Type Definitions

| Role Type | Description | Permissions Level | Features |
|-----------|-------------|-------------------|----------|
| SUPER_ADMIN | System administrator | Full access | All permissions, RBAC management |
| ADMIN | Organization admin | High access | User management, settings |
| MANAGER | Team manager | Medium-high | Team oversight, lead assignment |
| AGENT | Sales/Visa agent | Medium | Lead handling, bookings |
| ACCOUNTS | Finance team | Medium | Payments, refunds, invoices |
| MARKETING | Marketing team | Medium | Campaigns, analytics |
| STANDARD | Default role | Low | Basic read access |

### Implementation Priority

1. **Backend**: Add `role_type` column and update APIs (HIGH PRIORITY)
2. **Frontend**: Update role interface to include `roleType` (HIGH PRIORITY)
3. **Frontend**: Replace name-based checks with roleType checks (MEDIUM PRIORITY)
4. **Frontend**: Add roleType selector in Create Role modal (LOW PRIORITY)

### Backward Compatibility

During transition period, frontend can use fallback:

```typescript
const getRoleType = (role: RoleOption): string => {
  // Use roleType if available (new API)
  if (role.roleType) return role.roleType
  
  // Fallback to name-based detection (old API)
  const name = role.name.toLowerCase()
  if (name.includes('admin')) return 'ADMIN'
  if (name.includes('manager')) return 'MANAGER'
  if (name.includes('agent') || name.includes('consultant') || name.includes('executive')) return 'AGENT'
  return 'STANDARD'
}

const isAgentRole = getRoleType(selectedRole) === 'AGENT'
```

### Example Usage

```typescript
// Create role with type
await authService.createRole({
  name: 'Senior Sales Agent',
  country: 'India',
  roleType: 'AGENT'  // Behavior is determined by this, not name
})

// Check role type
if (user.role?.roleType === 'AGENT') {
  // Show agent-specific fields (manager, agentType)
}

// Filter managers
const managers = users.filter(u => {
  const role = roles.find(r => r.id === u.roleId)
  return role?.roleType === 'MANAGER' || role?.roleType === 'ADMIN'
})
```

## Current Temporary Solution

Until backend implements `roleType`, the frontend now uses flexible name matching:

```typescript
// Checks multiple keywords
const isAgentRole = selectedRoleName.includes('agent') || 
                    selectedRoleName.includes('consultant') ||
                    selectedRoleName.includes('executive')

const isManagerRole = roleName.includes('manager') || 
                      roleName.includes('admin') ||
                      roleName.includes('management')
```

This works for now but should be replaced with `roleType` field from backend.
