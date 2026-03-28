# Lead Assignment Logic - Complete Documentation

## Overview

Lead assignment system automatically assigns incoming leads to the most suitable agent/manager based on multiple criteria including availability, workload, expertise, country match, and agent type.

---

## 🔄 Complete Assignment Flow

```
Lead Created/Received
    ↓
Check if already assigned?
    ↓ No
Check if lead is closed? (CONVERTED/LOST/NON_RESPONSIVE)
    ↓ No
Determine assignment role (agent/manager)
    ↓
Find all active assignable users
    ↓
Apply filters:
    ├─ Manager filter (if agent role + manager context)
    ├─ Country filter (lead country vs agent country)
    ├─ Agent type filter (VISA/HOLIDAY/BOTH)
    └─ Destination expertise filter
    ↓
Check if high-value lead? (VIP or budget >= 150k)
    ├─ YES → Assign to agent with lowest workload + highest incentive
    └─ NO → Round-robin assignment
    ↓
Assignee found?
    ├─ YES → Assign lead + set response deadline (15 min)
    └─ NO → Queue lead + escalate to manager
```

---

## 📋 Assignment Logic Components

### 1. **Active User Detection**

```javascript
// From leads.repository.js - findActiveAssignableUsers()

Active User Criteria:
✅ is_active = true
✅ is_on_leave = false
✅ active_status = true (presence toggle)
✅ last_login IS NOT NULL (has valid token)

Role Filtering:
- If roleName = "agent" → Filter by ASSIGNABLE_ROLES
  └─ ['sales_consultant', 'agent', 'visa_executive', 'holiday_consultant']
  
- If roleName = "manager" → Filter by MANAGER_ROLES
  └─ ['manager', 'department_head', 'team_lead']
  
- If roleName = null → Return all ASSIGNABLE_ROLES users
```

**Code Reference:**
```javascript
const activeUsers = users.filter((row) => {
  const isActive = row.is_active ?? true
  const isOnLeave = row.is_on_leave ?? false
  const activeToggle = row.active ?? undefined
  const isPresenceActive = activeToggle === undefined ? true : Boolean(activeToggle)
  const lastLogin = row.last_login ?? null
  const hasToken = Boolean(lastLogin)
  
  return isActive && !isOnLeave && isPresenceActive && hasToken
})
```

---

### 2. **Manager Team Filter**

```javascript
// From leads.service.js - assignLead()

If assigning to agent AND requester is manager:
├─ Get manager's team members
├─ Filter candidates to only manager's team
└─ If no team members available → return null

Example:
Manager ID: M123
Team: [A1, A2, A3]
Candidates: [A1, A2, A4, A5]
Filtered: [A1, A2] ← Only manager's team
```

**Code Reference:**
```javascript
if (options.managerId && roleName === ASSIGNMENT_ROLES.AGENT) {
  const managedOnly = candidates.filter(
    (candidate) => candidate.managerId === options.managerId
  )
  if (!managedOnly.length) return null
  candidates = managedOnly
}
```

---

### 3. **Country & Agent Type Matching**

```javascript
// From leads.service.js - selectAssigneeForLead()

Lead Properties:
├─ leadCountry: "india" / "uae" / null
└─ leadType: "VISA" / "HOLIDAY" / "BOTH"

Agent Properties:
├─ country: "india" / "uae" / null
└─ agentType: "VISA" / "HOLIDAY" / "BOTH"

Matching Logic:
1. Country Match:
   - If lead.leadCountry exists AND agent.country exists
   - Must match exactly (case-insensitive)
   - If no match → Filter out agent

2. Agent Type Match:
   - If lead.leadType = "BOTH" → No filtering
   - If lead.leadType = "VISA" → Agent must be "VISA" or "BOTH"
   - If lead.leadType = "HOLIDAY" → Agent must be "HOLIDAY" or "BOTH"
   - If no match → Filter out agent
```

