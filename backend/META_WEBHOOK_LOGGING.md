# Meta Webhook File Logging System

## Overview
A comprehensive file-based logging system for Meta Lead Ads webhooks that writes detailed logs to daily log files.

## Log File Location
Logs are automatically written to: `backend/logs/meta-webhook-YYYY-MM-DD.log`

Example: `backend/logs/meta-webhook-2024-01-15.log`

## Features

### 1. **Daily Log Rotation**
- New log file created each day automatically
- Files named with date: `meta-webhook-2024-01-15.log`
- Easy to archive and review historical logs

### 2. **Structured JSON Logging**
- Each log entry is formatted as JSON
- Easy to parse and analyze programmatically
- Includes timestamp, level, message, and data

### 3. **Comprehensive Event Tracking**
Logs every step of webhook processing:
- Service initialization
- Webhook verification requests
- Webhook POST requests received
- Signature validation
- Lead event extraction
- Page config resolution
- Meta API calls
- Lead payload building
- Lead creation/duplication
- Processing summary
- All errors

## Log Entry Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Webhook POST Request Received",
  "data": {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "headers": {
      "contentType": "application/json",
      "signature": "[PRESENT]",
      "userAgent": "facebookplatform/1.0"
    },
    "body": { ... },
    "rawBodyLength": 1234
  }
}
```

## Log Levels

- **INFO**: Normal operations (verification, lead processing, success)
- **WARN**: Warnings (unexpected data, duplicates)
- **ERROR**: Errors (validation failures, API errors, database errors)
- **DEBUG**: Detailed debugging information

## What Gets Logged

### Service Initialization
```json
{
  "level": "INFO",
  "message": "Meta Lead Service Initialized",
  "data": {
    "verifyTokenConfigured": "YES",
    "appSecretConfigured": "YES",
    "allowInsecureWebhooks": false,
    "pagesCount": 2,
    "pages": [
      {
        "pageId": "1021995967663811",
        "pageName": "India Page",
        "countryName": "India",
        "accessTokenConfigured": "YES"
      }
    ]
  }
}
```

### Webhook Verification
```json
{
  "level": "INFO",
  "message": "Webhook Verification Request",
  "data": {
    "mode": "subscribe",
    "verifyToken": "[PRESENT]",
    "challenge": "[PRESENT]"
  }
}
```

### Webhook Received
```json
{
  "level": "INFO",
  "message": "Webhook POST Request Received",
  "data": {
    "headers": {
      "contentType": "application/json",
      "signature": "[PRESENT]"
    },
    "body": {
      "object": "page",
      "entry": [...]
    },
    "rawBodyLength": 1234
  }
}
```

### Signature Validation
```json
{
  "level": "INFO",
  "message": "Signature Validation Passed",
  "data": {
    "secretsCount": 2
  }
}
```

### Lead Events Extracted
```json
{
  "level": "INFO",
  "message": "Lead Events Extracted",
  "data": {
    "count": 1,
    "events": [
      {
        "leadgenId": "123456789",
        "pageId": "1021995967663811",
        "formId": "987654321",
        "campaignId": "333333"
      }
    ]
  }
}
```

### Page Config Resolution
```json
{
  "level": "INFO",
  "message": "Page Config Found",
  "data": {
    "pageId": "1021995967663811",
    "pageName": "India Page",
    "countryName": "India",
    "sourceLabel": "Meta India Page"
  }
}
```

### Meta Lead Fetched
```json
{
  "level": "INFO",
  "message": "Meta Lead Data Fetched",
  "data": {
    "leadgenId": "123456789",
    "createdTime": "2024-01-15T10:30:00+0000",
    "fieldCount": 3,
    "fields": [
      { "name": "full_name", "hasValue": true },
      { "name": "email", "hasValue": true },
      { "name": "phone_number", "hasValue": true }
    ],
    "campaignId": "333333"
  }
}
```

### Lead Payload Built
```json
{
  "level": "INFO",
  "message": "Lead Payload Built",
  "data": {
    "leadgenId": "123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "source": "Meta India Page",
    "leadCountry": "India",
    "campaignId": 123,
    "metaLeadId": "123456789"
  }
}
```

### Lead Created
```json
{
  "level": "INFO",
  "message": "Lead Created Successfully",
  "data": {
    "leadgenId": "123456789",
    "leadId": 456
  }
}
```

### Duplicate Lead
```json
{
  "level": "WARN",
  "message": "Duplicate Lead Detected",
  "data": {
    "leadgenId": "123456789",
    "leadId": 456
  }
}
```

### Processing Summary
```json
{
  "level": "INFO",
  "message": "Webhook Processing Complete",
  "data": {
    "processed": 1,
    "duplicates": 0,
    "skipped": 0,
    "totalLeads": 1
  }
}
```

### Errors
```json
{
  "level": "ERROR",
  "message": "Webhook Processing Error",
  "data": {
    "context": "lead_event_123456789",
    "errorMessage": "Failed to fetch lead from Meta API",
    "errorCode": "META_GRAPH_ERROR",
    "errorStack": "Error: ...\n    at ..."
  }
}
```

## Viewing Logs

### View Today's Logs
```bash
# Windows
type logs\meta-webhook-2024-01-15.log

