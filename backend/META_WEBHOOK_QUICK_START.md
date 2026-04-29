# Meta Webhook Debugging - Quick Start

## 🚀 Immediate Steps to Debug

### Step 1: Restart Your Server
```bash
cd backend
npm start
```

### Step 2: Watch for Initialization Logs
You should see:
```
========== META LEAD SERVICE INITIALIZED ==========
Verify token configured: YES
App secret configured: YES
Allow insecure webhooks: false
Environment pages count: 2

Page 1:
  Page ID: 1021995967663811
  Page Name: India Page
  Country: India (IN)
  ...

Page 2:
  Page ID: 958886697315918
  Page Name: UAE Page
  Country: UAE (AE)
  ...
```

**❌ If you see `Environment pages count: 0`**:
- Your `.env` file is not configured correctly
- Check `META_INDIA_PAGE_ID` and `META_UAE_PAGE_ID` exist
- Restart server after fixing

### Step 3: Test Webhook Verification
```bash
# Test with India verify token
curl "http://localhost:3000/webhook/meta?hub.mode=subscribe&hub.verify_token=g2v_secret_2024&hub.challenge=test123"
```

**✅ Expected Response**: `test123`

**❌ If you get an error**:
- Check `META_INDIA_VERIFY_TOKEN` in `.env`
- Verify it matches Meta Business Suite webhook settings

### Step 4: Check Log Files
```bash
# Windows
dir logs

# Unix/Linux/Mac
ls -la logs/
```

You should see: `meta-webhook-2024-XX-XX.log`

**View the log**:
```bash
# Windows
type logs\meta-webhook-2024-01-15.log

# Unix/Linux/Mac
cat logs/meta-webhook-2024-01-15.log
```

### Step 5: Submit a Test Lead
1. Go to your Meta Lead Ad
2. Submit a test lead with fake data
3. Watch your console output in real-time

### Step 6: Check What Happened

#### A. Check Console Output
Look for these sections in order:
```
========== META WEBHOOK RECEIVED ==========
========== SIGNATURE VALIDATION ==========
========== EXTRACTED LEAD EVENTS ==========
========== PAGE CONFIG RESOLUTION ==========
========== FETCHING META LEAD DATA ==========
========== BUILDING LEAD PAYLOAD ==========
========== CREATING LEAD IN CRM ==========
========== FINAL SUMMARY ==========
```

#### B. Check Log File
```bash
# View last 100 lines
tail -100 logs/meta-webhook-2024-01-15.log

# Or on Windows
Get-Content logs\meta-webhook-2024-01-15.log -Tail 100
```

#### C. Check Database
```sql
-- Check if webhook event was recorded
SELECT * FROM meta_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if lead was created
SELECT id, full_name, email, phone, source, meta_lead_id, created_at 
FROM leads 
WHERE source LIKE 'Meta%' 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🔍 Quick Diagnosis

### Problem: No Console Output When Lead Submitted
**Cause**: Webhook not reaching your server
**Fix**:
1. Check webhook URL in Meta Business Suite
2. Verify server is running and accessible
3. Check firewall/network settings
4. Use ngrok for local testing: `ngrok http 3000`

### Problem: "Page Config Not Found"
**Cause**: Page ID mismatch
**Fix**:
```bash
# Check your .env file
grep META_INDIA_PAGE_ID .env
grep META_UAE_PAGE_ID .env

# Compare with Meta Business Suite page ID
# They must match EXACTLY
```

### Problem: "Signature Validation Failed"
**Cause**: Wrong app secret
**Fix**:
```bash
# Check your .env file
grep META_INDIA_APP_SECRET .env
grep META_UAE_APP_SECRET .env

# Get correct secret from Meta App Dashboard
# Or temporarily disable validation:
META_ALLOW_INSECURE_WEBHOOKS=true
```

### Problem: "Lead events count: 0"
**Cause**: Webhook payload doesn't contain leadgen data
**Fix**:
1. Check Meta webhook subscription includes "leadgen"
2. Verify webhook is subscribed to correct page
3. Check payload in logs to see what was sent

### Problem: "Meta Graph API request failed"
**Cause**: Invalid or expired access token
**Fix**:
```bash
# Check your .env file
grep META_INDIA_ACCESS_TOKEN .env
grep META_UAE_ACCESS_TOKEN .env

