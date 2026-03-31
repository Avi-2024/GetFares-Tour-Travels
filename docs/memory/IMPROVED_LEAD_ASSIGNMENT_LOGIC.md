# Improved Lead Assignment Logic

## Current Implementation Analysis

The existing `selectAssigneeForLead` function in `leads.service.js` already implements:
- Country-based filtering
- Lead type (VISA/HOLIDAY/BOTH) filtering
- Caching by country and agent type
- Round-robin assignment per country
- Fallback to all countries if no match found

## Your Requirements

Based on your leads data:
```javascript
Lead 1: { leadType: "VISA", leadCountry: null, destinationName: "Dubai, UAE" }
Lead 2: { leadType: "HOLIDAY", leadCountry: null, destinationName: "Afghanistan" }
```

**Assignment Priority:**
1. **Country + Lead Type match** (both match) - HIGHEST PRIORITY
2. **Country match only** (if agent has country assigned, regardless of lead type)
3. **Lead Type match only** (if agent country is null)
4. **Round-robin fallback** (no specific match)

## Current Logic Issues

The current implementation filters strictly:
```javascript
// Current code (lines 1236-1254)
const scoped = candidates.filter((candidate) => {
  const agentCountry = normalizeCategory(candidate.country);
  const agentType = normalizeAgentType(candidate.agentType);

  // ISSUE: This rejects agents if country doesn't match
  if (leadCountry && (!agentCountry || agentCountry !== leadCountry)) {
    return false;
  }
  
  // ISSUE: This rejects agents if type doesn't match
  if (
    requiredLeadType &&
    (!agentType || (agentType !== requiredLeadType && agentType !== "BOTH"))
  ) {
    return false;
  }
  
  return true;
});
```

**Problem:** When `leadCountry` is `null`, the filter doesn't work as expected for your use case.

## Improved Assignment Logic

### Step 1: Categorize Agents by Match Quality

```javascript
function categorizeAgentsByMatchQuality(candidates, leadCountry, leadType) {
  const perfect = [];      // Country + Type match
  const countryOnly = [];  // Country match, type mismatch or null
  const typeOnly = [];     // Type match, country null or mismatch
  const fallback = [];     // No specific match

  for (const candidate of candidates) {
    const agentCountry = normalizeCategory(candidate.country);
    const agentType = normalizeAgentType(candidate.agentType);
    
    const countryMatch = leadCountry && agentCountry && agentCountry === leadCountry;
    const typeMatch = leadType && agentType && (agentType === leadType || agentType === "BOTH");
    
    // Priority 1: Both country and type match
    if (countryMatch && typeMatch) {
      perfect.push(candidate);
    }
    // Priority 2: Country matches (agent has country assigned)
    else if (countryMatch) {
      countryOnly.push(candidate);
    }
    // Priority 3: Type matches and agent has no country restriction
    else if (typeMatch && !agentCountry) {
      typeOnly.push(candidate);
    }
    // Priority 4: Fallback (no country restriction on agent)
    else if (!agentCountry) {
      fallback.push(candidate);
    }
  }

  return { perfect, countryOnly, typeOnly, fallback };
}
```

### Step 2: Select Pool Based on Priority

```javascript
function selectBestPool(categorized) {
  if (categorized.perfect.length > 0) {
    return { pool: categorized.perfect, tier: 'PERFECT' };
  }
  if (categorized.countryOnly.length > 0) {
    return { pool: categorized.countryOnly, tier: 'COUNTRY_ONLY' };
  }
  if (categorized.typeOnly.length > 0) {
    return { pool: categorized.typeOnly, tier: 'TYPE_ONLY' };
  }
  if (categorized.fallback.length > 0) {
    return { pool: categorized.fallback, tier: 'FALLBACK' };
  }
  return { pool: [], tier: 'NONE' };
}
```

## Implementation in `selectAssigneeForLead`

Replace the filtering logic (lines 1236-1268) with:

