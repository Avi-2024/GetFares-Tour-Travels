# User Creation Flow - Manager Selection for Agents

## ✅ Fix Applied

The frontend now correctly sends both `parentId` and `managerId` when creating or updating Agent users.

## 🎯 How It Works

### **1. User Selects Role**
When creating a user, the form detects if the selected role is an "Agent" role by checking if the role name contains:
- "agent"
- "consultant"  
- "executive"

### **2. Manager Dropdown Appears**
If the role is detected as an Agent role, two additional fields appear:
- **Agent Type**: Dropdown to select HOLIDAY, VISA, or BOTH
- **Reports To (Manager)**: Dropdown to select which Manager this Agent reports to

### **3. Manager Options**
The dropdown is automatically populated with users whose role contains:
- "manager"
- "admin"
- "management"

### **4. Form Submission**
When the form is submitted, the selected Manager's ID is sent as **both** `parentId` and `managerId`:

```javascript
{
  fullName: "Agent Name",
  email: "agent@company.com",
  password: "Password123",
  roleId: "agent-role-uuid",
  parentId: "selected-manager-uuid",    // ✅ Added
  managerId: "selected-manager-uuid",   // ✅ Already existed
  agentType: "HOLIDAY",
  country: "India"
}
```

## 📋 Step-by-Step User Guide

### **Creating an Agent User**

1. **Click "New User" button**
   
2. **Fill in basic details:**
   - Full Name
   - Email
   - Phone
   - Country
   - Temporary Password

3. **Select Role:**
   - Type or select a role that contains "Agent" (e.g., "Sales Agent", "Travel Consultant")

4. **Additional fields appear automatically:**
   - **Agent Type**: Select HOLIDAY, VISA, or BOTH
   - **Reports To (Manager)**: Select the manager from dropdown

5. **Select Manager:**
   - Click the "Reports To (Manager)" dropdown
   - Search or select the manager this agent will report to
   - The dropdown shows: "Manager Name (email@example.com)"

6. **Click "Create User"**

## 🔍 Visual Flow

```
┌─────────────────────────────────────┐
│   Create New User Form              │
├─────────────────────────────────────┤
│ Full Name: [John Agent          ]  │
│ Email:     [john@company.com    ]  │
│ Phone:     [+919876543210       ]  │
│ Country:   [India ▼             ]  │
│ Role:      [Sales Agent ▼       ]  │ ← User selects Agent role
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🎯 Agent-specific fields appear │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Agent Type:    [HOLIDAY ▼       ]  │ ← Appears for Agent
│ Reports To:    [India Manager ▼ ]  │ ← Appears for Agent
│                                     │
│ Password:  [••••••••            ]  │
│                                     │
│ [Cancel]              [Create User] │
└─────────────────────────────────────┘
                  ↓
         Backend receives:
         {
           parentId: "manager-uuid",
           managerId: "manager-uuid"
         }
```

## 🎨 UI Behavior

### **Role Detection Logic**
```typescript
const isAgentRole = useMemo(() => {
  if (!selectedRole) return false
  const nameIndicatesAgent = selectedRoleName.includes('agent') || 
                              selectedRoleName.includes('consultant') ||
                              selectedRoleName.includes('executive')
  return nameIndicatesAgent
}, [selectedRole, selectedRoleName])
```

### **Manager Options Logic**
```typescript
const managerOptions = useMemo(
  () => [
    { value: '', label: 'Select manager' },
    ...users
      .filter(candidate => {
        const roleName = (candidate.role || '').toLowerCase()
        return roleName.includes('manager') || 
               roleName.includes('admin') ||
               roleName.includes('management')
      })
      .map(candidate => ({
        value: candidate.id,
        label: `${candidate.fullName} (${candidate.email})`
      }))
  ],
  [users]
)
```

## 🔧 Backend Validation

The backend validates:
1. ✅ Agent role **requires** `parentId`
2. ✅ `parentId` must reference a valid Manager user
3. ✅ Manager role **cannot** have `parentId` (must be null)
4. ✅ Super Admin **cannot** have `parentId` (must be null)

## 📝 Example API Request

### **Creating Agent**
```bash
POST /api/users
Content-Type: application/json

{
  "fullName": "John Agent",
  "email": "john@company.com",
  "password": "SecurePass123!",
  "phone": "+919876543210",
  "roleId": "agent-role-uuid",
  "parentId": "manager-uuid-123",      # ✅ Manager's ID
  "managerId": "manager-uuid-123",     # ✅ Same as parentId
  "agentType": "HOLIDAY",
  "country": "India",
  "isActive": true
}
```

### **Response**
```json
{
  "data": {
    "id": "new-agent-uuid",
    "fullName": "John Agent",
    "email": "john@company.com",
    "role": "Sales Agent",
    "parentId": "manager-uuid-123",
    "managerId": "manager-uuid-123",
    "agentType": "HOLIDAY",
    "country": "India",
    "isActive": true
  }
}
```

## ✅ Testing Checklist

- [ ] Create a Manager user (no parentId required)
- [ ] Create an Agent user
- [ ] Verify "Agent Type" field appears when Agent role is selected
- [ ] Verify "Reports To (Manager)" field appears when Agent role is selected
- [ ] Select a Manager from the dropdown
- [ ] Submit the form
- [ ] Verify no "parentId is required" error
- [ ] Verify Agent is created successfully
- [ ] Verify Agent's parentId is set to selected Manager's ID

## 🚨 Troubleshooting

### **"parentId (managerId) is required for agent role"**
**Cause:** Manager was not selected in the dropdown

**Solution:** 
1. Ensure you selected a role that contains "agent"
2. Ensure the "Reports To (Manager)" dropdown appeared
3. Select a manager from the dropdown before submitting

### **Manager dropdown is empty**
**Cause:** No users with Manager role exist

**Solution:**
1. First create a Manager user
2. Then create Agent users under that Manager

### **Manager dropdown doesn't appear**
**Cause:** Selected role is not detected as an Agent role

**Solution:**
1. Ensure the role name contains "agent", "consultant", or "executive"
2. Or create a new role with one of these keywords in the name

## 📊 Summary

| Field | Required For | Value |
|-------|-------------|-------|
| `parentId` | Agent only | Manager's UUID |
| `managerId` | Agent only | Manager's UUID (same as parentId) |
| `agentType` | Agent only | HOLIDAY, VISA, or BOTH |

The fix ensures that when you create an Agent user and select a Manager from the dropdown, both `parentId` and `managerId` are sent to the backend, satisfying the validation requirement.
