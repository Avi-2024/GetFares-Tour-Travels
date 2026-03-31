# Lead Type Feature - Tourist vs Visa Leads

## ✅ Feature Status: FULLY IMPLEMENTED

The lead type differentiation between **Tourist (HOLIDAY)** and **Visa** leads is already fully implemented in your system.

---

## 🎯 How It Works

### 1. **Lead Creation Flow**

When a user navigates to `/create-lead`, they see two options:

#### **Tourist Lead Button** 🏖️
- For holiday packages, tours, and leisure travel
- Includes fields: Hotel preferences, Travel packages, Campaign tracking, Lead source

#### **Visa Lead Button** ✈️
- For visa applications and immigration services
- Simplified workflow with visa-specific fields
- Hides unnecessary fields: `leadSource`, `preferredHotelCategory`, `campaignId`

---

## 📋 Frontend Implementation

### File: `frontend/src/pages/leads/CreateLead.tsx`

```typescript
// Lead type state
const [leadType, setLeadType] = useState<LeadType>(null) // 'HOLIDAY' | 'VISA' | null

// Hidden fields configuration
const HIDDEN_FIELDS_BY_TYPE: Record<NonNullable<LeadType>, string[]> = {
  VISA: ['leadSource', 'preferredHotelCategory', 'campaignId'],
  HOLIDAY: []
}

// Lead type selection
const handleLeadTypeSelect = (type: 'HOLIDAY' | 'VISA') => {
  setLeadType(type)
  setForm(initialForm)
  // Reset form and errors
}

// Form submission includes leadType
await leadsService.createLead({
  // ... other fields
  leadType,  // ← Sent to backend
  status: 'OPEN',
  qualificationCompleted: true
})
```

---

## 🔧 Backend Implementation

### File: `backend/src/modules/leads/leads.service.js`

```javascript
// Lead type normalization
function normalizeLeadType(value) {
  if (!value) {
    return "HOLIDAY"; // Default
  }

  const normalized = String(value).trim().toUpperCase();
  if (normalized.includes("VISA")) return "VISA";
  if (normalized.includes("HOLIDAY")) return "HOLIDAY";
  if (normalized === "BOTH") return "BOTH";
  return "HOLIDAY";
}

// Saved to database
const mapped = {
  // ... other fields
  lead_type: normalizeLeadType(payload.leadType ?? payload.type),
  // ...
};
```

---

## 🗄️ Database Schema

### Table: `leads`

```sql
-- Migration: 006_prd_completion_modules.sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) DEFAULT 'HOLIDAY';
```

**Allowed Values:**
- `HOLIDAY` - Tourist/leisure travel leads (default)
- `VISA` - Visa application leads
- `BOTH` - Agents who handle both types

---

## 🎯 Lead Assignment Logic

The system uses `lead_type` for intelligent agent assignment:

### Agent Matching Algorithm

```javascript
// File: backend/src/modules/leads/leads.service.js

async function selectAssigneeForLead(lead, options = {}) {
  const leadType = normalizeAgentType(lead.leadType ?? lead.type ?? null);
  const requiredLeadType = leadType === "BOTH" ? null : leadType;
  
  // Filter agents by:
  // 1. Country match
  // 2. Agent type match (HOLIDAY/VISA/BOTH)
  
  candidates = candidates.filter((candidate) => {
    const agentType = normalizeAgentType(candidate.agentType);
    
    // Agent must handle this lead type
    if (requiredLeadType && 
        (!agentType || (agentType !== requiredLeadType && agentType !== "BOTH"))) {
      return false;
    }
    return true;
  });
  
  // Round-robin assignment within filtered pool
}
```

---

## 📊 How Lead Type Affects Assignment

### Example Scenarios:

#### Scenario 1: Tourist Lead Created
```
Lead: { leadType: "HOLIDAY", leadCountry: "India" }

Eligible Agents:
✅ Agent A: { agentType: "HOLIDAY", country: "India" }
✅ Agent B: { agentType: "BOTH", country: "India" }
❌ Agent C: { agentType: "VISA", country: "India" }
```