**Code Reference:**
```javascript
const leadCountry = normalizeCategory(lead.leadCountry ?? lead.country ?? null)
const leadType = normalizeAgentType(lead.leadType ?? lead.type ?? null)
const requiredLeadType = leadType === "BOTH" ? null : leadType

const scoped = candidates.filter((candidate) => {
  const agentCountry = normalizeCategory(candidate.country)
  const agentType = normalizeAgentType(candidate.agentType)
  
  // Country check
  if (leadCountry && (!agentCountry || agentCountry !== leadCountry)) {
    return false
  }
  
  // Type check
  if (requiredLeadType && (!agentType || (agentType !== requiredLeadType && agentType !== "BOTH"))) {
    return false
  }
  
  return true
})
```

---

### 4. **Destination Expertise Matching**

```javascript
// From leads.service.js - selectAssigneeForLead()

Lead has destination: "Paris" (ID: D123)

Agent expertise_destinations:
Agent A1: ["D123", "paris", "france"]
Agent A2: ["london", "uk"]
Agent A3: ["D456", "dubai"]

Matching Process:
1. Create destination tokens from lead:
   └─ ["d123", "paris"] (ID + name, lowercase)

2. Check each agent's expertise:
   Agent A1: Has "d123" or "paris" → MATCH ✅
   Agent A2: No match → SKIP
   Agent A3: No match → SKIP

3. If matches found → Use matched agents only
4. If no matches → Use all candidates (no filtering)
```

**Code Reference:**
```javascript
if (lead.destinationId) {
  const destination = await repository.findDestinationById(lead.destinationId)
  const destinationTokens = new Set([
    String(lead.destinationId).toLowerCase()
  ])
  
  if (destination?.name) {
    destinationTokens.add(String(destination.name).trim().toLowerCase())
  }
  
  const matchedByExpertise = candidates.filter((candidate) => {
    const expertiseSet = new Set(
      (candidate.expertiseDestinations || []).map((item) =>
        String(item).trim().toLowerCase()
      )
    )
    
    for (const token of destinationTokens) {
      if (expertiseSet.has(token)) return true
    }
    return false
  })
  
  if (matchedByExpertise.length) {
    pool = matchedByExpertise
  }
}
```

---

### 5. **High-Value Lead Assignment**

```javascript
// From leads.service.js - selectAssigneeForLead()

High-Value Lead Criteria:
├─ lead.isVip = true
└─ OR lead.budget >= 150000

Assignment Strategy:
1. Get open lead count for each agent
2. Sort agents by:
   ├─ Primary: Lowest open lead count (workload)
   ├─ Secondary: Highest incentive percent
   └─ Tertiary: Agent ID (alphabetical)
3. Assign to first agent in sorted list

Example:
Agent A1: openLeads=5, incentive=10%
Agent A2: openLeads=3, incentive=8%
Agent A3: openLeads=3, incentive=12%

Sorted:
1. A3 (3 leads, 12% incentive) ← SELECTED
2. A2 (3 leads, 8% incentive)
3. A1 (5 leads, 10% incentive)
```

**Code Reference:**
```javascript
const isHighValueLead = 
  Boolean(lead.isVip) || 
  Number(lead.budget || 0) >= AUTOMATION_DEFAULTS.highBudgetThreshold

if (isHighValueLead) {
  const sortedByHighValueRule = [...pool].sort((left, right) => {
    const leftLoad = openLoadByUser[left.id] || 0
    const rightLoad = openLoadByUser[right.id] || 0
    
    // Sort by workload first
    if (leftLoad !== rightLoad) {
      return leftLoad - rightLoad
    }
    
    // Then by incentive
    if (left.incentivePercent !== right.incentivePercent) {
      return right.incentivePercent - left.incentivePercent
    }
    
    // Finally by ID
    return String(left.id).localeCompare(String(right.id))
  })
  
  return sortedByHighValueRule[0]
}
```

---

### 6. **Round-Robin Assignment**

