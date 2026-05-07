# Follow-up Compliance & Notes Behavior Changes

## Summary
Separated **Schedule Follow-up** (notification-only) from **Workflow Actions** (compliance-tracked) to provide better control over lead management.

---

## Changes Implemented

### 1. Follow-up Compliance Tracking
**Previous Behavior:**
- Follow-up compliance updated whenever a follow-up was scheduled
- Both "Schedule Follow-up" and "Workflow Actions" affected compliance counters

**New Behavior:**
- Follow-up compliance **ONLY** updates when **Workflow Actions (Status Transition)** changes
- "Schedule Follow-up" does NOT affect compliance counters
- Compliance counters (Calls, WhatsApp, Final Reminder) only increment on status changes

**Technical Implementation:**
- Added `is_schedule_only` flag to `followups` table
- Schedule Follow-up creates entries with `is_schedule_only = TRUE`
- Workflow Actions create entries with `is_schedule_only = FALSE`
- Compliance stats calculation filters out `is_schedule_only = TRUE` entries

---

### 2. Schedule Follow-up Notes
**Previous Behavior:**
- Schedule Follow-up notes appeared in Follow-up History
- Notes were visible to all users viewing the lead

**New Behavior:**
- Schedule Follow-up notes **DO NOT** appear in Follow-up History
- Notes are **ONLY** used for agent notifications
- Call reminders notify the assigned agent about 2 minutes before the scheduled time
- If the early reminder is missed, the due-time notification still includes the note

**Use Case:**
```
Agent schedules a call for tomorrow at 10 AM with note:
"Customer wants pricing for Bali package with 5-star hotels"

Result:
- Agent receives a reminder notification shortly before the scheduled time with the note
- Note does NOT appear in Follow-up History
- Other team members don't see this internal reminder
```

---

### 3. Workflow Actions Notes
**Previous Behavior:**
- Notes appeared in Follow-up History without line breaks
- Multi-line notes were displayed as single line

**New Behavior:**
- Workflow Actions notes **APPEAR** in Follow-up History
- Line breaks are **PRESERVED** in the display
- Multi-line notes maintain formatting
- Workflow Actions create compliance-tracked follow-up rows in `followups`

**Use Case:**
```
Manager updates status to "FOLLOW_UP" with note:
"Customer feedback:
- Interested in Maldives
- Budget: $5000
- Travel date: June 2026"

Result:
- Note appears in Follow-up History with line breaks preserved
- All team members can see the structured information
- Formatting makes it easy to read
```

---

## Database Changes

### Migration: `003_followups_schedule_only.sql`
```sql
ALTER TABLE followups 
ADD COLUMN IF NOT EXISTS is_schedule_only BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_followups_is_schedule_only 
ON followups(is_schedule_only);
```

---

## Backend Changes

### 1. Service Layer (`leads.service.js`)

#### `createFollowup()` Method
- No longer updates `followup_attempts`, `status`, or `sub_status`
- Only updates `next_followup_date`
- Sets `isScheduleOnly: true` flag
- Does NOT create activity log entry

#### `update()` Method
- When workflow status changes, creates a compliance-tracked follow-up entry
- Uses the latest open schedule reminder type when available
- Updates `followup_attempts` and respects explicit `sub_status`
- Creates activity log entry with notes

### 2. Repository Layer (`leads.repository.js`)

#### `createFollowup()` Method
- Accepts `isScheduleOnly` parameter
- Stores flag in database

#### `getFollowupComplianceStats()` Method
- Filters out entries where `isScheduleOnly = TRUE`
- Only counts compliance-tracked followups

#### `toFollowupDomain()` Method
- Maps `is_schedule_only` column to `isScheduleOnly` property

---

## Frontend Changes

### `LeadDetails.tsx`

#### Follow-up History Display
```tsx
// Filter out schedule-only followups
followups.filter(item => !item.isScheduleOnly)

// Preserve line breaks in notes
<p className='whitespace-pre-wrap'>
  {item.notes}
</p>
```

#### Counter Display
- Shows only compliance-tracked followups count
- Excludes schedule-only entries from history

---

## User Experience

### For Agents
1. **Schedule Follow-up Section:**
   - Use for personal reminders and notifications
   - Notes are private (notification-only)
   - Does NOT affect compliance counters
   - Does NOT appear in history

2. **Workflow Actions Section:**
   - Use for status updates and team communication
   - Notes appear in Follow-up History
   - Updates compliance counters
   - Visible to entire team

### For Managers
- Follow-up History shows only compliance-tracked actions
- Can see team's workflow progress clearly
- Schedule-only reminders don't clutter history
- Line breaks in notes improve readability

---

## API Behavior

### POST `/api/leads/:id/followups` (Schedule Follow-up)
**Request:**
```json
{
  "followupType": "CALL",
  "followupDate": "2026-04-05T10:00:00Z",
  "notes": "Customer wants Bali pricing"
}
```

**Result:**
- Creates followup with `is_schedule_only = TRUE`
- Updates `next_followup_date` only
- Does NOT update compliance counters
- Does NOT create activity log

### PATCH `/api/leads/:id` (Workflow Actions)
**Request:**
```json
{
  "status": "FOLLOW_UP",
  "notes": "Customer feedback:\n- Interested in Maldives\n- Budget: $5000"
}
```

**Result:**
- Updates status to "FOLLOW_UP"
- Increments `followup_attempts`
- Updates `sub_status` to "FOLLOW_UP_1", "FOLLOW_UP_2", etc.
- Creates activity log with notes
- Notes appear in Follow-up History with line breaks preserved

---

## Testing Checklist

- [ ] Schedule a follow-up with notes → Verify it does NOT appear in history
- [ ] Update status with notes → Verify it DOES appear in history
- [ ] Add multi-line notes in Workflow Actions → Verify line breaks are preserved
- [ ] Check compliance counters after scheduling follow-up → Should NOT change
- [ ] Check compliance counters after status update → Should increment
- [ ] Verify notifications include schedule follow-up notes
- [ ] Verify Follow-up History count excludes schedule-only entries

---

## Migration Steps

1. **Run Database Migration:**
   ```bash
   npm run db:migrate
   ```

2. **Deploy Backend:**
   - Updated service layer
   - Updated repository layer
   - New compliance calculation logic

3. **Deploy Frontend:**
   - Updated LeadDetails component
   - New filtering logic
   - Line break preservation

4. **Verify:**
   - Test both Schedule Follow-up and Workflow Actions
   - Check Follow-up History display
   - Verify compliance counters

---

## Rollback Plan

If issues occur:

1. **Database:** Column is nullable and has default value, safe to keep
2. **Backend:** Revert service and repository changes
3. **Frontend:** Revert LeadDetails component changes

No data loss will occur as existing followups have `is_schedule_only = FALSE` by default.