# Unix/Linux/Mac
cat logs/meta-webhook-2024-01-15.log
```

### Tail Logs in Real-Time
```bash
# Windows PowerShell
Get-Content logs\meta-webhook-2024-01-15.log -Wait -Tail 50

# Unix/Linux/Mac
tail -f logs/meta-webhook-2024-01-15.log
```

### Search Logs
```bash
# Find all errors
grep "ERROR" logs/meta-webhook-2024-01-15.log

# Find specific leadgen ID
grep "123456789" logs/meta-webhook-2024-01-15.log

# Find page config issues
grep "Page Config Not Found" logs/meta-webhook-2024-01-15.log
```

### Parse JSON Logs
```bash
# Using jq (install: https://stedolan.github.io/jq/)
cat logs/meta-webhook-2024-01-15.log | grep "^{" | jq '.message, .data'
```

## Log Analysis

### Count Events by Type
```bash
grep '"message"' logs/meta-webhook-2024-01-15.log | sort | uniq -c
```

### Find All Errors
```bash
grep '"level": "ERROR"' logs/meta-webhook-2024-01-15.log
```

### Extract Lead IDs
```bash
grep '"leadgenId"' logs/meta-webhook-2024-01-15.log | grep -o '"leadgenId": "[^"]*"'
```

## Log Retention

### Manual Cleanup
```bash
# Delete logs older than 30 days (Unix/Linux/Mac)
find logs/ -name "meta-webhook-*.log" -mtime +30 -delete

# Windows PowerShell
Get-ChildItem logs\meta-webhook-*.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

### Automated Cleanup Script
Create a scheduled task/cron job to run cleanup script:

```javascript
// cleanup-old-logs.js
import fs from 'fs';
import path from 'path';

const logsDir = 'logs';
const daysToKeep = 30;
const now = Date.now();
const cutoff = now - (daysToKeep * 24 * 60 * 60 * 1000);

fs.readdirSync(logsDir)
  .filter(file => file.startsWith('meta-webhook-') && file.endsWith('.log'))
  .forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old log: ${file}`);
    }
  });
```

## Troubleshooting with Logs

### Issue: No Logs Being Written
1. Check if `logs/` directory exists
2. Check file permissions
3. Check disk space
4. Look for console errors about file writing

### Issue: Logs Too Large
1. Implement log rotation (daily files help with this)
2. Set up automated cleanup
3. Consider log compression for old files

### Issue: Can't Find Specific Event
1. Check the date - logs are in daily files
2. Use grep/search to find across multiple files
3. Check timestamp format matches your timezone

## Integration with Monitoring

### Send Errors to Monitoring Service
Modify `webhookFileLogger.js` to also send errors to your monitoring service:

```javascript
error(message, data = null) {
  this.write("error", message, data);
  
  // Send to monitoring service
  if (process.env.MONITORING_WEBHOOK_URL) {
    fetch(process.env.MONITORING_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'error', message, data })
    }).catch(console.error);
  }
}
```

## Best Practices

1. **Review logs daily** during initial setup
2. **Set up alerts** for ERROR level logs
3. **Archive old logs** to save disk space
4. **Monitor log file sizes** to prevent disk issues
5. **Use structured logging** for easy parsing
6. **Include context** in all log entries
7. **Don't log sensitive data** (passwords, tokens, etc.)

## Example: Debugging a Failed Webhook

1. **Find the webhook request**:
   ```bash
   grep "Webhook POST Request Received" logs/meta-webhook-2024-01-15.log
   ```

2. **Check signature validation**:
   ```bash
   grep "Signature Validation" logs/meta-webhook-2024-01-15.log
   ```

3. **Find lead events**:
   ```bash
   grep "Lead Events Extracted" logs/meta-webhook-2024-01-15.log
   ```

4. **Check page config**:
   ```bash
   grep "Page Config" logs/meta-webhook-2024-01-15.log
   ```

5. **Look for errors**:
   ```bash
   grep "ERROR" logs/meta-webhook-2024-01-15.log
   ```

6. **Check final result**:
   ```bash
   grep "Webhook Processing Complete" logs/meta-webhook-2024-01-15.log
   ```

## Support

If you need help analyzing logs:
1. Share the relevant log entries (remove sensitive data)
2. Include the timestamp of the issue
3. Describe what you expected vs what happened
4. Check both console output and log files