```javascript
// From leads.service.js - selectAssigneeForLead()

Round-Robin Logic:
1. Sort all candidates by ID (alphabetical)
2. Find last assigned user from this pool
3. Select next user in rotation

Example:
Pool: [A1, A2, A3, A4] (sorted by ID)
Last assigned: A2
Next: A3 ← SELECTED

Edge Cases:
- Last assigned = A4 → Next = A1 (wrap around)
- Last assigned not in pool → Select A1 (first)
- No last assigned → Select A1 (first)
```

**Code Reference:**
```javascript
const roundRobinPool = [...pool].sort((left, right) =>
  String(left.id).localeCompare(String(right.id))
)

const lastAssignedUserId = await repository.findLatestAssignedUserId(poolIds)

if (!lastAssignedUserId) {
  return roundRobinPool[0]
}

const lastIndex = roundRobinPool.findIndex(
  (candidate) => candidate.id === lastAssignedUserId
)

if (lastIndex === -1 || lastIndex === roundRobinPool.length - 1) {
  return roundRobinPool[0]
}

return roundRobinPool[lastIndex + 1]
```

---

### 7. **Lead Queueing**

```javascript
// From leads.service.js - queueLeadIfNeeded()

Queue Triggers:
├─ No active agents available
├─ No agents match country/type
├─ No agents in manager's team
└─ Assignment failed for any reason

Queue Entry:
{
  lead_id: "L123",
  reason: "NO_ACTIVE_AGENT" | "NO_ASSIGNABLE_AGENT_FOR_MANAGER_TEAM_OR_COUNTRY",
  queued_at: "2024-01-15T10:30:00Z",
  processed_at: null
}

Processing Queue:
1. Get unprocessed queued leads (FIFO)
2. Try to assign each lead
3. If assigned → Mark as processed
4. If still no agent → Keep in queue
```

**Code Reference:**
```javascript
async function queueLeadIfNeeded(lead, reason = "NO_ACTIVE_AGENT") {
  if (!lead?.id) return null
  
  return repository.enqueueLead({
    leadId: lead.id,
    reason
  })
}

// Queue processing
async function processQueuedLeads(payload = {}, context = {}) {
  const queuedLeads = await repository.listQueuedLeads({ limit })
  
  for (const entry of queuedLeads) {
    const lead = await repository.findById(entry.lead_id)
    
    if (!lead || lead.assignedTo) {
      await repository.markQueuedLeadProcessed(entry.id)
      continue
    }
    
    const assigned = await assignLead(lead.id, {
      force: true,
      mode: "QUEUE_ASSIGN",
      roleName: "agent"
    }, context)
    
    if (assigned.assignedTo) {
      await repository.markQueuedLeadProcessed(entry.id)
      summary.assigned += 1
    } else {
      summary.skipped += 1
    }
  }
}
```

---

### 8. **Escalation Events**

```javascript
// From leads.service.js - assignLead()

Escalation Scenarios:

1. No Assignable Manager:
   └─ Reason: "NO_ASSIGNABLE_MANAGER"
   └─ Roles: ["manager"]

2. No Agent for Manager's Team:
   └─ Reason: "NO_ASSIGNABLE_AGENT_FOR_MANAGER_TEAM_OR_COUNTRY"
   └─ Roles: undefined

3. No Agent Available:
   └─ Reason: "NO_ASSIGNABLE_AGENT"
   └─ Roles: undefined

Event Emission:
events.emitEscalated({
  leadId: lead.id,
  reason: "NO_ASSIGNABLE_MANAGER",
  role: "manager",
  roles: ["manager"]
})
```

---

## 🎯 Assignment Decision Tree

