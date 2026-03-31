# User Hierarchy & Creation Flow

## 📊 Hierarchy Structure

```
┌─────────────────────────────────────────┐
│         Super Admin (No Parent)         │
│  - Can create Managers and Agents       │
│  - Only ONE active Super Admin allowed  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼───────┐
│  Manager       │   │  Manager       │
│  (No Parent)   │   │  (No Parent)   │
│  - India       │   │  - UAE         │
└───────┬────────┘   └────────┬───────┘
        │                     │
   ┌────┴────┐           ┌────┴────┐
   │         │           │         │
┌──▼──┐  ┌──▼──┐     ┌──▼──┐  ┌──▼──┐
│Agent│  │Agent│     │Agent│  │Agent│
│(Has │  │(Has │     │(Has │  │(Has │
│Mgr) │  │Mgr) │     │Mgr) │  │Mgr) │
└─────┘  └─────┘     └─────┘  └─────┘
```

## 🔑 Role-Based Parent Requirements

| Role | Parent Required? | Parent Must Be | Can Create |
|------|-----------------|----------------|------------|
| **Super Admin** | ❌ NO (must be null) | N/A | Managers, Agents |
| **Manager** | ❌ NO (must be null) | N/A | Agents only (under self) |
| **Agent** | ✅ YES (required) | Manager | Nothing |

## 📝 Step-by-Step User Creation Flow

### **Step 1: Create Super Admin (First User)**

```bash
POST /api/users
```

```json
{
  "fullName": "Super Admin",
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "phone": "+1234567890",
  "roleId": "super-admin-role-uuid",
  "isActive": true,
  "active": true
  // NO parentId or managerId - Super Admin has no parent
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-super-admin",
    "fullName": "Super Admin",
    "email": "admin@company.com",
    "role": "Super Admin",
    "parentId": null,
    "managerId": null,
    "isActive": true
  }
}
```

---

### **Step 2: Create Manager (Under Super Admin)**

```bash
POST /api/users
```

```json
{
  "fullName": "India Manager",
  "email": "manager.india@company.com",
  "password": "ManagerPass123!",
  "phone": "+919876543210",
  "roleId": "manager-role-uuid",
  "agentCountry": "India",
  "countryIds": ["india-country-uuid"],
  "isActive": true,
  "active": true
  // NO parentId - Managers report directly to Super Admin (no parent)
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-manager-india",
    "fullName": "India Manager",
    "email": "manager.india@company.com",
    "role": "Manager",
    "parentId": null,
    "managerId": null,
    "country": "India",
    "isActive": true
  }
}
```

---

### **Step 3: Create Agent (Under Manager)** ⭐ THIS IS WHERE YOU NEED parentId

```bash
POST /api/users
```

```json
{
  "fullName": "Sales Agent 1",
  "email": "agent1@company.com",
  "password": "AgentPass123!",
  "phone": "+919876543211",
  "roleId": "agent-role-uuid",
  "parentId": "uuid-manager-india",        // ✅ REQUIRED for Agent
  "managerId": "uuid-manager-india",       // ✅ Same as parentId
  "agentCountry": "India",
  "agentType": "HOLIDAY",                  // HOLIDAY, VISA, or BOTH
  "countryIds": ["india-country-uuid"],
  "isActive": true,
  "active": true
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-agent-1",
    "fullName": "Sales Agent 1",
    "email": "agent1@company.com",
    "role": "Agent",
    "parentId": "uuid-manager-india",
    "managerId": "uuid-manager-india",
    "country": "India",
    "agentType": "HOLIDAY",
    "isActive": true
  }
}
```

---

## 🔍 How to Get Manager ID

### **Option 1: List All Managers**

```bash
GET /api/users?roleId=manager-role-uuid
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-manager-india",
      "fullName": "India Manager",
      "email": "manager.india@company.com",
      "role": "Manager",
      "country": "India"
    },
    {
      "id": "uuid-manager-uae",
      "fullName": "UAE Manager",
      "email": "manager.uae@company.com",
      "role": "Manager",
      "country": "UAE"
    }
  ]
}
```

### **Option 2: Get Specific Manager by ID**

```bash
GET /api/users/{manager-id}
```

---

## 🚨 Common Errors & Solutions

### **Error 1: "parentId (managerId) is required for agent role"**

**Cause:** Creating an Agent without `parentId`

**Solution:** Add `parentId` with Manager's UUID
```json
{
  "parentId": "uuid-of-manager",
  "managerId": "uuid-of-manager"
}
```

---

### **Error 2: "Manager cannot have parentId"**

**Cause:** Trying to assign a parent to a Manager

**Solution:** Remove `parentId` when creating Manager
```json
{
  // ❌ Remove this
  // "parentId": "some-uuid",
  
  // ✅ Managers have no parent
}
```

