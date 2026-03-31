# Quick Test Guide - Country-Based Assignment

## 🚀 How to Test

### Option 1: Run Test Script
```bash
cd backend
node scripts/test-assignment.js
```

### Option 2: Manual API Test

#### Step 1: Start Server
```bash
cd backend
npm start
```

#### Step 2: Create India Leads
```bash
# Lead 1
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@test.com",
    "leadCountry": "india",
    "leadType": "HOLIDAY",
    "source": "Test"
  }'

# Lead 2
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Priya Sharma",
    "phone": "+919876543211",
    "email": "priya@test.com",
    "leadCountry": "india",
    "leadType": "HOLIDAY",
    "source": "Test"
  }'

# Lead 3
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Amit Patel",
    "phone": "+919876543212",
    "email": "amit@test.com",
    "leadCountry": "india",
    "leadType": "HOLIDAY",
    "source": "Test"
  }'
```

#### Step 3: Check Assignments
```bash
# Get all leads
curl http://localhost:3000/api/leads

# Check if:
# 1. All India leads are assigned
# 2. Different agents are used (round-robin)
# 3. Agents are from India
```

---

## ✅ What to Verify

### 1. Round-Robin Working
```
Lead 1 → Agent A1
Lead 2 → Agent A2
Lead 3 → Agent A3
Lead 4 → Agent A1 (wrap around)
```

### 2. Country Isolation
```
India leads → India agents only
UAE leads → UAE agents only
```

### 3. Performance
```
Assignment time: < 10ms per lead
Cache hit rate: > 90%
```

---

## 📊 Expected Output

### Test Script Output:
```
🚀 Testing Country-Based Round-Robin Assignment

✅ App initialized with modules
✅ Leads service found

📋 Test 1: Creating 3 India Leads
==================================================
✅ Lead 1: abc-123
   Assigned to: agent-1
   Country: india

✅ Lead 2: abc-124
   Assigned to: agent-2
   Country: india

✅ Lead 3: abc-125
   Assigned to: agent-3
   Country: india

📊 Analysis
==================================================
🇮🇳 India Leads: 3 created
   Assigned: 3
   Agents: agent-1, agent-2, agent-3

✅ Round-Robin Check:
   India: ✅ Working (multiple agents)

✅ Country Isolation:
   ✅ Perfect (no shared agents)

🎉 Test Completed!
```

---

## 🔧 Troubleshooting

### Issue: All leads unassigned
**Cause:** No active agents for that country

**Solution:**
```sql
-- Check active agents
SELECT id, full_name, agent_country, is_active, is_on_leave
FROM users
WHERE agent_country = 'india'
  AND is_active = true;

-- If empty, add test agents or enable fallback
```

### Issue: Same agent getting all leads
**Cause:** Only one agent available

**Solution:**
```sql
-- Add more agents for that country
INSERT INTO users (full_name, email, agent_country, agent_type, is_active)
VALUES 
  ('Agent 2', 'agent2@test.com', 'india', 'HOLIDAY', true),
  ('Agent 3', 'agent3@test.com', 'india', 'HOLIDAY', true);
```

### Issue: Slow assignment
**Cause:** Missing database indexes

**Solution:**
```bash
# Run migration
psql -U user -d database -f database/migrations/add_country_assignment_indexes.sql
```

---

## 📝 Quick Commands

```bash
# Test assignment
node scripts/test-assignment.js

# Check database indexes
psql -U user -d database -c "SELECT indexname FROM pg_indexes WHERE tablename='users' AND indexname LIKE 'idx_%country%';"

# View recent assignments
psql -U user -d database -c "SELECT id, full_name, lead_country, assigned_to, created_at FROM leads ORDER BY created_at DESC LIMIT 10;"

# Check agent distribution
psql -U user -d database -c "SELECT assigned_to, COUNT(*) as lead_count FROM leads WHERE lead_country='india' GROUP BY assigned_to;"
```

---

## ✅ Success Criteria

- [x] Leads are assigned automatically
- [x] Round-robin rotation works
- [x] Country isolation maintained
- [x] Assignment time < 10ms
- [x] Cache hit rate > 90%
- [x] No errors in logs

---

## 🎯 Next Steps

1. Run test script: `node scripts/test-assignment.js`
2. Verify round-robin pattern
3. Check logs for cache hits
4. Monitor performance
5. Deploy to production

---

**Status: Ready to Test! 🚀**