# Generate new token in Meta Business Suite
# Token needs "leads_retrieval" permission
```

### Problem: Lead Created but Shows as Duplicate
**Cause**: Lead already exists in database
**Fix**:
- This is normal behavior
- Check `meta_webhook_events` table for status
- Status will be "DUPLICATE_META_LEAD" or "DUPLICATE_CONTACT"

## 📊 Quick Log Analysis

### Find All Errors Today
```bash
grep "ERROR" logs/meta-webhook-$(date +%Y-%m-%d).log
```

### Find Specific Lead
```bash
grep "123456789" logs/meta-webhook-*.log
```

### Count Successful Leads Today
```bash
grep "Lead Created Successfully" logs/meta-webhook-$(date +%Y-%m-%d).log | wc -l
```

### Find Page Config Issues
```bash
grep "Page Config Not Found" logs/meta-webhook-*.log
```

## 🛠️ Quick Fixes

### Fix 1: Regenerate Access Token
1. Go to Meta Business Suite
2. Navigate to your app
3. Go to Tools → Access Token Tool
4. Generate new page access token
5. Update `.env` file
6. Restart server

### Fix 2: Update Verify Token
1. Choose a secure random string
2. Update in `.env`:
   ```env
   META_INDIA_VERIFY_TOKEN=your_new_token_here
   META_UAE_VERIFY_TOKEN=your_new_token_here
   ```
3. Update in Meta Business Suite webhook settings
4. Restart server
5. Re-verify webhook

### Fix 3: Check Database Connection
```bash
# Test database connection
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}).then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

## 📞 Need More Help?

1. **Read Full Guide**: `META_WEBHOOK_DEBUG_GUIDE.md`
2. **Check Logging Docs**: `META_WEBHOOK_LOGGING.md`
3. **Review Summary**: `META_WEBHOOK_DEBUG_SUMMARY.md`

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Initialization shows 2 pages configured
- [ ] Webhook verification returns challenge
- [ ] Test lead submission shows console output
- [ ] Log file is created in `logs/` directory
- [ ] No "ERROR" entries in logs
- [ ] `meta_webhook_events` table has new entry
- [ ] `leads` table has new lead
- [ ] Lead has `meta_lead_id` populated

## 🎯 Expected Flow

```
1. Meta sends webhook → Your server receives it
2. Signature validated → ✅ Pass
3. Lead event extracted → leadgen_id found
4. Page config resolved → India or UAE page found
5. Meta API called → Lead data fetched
6. Lead payload built → All fields mapped
7. Lead created in DB → New lead or duplicate detected
8. Response sent to Meta → 200 OK
```

If any step fails, check the logs for that specific step!

## 🔥 Pro Tips

1. **Keep logs open**: `tail -f logs/meta-webhook-*.log`
2. **Test locally first**: Use ngrok for local testing
3. **Check Meta test tool**: Meta has a webhook test button
4. **Monitor database**: Keep a SQL client open
5. **Use structured logs**: Grep for specific events
6. **Archive old logs**: Keep last 30 days only

## 🚨 Emergency Debugging

If nothing works:

1. **Enable insecure mode** (temporarily):
   ```env
   META_ALLOW_INSECURE_WEBHOOKS=true
   ```

2. **Check raw webhook payload**:
   - Look in console for "Body:" output
   - Copy entire payload
   - Validate JSON structure

3. **Test with cURL**:
   ```bash
   curl -X POST http://localhost:3000/webhook/meta \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[{"id":"1021995967663811","changes":[{"field":"leadgen","value":{"leadgen_id":"test123","page_id":"1021995967663811"}}]}]}'
   ```

4. **Check all environment variables**:
   ```bash
   env | grep META
   ```

5. **Restart everything**:
   - Stop server
   - Clear logs
   - Restart server
   - Test again

Good luck! 🚀