---

### **Error 3: "parentId must reference a manager user"**

**Cause:** Agent's `parentId` points to non-Manager user (e.g., another Agent or Super Admin)

**Solution:** Ensure `parentId` is a Manager's UUID
```bash
# First, get list of managers
GET /api/users?roleId=manager-role-uuid

# Then use one of their IDs as parentId
```

---

### **Error 4: "Manager not found"**

**Cause:** Invalid `parentId` UUID

**Solution:** Verify the Manager exists
```bash
GET /api/users/{manager-id}
```

---

## 🎯 Complete Example: Creating Full Hierarchy

### **1. Get Role IDs First**

```bash
GET /api/users/roles
```

**Response:**
```json
{
  "data": [
    { "id": "role-1", "name": "Super Admin" },
    { "id": "role-2", "name": "Manager" },
    { "id": "role-3", "name": "Agent" }
  ]
}
```

### **2. Create Super Admin**

```bash
POST /api/users
{
  "fullName": "System Admin",
  "email": "admin@company.com",
  "password": "Admin@123",
  "roleId": "role-1"
}
```

### **3. Create Manager**

```bash
POST /api/users
{
  "fullName": "India Manager",
  "email": "manager@company.com",
  "password": "Manager@123",
  "roleId": "role-2",
  "agentCountry": "India"
}
# Save the returned ID: "manager-uuid-123"
```

### **4. Create Agent Under Manager**

```bash
POST /api/users
{
  "fullName": "Sales Agent",
  "email": "agent@company.com",
  "password": "Agent@123",
  "roleId": "role-3",
  "parentId": "manager-uuid-123",      # ✅ Use Manager's ID from Step 3
  "managerId": "manager-uuid-123",     # ✅ Same as parentId
  "agentCountry": "India",
  "agentType": "HOLIDAY"
}
```

---

## 🔐 Permission-Based Creation Rules

| Actor Role | Can Create | Restrictions |
|-----------|-----------|--------------|
| **Super Admin** | Managers, Agents | Can create any user |
| **Manager** | Agents only | - Agent must have `parentId = manager's own ID`<br>- Cannot create other Managers |
| **Agent** | Nothing | Cannot create any users |

### **Example: Manager Creating Agent**

When logged in as Manager (ID: `manager-123`):

```json
{
  "fullName": "New Agent",
  "email": "newagent@company.com",
  "password": "Pass@123",
  "roleId": "agent-role-uuid",
  "parentId": "manager-123",        // ✅ MUST be the logged-in manager's ID
  "managerId": "manager-123",
  "agentType": "VISA"
}
```

❌ **This will FAIL:**
```json
{
  "parentId": "other-manager-456"   // ❌ Cannot create agent under different manager
}
```

---

## 📋 Validation Summary

```javascript
// Validation Logic
if (role === "Super Admin") {
  parentId = null;  // Must be null
}

if (role === "Manager") {
  parentId = null;  // Must be null
}

if (role === "Agent") {
  if (!parentId) {
    throw Error("parentId is required");
  }
  
  // Verify parent is a Manager
  const parent = await getUser(parentId);
  if (parent.role !== "Manager") {
    throw Error("parentId must reference a manager");
  }
}
```

---

## 🛠️ Frontend Implementation Example

```typescript
// Step 1: Get available managers
const getManagers = async () => {
  const response = await axios.get('/api/users/roles');
  const managerRole = response.data.data.find(r => r.name === 'Manager');
  
  const users = await axios.get(`/api/users?roleId=${managerRole.id}`);
  return users.data.data;
};

// Step 2: Create agent with selected manager
const createAgent = async (formData) => {
  const payload = {
    fullName: formData.fullName,
    email: formData.email,
    password: formData.password,
    roleId: formData.agentRoleId,
    parentId: formData.selectedManagerId,    // ✅ From dropdown
    managerId: formData.selectedManagerId,   // ✅ Same value
    agentCountry: formData.country,
    agentType: formData.type,
    isActive: true,
    active: true
  };
  
  return axios.post('/api/users', payload);
};
```

---

## ✅ Quick Checklist for Creating Agent

- [ ] Get list of Managers first
- [ ] Select a Manager from the list
- [ ] Use Manager's ID as both `parentId` and `managerId`
- [ ] Ensure `roleId` is for Agent role
- [ ] Include `agentCountry` and `agentType`
- [ ] Set `isActive: true` and `active: true`

---

## 🎬 Summary

1. **Super Admin** → No parent (create first)
2. **Manager** → No parent (create second)
3. **Agent** → Requires `parentId` = Manager's ID (create third)

The error you're seeing means you're trying to create an Agent without providing the Manager's ID in the `parentId` field.
