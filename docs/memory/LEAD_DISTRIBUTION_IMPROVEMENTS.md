# Lead Distribution Logic - Improvements

## Current Problems

### 1. No Workload Balancing for Regular Leads
- Round-robin doesn't consider current workload
- Agent with 50 leads gets same priority as agent with 5 leads

### 2. Destination Expertise is Binary
- Either you have expertise or you don't
- No priority scoring (expert vs beginner)

### 3. No Agent Performance Metrics
- Doesn't consider conversion rate, response time, customer satisfaction

### 4. Country Filtering Too Strict
- If no agent matches country, lead goes to queue
- Should fallback to nearby countries or agents with "BOTH" capability

### 5. Manager Assignment Has No Logic
- Managers are assigned round-robin only
- No consideration of team size, workload, or expertise

---

## Recommended Improvements

### ✅ Improvement 1: Weighted Scoring System

Instead of binary filters, use a scoring system:

```javascript
function calculateAgentScore(agent, lead, openLoad) {
  let score = 100 // Base score
  
  // 1. Workload penalty (-30 points max)
  const avgLoad = totalLeads / totalAgents
  const loadRatio = openLoad[agent.id] / avgLoad
  score -= Math.min(30, loadRatio * 15)
  
  // 2. Destination expertise bonus (+20 points)
  if (agent.expertiseDestinations.includes(lead.destinationId)) {
    score += 20
  }
  
  // 3. Country match bonus (+15 points)
  if (agent.country === lead.leadCountry) {
    score += 15
  }
  
  // 4. Agent type match (+10 points)
  if (agent.agentType === lead.leadType || agent.agentType === 'BOTH') {
    score += 10
  }
  
  // 5. Performance bonus (+25 points max)
  // Based on conversion rate, avg response time, customer rating
  score += agent.performanceScore || 0
  
  // 6. Incentive alignment (+10 points)
  if (lead.budget >= 150000 && agent.incentivePercent > 5) {
    score += 10
  }
  
  return score
}

// Select agent with highest score
const scored = candidates.map(agent => ({
  agent,
  score: calculateAgentScore(agent, lead, openLoadByUser)
}))
scored.sort((a, b) => b.score - a.score)
return scored[0].agent
```

### ✅ Improvement 2: Fallback Hierarchy

```javascript
async function selectAssigneeWithFallback(lead, options) {
  // Level 1: Exact match (country + type + expertise)
  let candidates = await findExactMatch(lead, options)
  if (candidates.length) return selectBestAgent(candidates, lead)
  
  // Level 2: Country + type match (no expertise required)
  candidates = await findCountryTypeMatch(lead, options)
  if (candidates.length) return selectBestAgent(candidates, lead)
  
  // Level 3: Type match only (any country)
  candidates = await findTypeMatch(lead, options)
  if (candidates.length) return selectBestAgent(candidates, lead)
  
  // Level 4: Any active agent with "BOTH" capability
  candidates = await findBothTypeAgents(options)
  if (candidates.length) return selectBestAgent(candidates, lead)
  
  // Level 5: Queue for manual assignment
  return null
}
```

### ✅ Improvement 3: Manager Assignment Logic

```javascript
async function selectManagerForLead(lead, options) {
  const managers = await repository.findActiveManagers()
  
  const scored = managers.map(manager => {
    let score = 100
    
    // 1. Team size penalty (prefer managers with smaller teams)
    const teamSize = manager.teamMemberCount || 0
    score -= Math.min(20, teamSize * 2)
    
    // 2. Team workload penalty
    const teamLoad = manager.teamOpenLeadsCount || 0
    score -= Math.min(30, teamLoad * 0.5)
    
    // 3. Country match bonus
    if (manager.country === lead.leadCountry) {
      score += 20
    }
    
    // 4. Expertise bonus
    if (manager.expertiseDestinations?.includes(lead.destinationId)) {
      score += 15
    }
    
    // 5. SLA breach history penalty
    const breachRate = manager.teamSlaBreachRate || 0
    score -= breachRate * 10
    
    return { manager, score }
  })
  
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.manager || null
}
```

### ✅ Improvement 4: Real-time Workload Balancing

```javascript
// Add to repository
async function getAgentWorkloadMetrics(agentIds) {
  return db.query(`
    SELECT 
      u.id,
      COUNT(CASE WHEN l.status IN ('OPEN', 'CONTACTED', 'WIP', 'FOLLOW_UP') THEN 1 END) as open_leads,
      COUNT(CASE WHEN l.status = 'CONVERTED' THEN 1 END) as converted_leads,
      AVG(CASE WHEN l.response_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (l.response_at - l.created_at))/60 
      END) as avg_response_minutes,
      COUNT(CASE WHEN l.sla_breached = true THEN 1 END) as sla_breaches
    FROM users u
    LEFT JOIN leads l ON l.assigned_to = u.id AND l.created_at > NOW() - INTERVAL '30 days'
    WHERE u.id = ANY($1)
    GROUP BY u.id
  `, [agentIds])
}
```

### ✅ Improvement 5: Priority Queue System

```javascript
// Add priority levels to queued leads
async function queueLeadWithPriority(lead, reason) {
  const priority = calculateQueuePriority(lead)
  
  return repository.enqueueLead({
    leadId: lead.id,
    reason,
    priority, // 1 (LOW), 2 (MEDIUM), 3 (HIGH), 4 (URGENT)
    queuedAt: new Date().toISOString()
  })
}

function calculateQueuePriority(lead) {
  if (lead.isVip || lead.budget >= 200000) return 4 // URGENT
  if (lead.temperature === 'HOT' || lead.budget >= 150000) return 3 // HIGH
  if (lead.temperature === 'WARM') return 2 // MEDIUM
  return 1 // LOW
}

// Process queue by priority
async function processQueuedLeads(payload = {}, context = {}) {
  const queuedLeads = await repository.listQueuedLeads({ 
    limit,
    orderBy: 'priority DESC, queued_at ASC' // High priority first, then FIFO
  })
  
  // ... rest of processing
}
```

