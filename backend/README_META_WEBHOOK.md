# Meta Webhook Debugging System

## 🎯 Purpose
Comprehensive debugging and logging system to identify why Meta Lead Ads webhooks are not creating leads in your CRM system.

## 📁 Files Overview

### Documentation
- **`META_WEBHOOK_QUICK_START.md`** - Start here! Quick debugging steps
- **`META_WEBHOOK_DEBUG_GUIDE.md`** - Comprehensive debugging guide
- **`META_WEBHOOK_LOGGING.md`** - File logging system documentation
- **`META_WEBHOOK_DEBUG_SUMMARY.md`** - Technical implementation summary
- **`README_META_WEBHOOK.md`** - This file

### Code Files
- **`crm/modules/metaWebhook/webhookFileLogger.js`** - File logging system
- **`crm/modules/metaWebhook/metaWebhook.controller.js`** - Enhanced with logging
- **`crm/modules/metaWebhook/metaLead.service.js`** - Enhanced with logging
- **`crm/modules/metaWebhook/metaWebhook.routes.js`** - Enhanced with logging
- **`crm/modules/metaWebhook/index.js`** - Updated module initialization

### Test Script
- **`test-meta-webhook.js`** - Configuration validation script

## 🚀 Quick Start (5 Minutes)

### 1. Run Configuration Test
```bash
node test-meta-webhook.js
```

This will check if all environment variables are configured correctly.

### 2. Start Server
```bash
npm start
```

Watch for initialization logs showing your configured pages.

### 3. Test Verification
```bash
curl "http://localhost:3000/webhook/meta?hub.mode=subscribe&hub.verify_token=g2v_secret_2024&hub.challenge=test123"
```

Should return: `test123`

### 4. Submit Test Lead
Go to your Meta Lead Ad and submit a test lead.

### 5. Check Logs
```bash
# View today's log file
cat logs/meta-webhook-$(date +%Y-%m-%d).log

# Or on Windows
type logs\meta-webhook-2024-01-15.log
```

## 📊 What Gets Logged

### Console Output (Real-time)
```
========== META LEAD SERVICE INITIALIZED ==========
========== META WEBHOOK VERIFICATION ==========
========== META WEBHOOK RECEIVED ==========
========== SIGNATURE VALIDATION ==========
========== EXTRACTED LEAD EVENTS ==========
========== PAGE CONFIG RESOLUTION ==========
========== FETCHING META LEAD DATA ==========
========== BUILDING LEAD PAYLOAD ==========
========== CREATING LEAD IN CRM ==========
========== FINAL SUMMARY ==========
```

### File Logs (Persistent)
Location: `logs/meta-webhook-YYYY-MM-DD.log`

Format: Structured JSON with timestamps
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Lead Created Successfully",
  "data": {
    "leadgenId": "123456789",
    "leadId": 456
  }
}
```

## 🔍 Common Issues & Quick Fixes

### Issue 1: No Logs When Lead Submitted
**Problem**: Webhook not reaching server
**Quick Fix**:
```bash
# Check if server is running
curl http://localhost:3000/health

# Check webhook URL in Meta Business Suite
# Should be: https://your-domain.com/webhook/meta
```

### Issue 2: "Page Config Not Found"
**Problem**: Page ID mismatch
**Quick Fix**:
```bash
# Check your page IDs
grep META_INDIA_PAGE_ID .env
grep META_UAE_PAGE_ID .env

# Must match exactly with Meta page IDs
```

### Issue 3: "Signature Validation Failed"
**Problem**: Wrong app secret
**Quick Fix**:
```bash
# Temporarily disable for testing
echo "META_ALLOW_INSECURE_WEBHOOKS=true" >> .env

# Then get correct app secret from Meta App Dashboard
```

### Issue 4: "Meta Graph API request failed"
**Problem**: Invalid access token
**Quick Fix**:
1. Go to Meta Business Suite
2. Generate new page access token
3. Update `.env` file
4. Restart server

## 📖 Documentation Guide

### For Quick Debugging
👉 **Start with**: `META_WEBHOOK_QUICK_START.md`
- Immediate steps to debug
- Quick diagnosis
- Common fixes

### For Comprehensive Guide
👉 **Read**: `META_WEBHOOK_DEBUG_GUIDE.md`
- Detailed debugging steps
- Environment variable checklist
- Testing with cURL
- Database queries
- Meta Business Suite configuration

### For Log Analysis
👉 **Read**: `META_WEBHOOK_LOGGING.md`
- File logging system overview
- Log entry format
- Log analysis techniques
- Troubleshooting with logs

### For Technical Details
👉 **Read**: `META_WEBHOOK_DEBUG_SUMMARY.md`
- Implementation details
- Files modified
- Debugging capabilities
- Performance impact

## 🛠️ Tools & Commands

### View Logs
```bash
# Real-time console
npm start