```
START: Assign Lead
    ↓
Is lead already assigned?
    ├─ YES → Return existing assignment
    └─ NO → Continue
    ↓
Is lead closed? (CONVERTED/LOST/NON_RESPONSIVE)
    ├─ YES → Return lead (no assignment)
    └─ NO → Continue
    ↓
Get all active users (is_active=true, is_on_leave=false, has_token=true)
    ↓
Filter by role (agent/manager)
    ↓
Is manager assigning to agent?
    ├─ YES → Filter to manager's team only
    └─ NO → Continue
    ↓
Filter by country & agent type
    ↓
Any candidates left?
    ├─ NO → Queue lead + Escalate → END
    └─ YES → Continue
    ↓
Filter by destination expertise (if applicable)
    ↓
Is high-value lead? (VIP or budget >= 150k)
    ├─ YES → Sort by: workload ASC, incentive DESC → Assign to first
    └─ NO → Round-robin assignment
    ↓
Assignee found?
    ├─ YES → Assign + Set response deadline (15 min) → END
    └─ NO → Queue lead + Escalate → END
```

---

## 📊 Assignment Examples

### Example 1: Regular Lead Assignment

```javascript
Lead:
{
  id: "L001",
  leadCountry: "india",
  leadType: "HOLIDAY",
  destinationId: "D123", // Paris
  budget: 50000,
  isVip: false
}

Active Agents:
A1: { country: "india", agentType: "HOLIDAY", expertise: ["paris"], openLeads: 5 }
A2: { country: "india", agentType: "BOTH", expertise: ["london"], openLeads: 3 }
A3: { country: "uae", agentType: "HOLIDAY", expertise: ["paris"], openLeads: 2 }

Step 1: Filter by country
└─ Result: [A1, A2] (A3 removed - country mismatch)

Step 2: Filter by agent type
└─ Result: [A1, A2] (both match HOLIDAY)

Step 3: Filter by expertise
└─ Result: [A1] (only A1 has Paris expertise)

Step 4: Not high-value lead → Round-robin
└─ Last assigned: null
└─ Selected: A1 ✅
```

### Example 2: High-Value Lead Assignment

```javascript
Lead:
{
  id: "L002",
  leadCountry: "uae",
  leadType: "VISA",
  budget: 200000, // High value
  isVip: true
}

Active Agents:
A1: { country: "uae", agentType: "VISA", openLeads: 10, incentive: 5% }
A2: { country: "uae", agentType: "BOTH", openLeads: 5, incentive: 8% }
A3: { country: "uae", agentType: "VISA", openLeads: 5, incentive: 12% }

Step 1: Filter by country
└─ Result: [A1, A2, A3] (all match UAE)

Step 2: Filter by agent type
└─ Result: [A1, A2, A3] (all match VISA or BOTH)

Step 3: High-value lead → Sort by workload + incentive
└─ A3: 5 leads, 12% incentive ← BEST
└─ A2: 5 leads, 8% incentive
└─ A1: 10 leads, 5% incentive

Selected: A3 ✅
```

### Example 3: Manager Team Assignment

```javascript
Manager M1 assigns lead to agent:

Lead:
{
  id: "L003",
  leadCountry: "india",
  leadType: "HOLIDAY"
}

Manager M1:
{
  id: "M1",
  role: "manager",
  teamMembers: ["A1", "A2"]
}

Active Agents:
A1: { managerId: "M1", country: "india", agentType: "HOLIDAY" }
A2: { managerId: "M1", country: "india", agentType: "VISA" }
A3: { managerId: "M2", country: "india", agentType: "HOLIDAY" }

Step 1: Filter by manager's team
└─ Result: [A1, A2] (A3 removed - different manager)

Step 2: Filter by country
└─ Result: [A1, A2] (both match India)

Step 3: Filter by agent type
└─ Result: [A1] (A2 removed - VISA type)

Selected: A1 ✅
```

### Example 4: No Agent Available - Queue

```javascript
Lead:
{
  id: "L004",
  leadCountry: "japan",
  leadType: "HOLIDAY"
}

Active Agents:
A1: { country: "india", agentType: "HOLIDAY" }
A2: { country: "uae", agentType: "VISA" }

Step 1: Filter by country
└─ Result: [] (no agents for Japan)

Step 2: No candidates available
└─ Queue lead with reason: "NO_ASSIGNABLE_AGENT"
└─ Emit escalation event
└─ Return lead (unassigned)

Queue Entry:
{
  lead_id: "L004",
  reason: "NO_ASSIGNABLE_AGENT",
  queued_at: "2024-01-15T10:30:00Z"
}
```