#### Scenario 2: Visa Lead Created
```
Lead: { leadType: "VISA", leadCountry: "UAE" }

Eligible Agents:
❌ Agent A: { agentType: "HOLIDAY", country: "UAE" }
✅ Agent B: { agentType: "BOTH", country: "UAE" }
✅ Agent C: { agentType: "VISA", country: "UAE" }
```

---

## 🔍 Filtering & Reporting

### Lead List Filtering

You can filter leads by type in the leads list:

```javascript
// API: GET /api/leads?leadType=VISA
// API: GET /api/leads?leadType=HOLIDAY

// Backend automatically filters based on agent permissions
```

### Agent Dashboard

Agents see only leads matching their `agentType`:
- **HOLIDAY agents** → Only tourist leads
- **VISA agents** → Only visa leads  
- **BOTH agents** → All leads

---

## 🎨 UI Differences

### Tourist Lead Form
Shows all fields including:
- ✅ Preferred Hotel Category
- ✅ Lead Source
- ✅ Campaign Selection
- ✅ Travel Purpose
- ✅ Budget

### Visa Lead Form
Hides unnecessary fields:
- ❌ Preferred Hotel Category (hidden)
- ❌ Lead Source (hidden)
- ❌ Campaign Selection (hidden)
- ✅ Travel Purpose (shown)
- ✅ Budget (shown)

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "Tourist Lead" or "Visa Lead" button        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Form opens with leadType = 'HOLIDAY' or 'VISA'          │
│     - Conditional fields shown/hidden based on type         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. User fills form and submits                             │
│     POST /api/leads { leadType: 'VISA', ... }               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Backend normalizes and saves to database                │
│     leads.lead_type = 'VISA'                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Auto-assignment finds matching agent                    │
│     - Filters by country + agentType                        │
│     - Round-robin within eligible pool                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Lead assigned to appropriate agent                      │
│     - VISA lead → VISA or BOTH agent                        │
│     - HOLIDAY lead → HOLIDAY or BOTH agent                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing the Feature

### Test Case 1: Create Tourist Lead
1. Navigate to `/create-lead`
2. Click **"Tourist Lead"** button
3. Fill form (all fields visible)
4. Submit
5. Verify: `lead_type = 'HOLIDAY'` in database
6. Verify: Assigned to HOLIDAY or BOTH agent

### Test Case 2: Create Visa Lead
1. Navigate to `/create-lead`
2. Click **"Visa Lead"** button
3. Fill form (hotel/campaign fields hidden)
4. Submit
5. Verify: `lead_type = 'VISA'` in database
6. Verify: Assigned to VISA or BOTH agent

---

## 📝 Database Query Examples

### Get all Visa leads
```sql
SELECT * FROM leads WHERE lead_type = 'VISA';
```

### Get all Tourist leads
```sql
SELECT * FROM leads WHERE lead_type = 'HOLIDAY';
```

### Count leads by type
```sql
SELECT lead_type, COUNT(*) as count 
FROM leads 
GROUP BY lead_type;
```

### Get agents handling Visa leads
```sql
SELECT * FROM users 
WHERE agent_type IN ('VISA', 'BOTH') 
AND is_active = true;
```

---

## ✅ Summary

**The lead_type feature is fully functional:**

1. ✅ Frontend has two separate buttons for Tourist/Visa leads
2. ✅ Form fields conditionally shown/hidden based on type
3. ✅ Backend normalizes and saves `lead_type` to database
4. ✅ Database column exists with default value 'HOLIDAY'
5. ✅ Auto-assignment filters agents by `agentType` matching `lead_type`
6. ✅ Round-robin assignment works within filtered agent pool
7. ✅ Agents see only leads matching their type

**No additional changes needed!** The system is production-ready.

---

## 🔗 Related Files

### Frontend
- `frontend/src/pages/leads/CreateLead.tsx` - Lead creation form with type selection

### Backend
- `backend/src/modules/leads/leads.service.js` - Lead type normalization & assignment logic
- `backend/src/modules/leads/leads.repository.js` - Database queries
- `backend/database/migrations/006_prd_completion_modules.sql` - Schema migration

### Database
- Table: `leads` - Column: `lead_type VARCHAR(20) DEFAULT 'HOLIDAY'`
- Table: `users` - Column: `agent_type VARCHAR(20)` for agent filtering

---

**Last Updated**: 2024
**Feature Status**: ✅ Production Ready