```javascript
// Cache miss - query database
if (!candidates) {
  candidates = await repository.findActiveAssignableUsers(roleName);
  
  // NEW: Categorize agents by match quality
  if (roleName === ASSIGNMENT_ROLES.AGENT) {
    const categorized = categorizeAgentsByMatchQuality(
      candidates,
      leadCountry,
      requiredLeadType
    );
    
    const { pool, tier } = selectBestPool(categorized);
    
    logger.debug(
      { 
        leadCountry, 
        leadType: requiredLeadType,
        tier,
        poolSize: pool.length,
        perfect: categorized.perfect.length,
        countryOnly: categorized.countryOnly.length,
        typeOnly: categorized.typeOnly.length,
        fallback: categorized.fallback.length
      },
      'Agent pool selected by match quality'
    );
    
    // Cache the selected pool
    if (pool.length && leadCountry) {
      agentCache.set(leadCountry, requiredLeadType, pool);
    }
    
    candidates = pool;
  }
}
```

## Example Scenarios

### Scenario 1: Lead with Country + Type
```javascript
Lead: { leadCountry: "india", leadType: "VISA" }

Agents:
A1: { country: "india", agentType: "VISA" }     // PERFECT ✅
A2: { country: "india", agentType: "HOLIDAY" }  // COUNTRY_ONLY
A3: { country: null, agentType: "VISA" }        // TYPE_ONLY
A4: { country: null, agentType: "BOTH" }        // FALLBACK

Selected Pool: [A1] (PERFECT tier)
```

### Scenario 2: Lead with Type Only (Your Case)
```javascript
Lead: { leadCountry: null, leadType: "VISA", destinationName: "Dubai, UAE" }

Agents:
A1: { country: "uae", agentType: "VISA" }      // No match (country set but lead has no country)
A2: { country: "uae", agentType: "HOLIDAY" }   // No match
A3: { country: null, agentType: "VISA" }       // TYPE_ONLY ✅
A4: { country: null, agentType: "BOTH" }       // TYPE_ONLY ✅
A5: { country: null, agentType: "HOLIDAY" }    // FALLBACK

Selected Pool: [A3, A4] (TYPE_ONLY tier)
```

### Scenario 3: Lead with Country Only
```javascript
Lead: { leadCountry: "india", leadType: null }

Agents:
A1: { country: "india", agentType: "VISA" }     // COUNTRY_ONLY ✅
A2: { country: "india", agentType: "HOLIDAY" }  // COUNTRY_ONLY ✅
A3: { country: null, agentType: "VISA" }        // FALLBACK
A4: { country: "uae", agentType: "VISA" }       // No match

Selected Pool: [A1, A2] (COUNTRY_ONLY tier)
```

### Scenario 4: No Country, No Type
```javascript
Lead: { leadCountry: null, leadType: null }

Agents:
A1: { country: "india", agentType: "VISA" }    // No match (agent has country restriction)
A2: { country: null, agentType: "VISA" }       // FALLBACK ✅
A3: { country: null, agentType: "HOLIDAY" }    // FALLBACK ✅
A4: { country: null, agentType: "BOTH" }       // FALLBACK ✅

Selected Pool: [A2, A3, A4] (FALLBACK tier)
```

## Benefits

1. **Flexible Matching**: Agents without country restrictions can handle any lead
2. **Priority-Based**: Best match always selected first
3. **Graceful Degradation**: Falls back to less specific matches
4. **Country-First**: If agent has country assigned, it must match (unless no match found)
5. **Type-Aware**: Lead type is considered when agent has no country restriction

## Cache Strategy

Update caching to include match tier:

```javascript
getCacheKey(country, agentType, tier) {
  const countryKey = country ? String(country).toLowerCase() : 'all';
  const typeKey = agentType ? String(agentType).toUpperCase() : 'all';
  const tierKey = tier || 'default';
  return `${countryKey}:${typeKey}:${tierKey}`;
}
```

## Round-Robin Per Tier

Maintain separate round-robin state for each tier:

```javascript
roundRobinState.getLastAssigned(leadCountry, requiredLeadType, tier);
roundRobinState.setLastAssigned(leadCountry, requiredLeadType, tier, agentId);
```

## Summary

**Current Logic:**
- Strict filtering: Country AND Type must match
- Fallback: Try without country filter

**Improved Logic:**
- Tiered matching: Perfect → Country → Type → Fallback
- Flexible: Agents without country can handle any lead
- Priority: Best match always wins
- Graceful: Falls back to less specific matches

This ensures your leads are assigned to the most appropriate agent based on available information.