# Real-time file logs
tail -f logs/meta-webhook-*.log

# View specific date
cat logs/meta-webhook-2024-01-15.log
```

### Search Logs
```bash
# Find errors
grep "ERROR" logs/meta-webhook-*.log

# Find specific lead
grep "123456789" logs/meta-webhook-*.log

# Find page config issues
grep "Page Config Not Found" logs/meta-webhook-*.log
```

### Database Queries
```sql
-- Check webhook events
SELECT * FROM meta_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Check leads
SELECT id, full_name, email, phone, source, meta_lead_id 
FROM leads 
WHERE source LIKE 'Meta%' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check event status distribution
SELECT status, COUNT(*) as count 
FROM meta_webhook_events 
GROUP BY status;
```

### Test Commands
```bash
# Test configuration
node test-meta-webhook.js

# Test verification
curl "http://localhost:3000/webhook/meta?hub.mode=subscribe&hub.verify_token=g2v_secret_2024&hub.challenge=test123"

# Test webhook POST
curl -X POST http://localhost:3000/webhook/meta \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"id":"1021995967663811","changes":[{"field":"leadgen","value":{"leadgen_id":"test123","page_id":"1021995967663811"}}]}]}'
```

## ✅ Success Checklist

- [ ] Configuration test passes (`node test-meta-webhook.js`)
- [ ] Server starts without errors
- [ ] Initialization shows 2 pages configured
- [ ] Webhook verification returns challenge
- [ ] Test lead shows console output
- [ ] Log file created in `logs/` directory
- [ ] No "ERROR" entries in logs
- [ ] `meta_webhook_events` table has entry
- [ ] `leads` table has new lead
- [ ] Lead has `meta_lead_id` populated

## 🎓 Learning Path

1. **Day 1**: Run configuration test, read Quick Start
2. **Day 2**: Test verification, submit test lead
3. **Day 3**: Analyze logs, understand flow
4. **Day 4**: Read comprehensive guide
5. **Day 5**: Master log analysis techniques

## 🔐 Security Notes

✅ Sensitive data is never logged in full
✅ Access tokens shown as `[CONFIGURED]`
✅ App secrets shown as `[CONFIGURED]`
✅ Verify tokens shown as `[PRESENT]`
✅ Only presence/absence is indicated

## 📞 Support

### Self-Service
1. Run `node test-meta-webhook.js`
2. Check console output
3. Review log files
4. Search documentation

### Need Help?
1. Share console output (remove sensitive data)
2. Share relevant log entries
3. Share database query results
4. Describe expected vs actual behavior

## 🎯 Expected Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Meta sends webhook                                   │
│    ↓                                                     │
│ 2. Server receives POST /webhook/meta                   │
│    ↓                                                     │
│ 3. Signature validated                                  │
│    ↓                                                     │
│ 4. Lead event extracted (leadgen_id)                    │
│    ↓                                                     │
│ 5. Page config resolved (India/UAE)                     │
│    ↓                                                     │
│ 6. Meta API called (fetch lead data)                    │
│    ↓                                                     │
│ 7. Lead payload built                                   │
│    ↓                                                     │
│ 8. Lead created in database                             │
│    ↓                                                     │
│ 9. Response sent to Meta (200 OK)                       │
│    ↓                                                     │
│ 10. Logs written to file                                │
└─────────────────────────────────────────────────────────┘
```

## 🚨 Emergency Checklist

If nothing works:

1. ✅ Run `node test-meta-webhook.js`
2. ✅ Check all environment variables
3. ✅ Restart server
4. ✅ Test verification endpoint
5. ✅ Enable insecure mode temporarily
6. ✅ Check database connection
7. ✅ Review Meta webhook settings
8. ✅ Check access token permissions
9. ✅ Verify page IDs match exactly
10. ✅ Read full debug guide

## 📈 Monitoring

### Daily
- Check log files for errors
- Monitor lead creation rate
- Review duplicate detection

### Weekly
- Archive old log files
- Review error patterns
- Update access tokens if needed

### Monthly
- Clean up old logs (keep 30 days)
- Review webhook performance
- Update documentation

## 🎉 Success Indicators

✅ Logs show "Lead Created Successfully"
✅ Database has new leads with `meta_lead_id`
✅ No errors in log files
✅ Webhook events marked as "PROCESSED"
✅ Meta shows webhook as active

## 📚 Additional Resources

- [Meta Lead Ads Documentation](https://developers.facebook.com/docs/marketing-api/guides/lead-ads)
- [Meta Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks)
- [Meta Access Tokens](https://developers.facebook.com/docs/facebook-login/access-tokens)

## 🔄 Version History

- **v1.0.0** (2024-01-15): Initial debugging system
  - File logging system
  - Console debugging
  - Comprehensive documentation
  - Configuration test script

---

**Made with ❤️ for debugging Meta webhooks**

For questions or issues, refer to the documentation files or check the logs!
