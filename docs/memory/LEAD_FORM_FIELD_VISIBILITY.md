# Create Lead Form - Field Visibility by Lead Type

## ✅ Changes Applied

Removed **Visa Required** and **Purpose of Travel** fields from **Visa leads** form.

---

## 📋 Field Visibility Matrix

### **Tourist (HOLIDAY) Leads - Shows ALL Fields**

| Field | Visible | Required |
|-------|---------|----------|
| First Name | ✅ | ✅ |
| Last Name | ✅ | ✅ |
| Email | ✅ | ✅ |
| Phone | ✅ | ✅ |
| Lead Country | ✅ | ✅ |
| Client Currency | ✅ | ✅ |
| Address/Location | ✅ | ❌ |
| Destination | ✅ | ✅ |
| Travel Date | ✅ | ✅ |
| Adults | ✅ | ✅ |
| Children | ✅ | ✅ |
| Children Ages | ✅ | ✅ (if children > 0) |
| Budget | ✅ | ❌ |
| **Visa Required** | ✅ | ❌ |
| **Preferred Hotel Category** | ✅ | ❌ |
| **Purpose of Travel** | ✅ | ❌ |
| **Lead Source** | ✅ | ❌ |
| **Campaign** | ✅ | ❌ |
| Notes | ✅ | ❌ |

---

### **Visa Leads - Simplified Form**

| Field | Visible | Required |
|-------|---------|----------|
| First Name | ✅ | ✅ |
| Last Name | ✅ | ✅ |
| Email | ✅ | ✅ |
| Phone | ✅ | ✅ |
| Lead Country | ✅ | ✅ |
| Client Currency | ✅ | ✅ |
| Address/Location | ✅ | ❌ |
| Destination | ✅ | ✅ |
| Travel Date | ✅ | ✅ |
| Adults | ✅ | ✅ |
| Children | ✅ | ✅ |
| Children Ages | ✅ | ✅ (if children > 0) |
| Budget | ✅ | ❌ |
| **Visa Required** | ❌ Hidden | N/A |
| **Preferred Hotel Category** | ❌ Hidden | N/A |
| **Purpose of Travel** | ❌ Hidden | N/A |
| **Lead Source** | ❌ Hidden | N/A |
| **Campaign** | ❌ Hidden | N/A |
| Notes | ✅ | ❌ |

---

## 🎯 Hidden Fields Summary

### **For VISA Leads (Hidden):**
1. ❌ Lead Source
2. ❌ Preferred Hotel Category
3. ❌ Campaign
4. ❌ **Visa Required** ← Newly hidden
5. ❌ **Purpose of Travel** ← Newly hidden

### **For HOLIDAY Leads (All Visible):**
✅ All fields are visible

---

## 📊 Visual Comparison

### **Before (Visa Lead Form):**
```
┌─────────────────────────────────┐
│ First Name *                    │
│ Last Name *                     │
│ Email *                         │
│ Phone *                         │
│ Lead Country *                  │
│ Client Currency *               │
│ Address/Location                │
│ Destination *                   │
│ Travel Date *                   │
│ Adults * / Children *           │
│ Budget                          │
│ Visa Required                   │ ← Was showing
│ Purpose of Travel               │ ← Was showing
│ Notes                           │
└─────────────────────────────────┘
```

### **After (Visa Lead Form):**
```
┌─────────────────────────────────┐
│ First Name *                    │
│ Last Name *                     │
│ Email *                         │
│ Phone *                         │
│ Lead Country *                  │
│ Client Currency *               │
│ Address/Location                │
│ Destination *                   │
│ Travel Date *                   │
│ Adults * / Children *           │
│ Budget                          │
│ Notes                           │ ← Cleaner, simpler form
└─────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **Code Changes:**

```typescript
// Hidden fields configuration
const HIDDEN_FIELDS_BY_TYPE: Record<NonNullable<LeadType>, string[]> = {
  VISA: [
    'leadSource',
    'preferredHotelCategory',
    'campaignId',
    'visaRequired',      // ← Added
    'travelPurpose'      // ← Added
  ],
  HOLIDAY: []
}

// Fields wrapped with visibility check
{isFieldVisible('visaRequired') && (
  <div>
    <label className='field-label'>Visa Required</label>
    <SearchableDropdown ... />
  </div>
)}

{isFieldVisible('travelPurpose') && (
  <div>
    <label className='field-label'>Purpose of Travel</label>
    <SearchableDropdown ... />
  </div>
)}
```

---

## ✅ Benefits

1. **Simpler Visa Lead Form** - Only shows relevant fields
2. **Faster Data Entry** - Fewer fields to fill
3. **Better UX** - Less confusion for visa-specific leads
4. **Cleaner Interface** - Removes unnecessary fields

---

## 🎬 User Experience

### **Creating a Visa Lead:**

1. Click "Create New Lead"
2. Select **"Visa Lead"** option
3. Form shows **only essential fields**:
   - Customer details (name, email, phone)
   - Travel details (country, destination, date)
   - Traveler count (adults, children)
   - Optional: Budget, Notes
4. **No longer shows:**
   - ❌ Visa Required
   - ❌ Purpose of Travel
   - ❌ Preferred Hotel Category
   - ❌ Lead Source
   - ❌ Campaign

### **Creating a Tourist Lead:**

1. Click "Create New Lead"
2. Select **"Tourist Lead"** option
3. Form shows **all fields** including:
   - ✅ Visa Required
   - ✅ Purpose of Travel
   - ✅ Preferred Hotel Category
   - ✅ Lead Source
   - ✅ Campaign

---

## 📝 Summary

**Visa leads** now have a **streamlined form** with only the most relevant fields, making it faster and easier to capture visa-specific lead information without unnecessary fields like "Visa Required" (which is redundant for visa leads) and "Purpose of Travel".

The form automatically adapts based on the lead type selected at the beginning! 🎉