### ✅ Improvement 6: Agent Availability Status

```javascript
// Add to users table
ALTER TABLE users ADD COLUMN availability_status VARCHAR(20) DEFAULT 'AVAILABLE';
-- Values: AVAILABLE, BUSY, ON_BREAK, OFFLINE

// Check availability before assignment
async function selectAssigneeForLead(lead, options) {
  let candidates = await repository.findActiveAssignableUsers(roleName)
  
  // Prefer AVAILABLE agents
  const available = candidates.filter(c => c.availabilityStatus === 'AVAILABLE')
  if (available.length) {
    candidates = available
  } else {
    // If no one available, use BUSY agents (but not ON_BREAK or OFFLINE)
    candidates = candidates.filter(c => c.availabilityStatus !== 'OFFLINE')
  }
  
  // ... rest of logic
}
```

---

## Implementation Priority

### Phase 1 (High Priority) - Immediate Improvements
1. ✅ Add workload-based scoring to round-robin
2. ✅ Implement fallback hierarchy for country/type matching
3. ✅ Add priority queue system

### Phase 2 (Medium Priority) - Performance Tracking
4. ✅ Add agent performance metrics (conversion rate, response time)
5. ✅ Implement manager assignment logic
6. ✅ Add agent availability status

### Phase 3 (Low Priority) - Advanced Features
7. ✅ Machine learning-based assignment prediction
8. ✅ Time-based routing (assign to agents in working hours)
9. ✅ Customer preference matching (language, communication style)

---

## Database Changes Required

```sql
-- 1. Add performance tracking columns to users
ALTER TABLE users ADD COLUMN performance_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN avg_response_minutes DECIMAL(10,2);
ALTER TABLE users ADD COLUMN conversion_rate DECIMAL(5,2);
ALTER TABLE users ADD COLUMN availability_status VARCHAR(20) DEFAULT 'AVAILABLE';

-- 2. Add priority to lead_queue
ALTER TABLE lead_queue ADD COLUMN priority INTEGER DEFAULT 1;
ALTER TABLE lead_queue ADD COLUMN queued_at TIMESTAMP DEFAULT NOW();

-- 3. Create index for faster queue processing
CREATE INDEX idx_lead_queue_priority ON lead_queue(priority DESC, queued_at ASC);

-- 4. Add team metrics to users (for managers)
ALTER TABLE users ADD COLUMN team_member_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN team_open_leads_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN team_sla_breach_rate DECIMAL(5,2) DEFAULT 0;
```

---

## Code Changes Required

### File: `leads.service.js`

**Replace `selectAssigneeForLead` function (lines 1050-1180) with:**

```javascript
async function selectAssigneeForLead(lead, options = {}) {
  const roleName = options.roleName?.toLowerCase() || 'agent'
  
  // Try fallback hierarchy
  for (const level of ['exact', 'country_type', 'type_only', 'both_type']) {
    const candidates = await findCandidatesByLevel(lead, roleName, level, options)
    if (!candidates.length) continue
    
    // Calculate scores and select best agent
    const openLoad = await repository.getOpenLeadLoadByUserIds(
      candidates.map(c => c.id)
    )
    
    const scored = candidates.map(agent => ({
      agent,
      score: calculateAgentScore(agent, lead, openLoad)
    }))
    
    scored.sort((a, b) => b.score - a.score)
    return scored[0].agent
  }
  
  return null // No suitable agent found
}

function calculateAgentScore(agent, lead, openLoad) {
  let score = 100
  
  // Workload penalty
  const agentLoad = openLoad[agent.id] || 0
  score -= Math.min(30, agentLoad * 2)
  
  // Expertise bonus
  if (agent.expertiseDestinations?.includes(lead.destinationId)) {
    score += 20
  }
  
  // Country match bonus
  if (agent.country === lead.leadCountry) {
    score += 15
  }
  
  // Performance bonus
  score += (agent.performanceScore || 0) * 0.25
  
  return score
}
```

---

## Testing Checklist

- [ ] Test with 0 available agents (should queue)
- [ ] Test with 1 agent (should assign directly)
- [ ] Test with multiple agents (should use scoring)
- [ ] Test high-value lead assignment (VIP, high budget)
- [ ] Test country mismatch fallback
- [ ] Test agent type mismatch fallback
- [ ] Test manager assignment for SLA breach
- [ ] Test priority queue processing
- [ ] Test workload balancing (assign to agent with fewer leads)
- [ ] Test destination expertise matching

---

## Monitoring & Metrics

Add these metrics to track distribution effectiveness:

```javascript
// Distribution metrics to track
{
  "total_assignments": 1000,
  "avg_assignment_time_ms": 150,
  "fallback_level_usage": {
    "exact_match": 650,      // 65%
    "country_type": 200,     // 20%
    "type_only": 100,        // 10%
    "both_type": 50          // 5%
  },
  "queue_rate": 0.05,        // 5% leads go to queue
  "avg_agent_load": 12.5,
  "load_std_deviation": 3.2, // Lower is better (more balanced)
  "high_value_assignment_success": 0.98
}
```
