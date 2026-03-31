# 📖 QUOTATION EDIT FEATURE - QUICK REFERENCE

## 🎯 WHAT WAS ADDED?

**Edit & Update functionality** for quotations in the Quotations List Page.

---

## 📍 WHERE TO FIND IT?

**Page**: Quotations List (`/quotations`)  
**Button**: Pencil icon (🖊️) in Actions column  
**Visibility**: Only for DRAFT quotations

---

## 🔧 WHAT CAN BE EDITED?

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| **Margin (%)** | Number | 0-100 | Profit margin percentage |
| **Discount ($)** | Number | ≥ 0 | Discount amount in dollars |
| **Tax (%)** | Number | 0-100 | Tax percentage |
| **Important Notes** | Text | 0-4000 chars | Special instructions |

---

## 🚀 HOW TO USE?

### Step 1: Find a DRAFT Quotation
- Go to Quotations page
- Look for quotations with "DRAFT" status

### Step 2: Click Edit Button
- Click the pencil icon (🖊️) in Actions column
- Modal opens with current data

### Step 3: Make Changes
- Modify any field you want
- See character counter for notes

### Step 4: Save
- Click "Save Changes" button
- Wait for "Saving..." indicator
- Modal closes automatically on success

---

## ⚠️ IMPORTANT RULES

1. ✅ **Only DRAFT quotations can be edited**
2. ✅ **Pricing recalculates automatically**
3. ✅ **Changes are logged for audit**
4. ✅ **Version number increments**

---

## 🐛 TROUBLESHOOTING

### Edit Button Not Visible?
- Check quotation status (must be DRAFT)
- Refresh the page
- Check permissions (need quotations:update)

### Modal Won't Open?
- Check browser console for errors
- Try refreshing the page
- Clear browser cache

### Save Button Not Working?
- Check validation errors (red text)
- Ensure values are in valid range
- Check network connection

### Changes Not Saving?
- Verify quotation is still DRAFT
- Check API response in Network tab
- Contact support if error persists

---

## 📱 KEYBOARD SHORTCUTS

| Key | Action |
|-----|--------|
| `Esc` | Close modal |
| `Tab` | Navigate fields |
| `Enter` | Submit form (when focused on input) |

---

## 🎨 UI ELEMENTS

### Edit Button
- **Icon**: Pencil (🖊️)
- **Color**: Blue
- **Location**: Actions column (rightmost)
- **Tooltip**: "Edit quotation"

### Modal
- **Title**: "Edit Quotation"
- **Subtitle**: Quote number + Customer name
- **Size**: Medium (max-w-2xl)
- **Backdrop**: Dark with blur

### Buttons
- **Save**: Blue, right side
- **Cancel**: Gray, left side
- **Close (X)**: Top-right corner

---

## 📊 VALIDATION RULES

### Margin (%)
- ✅ Must be between 0 and 100
- ✅ Can have decimals (e.g., 15.5)
- ❌ Cannot be negative

### Discount ($)
- ✅ Must be 0 or positive
- ✅ Can have decimals (e.g., 99.99)
- ❌ Cannot be negative

### Tax (%)
- ✅ Must be between 0 and 100
- ✅ Can have decimals (e.g., 18.5)
- ❌ Cannot be negative

### Important Notes
- ✅ Optional field
- ✅ Max 4000 characters
- ✅ Supports line breaks

---

## 🔄 WHAT HAPPENS AFTER SAVE?

1. **API Call**: PATCH /api/quotations/:id
2. **Backend**: Recalculates pricing
3. **Database**: Updates quotation record
4. **Version Log**: Creates new version entry
5. **UI Update**: Refreshes quotation in list
6. **Modal**: Closes automatically

---

## 💡 PRO TIPS

1. **Quick Edit**: Double-check values before saving
2. **Notes**: Use notes for special customer requests
3. **Margin**: Higher margin = more profit
4. **Discount**: Applied before tax calculation
5. **Tax**: Applied after discount

---

## 📞 SUPPORT

**Issue?** Check:
1. Browser console (F12)
2. Network tab for API errors
3. Quotation status (must be DRAFT)
4. Your permissions

**Still stuck?** Contact dev team with:
- Screenshot of error
- Browser console logs
- Steps to reproduce

---

## 🎓 TRAINING RESOURCES

- **Full Documentation**: `QUOTATION_EDIT_FEATURE_SUMMARY.md`
- **Testing Guide**: `QUOTATION_EDIT_TESTING_GUIDE.md`
- **Integration Details**: `QUOTATION_EDIT_INTEGRATION_CHECKLIST.md`

---

## 📅 VERSION INFO

**Feature**: Quotation Edit & Update  
**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2025  

---

## ✅ QUICK CHECKLIST

Before editing a quotation:
- [ ] Quotation status is DRAFT
- [ ] You have edit permissions
- [ ] You know what changes to make
- [ ] You've reviewed current values

After editing:
- [ ] Changes saved successfully
- [ ] Modal closed
- [ ] List updated
- [ ] No errors shown

---

**Need more help?** Read the full documentation or contact support.