---

## 🔧 Configuration Constants

```javascript
// From leads.service.js

AUTOMATION_DEFAULTS = {
  highBudgetThreshold: 150000,      // High-value lead threshold
  distributionLimit: 25,            // Max leads per distribution run
  inactiveMinutes: 15,              // Reassignment timeout
  overdueFollowupLimit: 100,        // Max overdue followups to process
  slaCheckLimit: 100                // Max SLA breaches to check
}

ASSIGNMENT_ROLES = {
  AGENT: "agent",
  MANAGER: "manager"
}

ASSIGNABLE_ROLES = [
  "sales_consultant",
  "agent",
  "visa_executive",
  "holiday_consultant"
]

MANAGER_ROLES = [
  "manager",
  "department_head",
  "team_lead"
]
```

---

## 🚨 Edge Cases & Handling

### 1. **Exclude Current Assignee**
```javascript
// When reassigning, exclude current assignee
if (options.excludeUserId && candidates.length > 1) {
  const filtered = candidates.filter(
    (candidate) => candidate.id !== options.excludeUserId
  )
  if (filtered.length) {
    candidates = filtered
  }
}
```

### 2. **Country Mismatch Validation**
```javascript
// Manual assignment with country mismatch
if (payload.assignedTo) {
  const assignee = await repository.findAssignableUserById(payload.assignedTo)
  const leadCountry = normalizeCategory(lead.leadCountry)
  const assigneeCountry = normalizeCategory(assignee.country)
  
  if (leadCountry && assigneeCountry && leadCountry !== assigneeCountry) {
    throw new AppError(400, 
      "Assignee country does not match lead country",
      "ASSIGNEE_COUNTRY_MISMATCH"
    )
  }
}
```

### 3. **Manager Team Restriction**
```javascript
// Manager can only assign to own team
if (managerId && !isSuperAdminRole(requestRole) && 
    assignee.managerId !== managerId) {
  throw new AppError(403,
    "Manager can assign only to own team members",
    "ASSIGNEE_OUTSIDE_MANAGER_TEAM"
  )
}
```

---

## 📈 Performance Optimization

### Current Implementation:
- ✅ Loads all users once per assignment
- ✅ Filters in-memory (fast)
- ✅ Caches role lookup
- ❌ No workload caching (queries DB each time)
- ❌ No agent availability status

### Recommended Improvements:
1. Cache agent workload for 5 minutes
2. Add agent availability status (AVAILABLE/BUSY/OFFLINE)
3. Pre-filter inactive agents at DB level
4. Add agent performance scoring

---

## 🔄 Reassignment Logic

```javascript
// From leads.service.js - reassignInactive()

Reassignment Triggers:
1. Lead assigned but no activity for X minutes (default: 15)
2. No response_at recorded
3. Lead status still OPEN

Process:
1. Find overdue assigned leads
2. For each lead:
   ├─ Get current assignee
   ├─ Assign to different agent (exclude current)
   └─ If reassigned → Log activity + emit event

Activity Log:
{
  leadId: "L123",
  activityType: "LEAD_REASSIGNED",
  notes: "INACTIVE_ASSIGNEE_TIMEOUT"
}
```

---

## 📝 Summary

**Lead Assignment Priority:**
1. ✅ Active users only (not on leave, has token)
2. ✅ Role-based filtering (agent/manager)
3. ✅ Manager team restriction (if applicable)
4. ✅ Country match (lead country = agent country)
5. ✅ Agent type match (VISA/HOLIDAY/BOTH)
6. ✅ Destination expertise (preferred)
7. ✅ High-value leads → Lowest workload + highest incentive
8. ✅ Regular leads → Round-robin rotation
9. ✅ No agent available → Queue + escalate

**Key Features:**
- Automatic assignment on lead creation
- Manual assignment with validation
- Reassignment for inactive agents
- Queue system for unassigned leads
- Escalation events for monitoring
- SLA tracking (15-minute response deadline)
