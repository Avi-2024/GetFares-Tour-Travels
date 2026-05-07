# 🧪 QUOTATION EDIT FEATURE - TESTING GUIDE

## 🎯 FEATURE OVERVIEW
Users can now edit DRAFT quotations directly from the Quotations List page using a modal dialog.

---

## ✅ PRE-REQUISITES

1. Login to the CRM system
2. Navigate to **Quotations** page (`/quotations`)
3. Ensure you have at least one quotation with **DRAFT** status
   - If not, create a new quotation using "Create Quotation" button

---

## 🧪 TEST CASES

### TEST 1: Edit Button Visibility
**Steps**:
1. Go to Quotations page
2. Look at the Actions column for each quotation

**Expected Result**:
- ✅ Edit button (pencil icon) visible ONLY for DRAFT quotations
- ✅ Edit button NOT visible for SENT, APPROVED, REJECTED, or EXPIRED quotations

**Status**: [ ] PASS [ ] FAIL

---

### TEST 2: Open Edit Modal
**Steps**:
1. Click Edit button on a DRAFT quotation

**Expected Result**:
- ✅ Modal opens with title "Edit Quotation"
- ✅ Quote number and customer name displayed in subtitle
- ✅ Form fields are pre-filled with existing data
- ✅ Destination and Current Total shown in read-only section

**Status**: [ ] PASS [ ] FAIL

---

### TEST 3: Edit Margin
**Steps**:
1. Open edit modal
2. Change Margin (%) field to `20`
3. Click "Save Changes"

**Expected Result**:
- ✅ Button shows "Saving..." with spinner
- ✅ Modal closes after successful save
- ✅ Quotation list updates with new margin value
- ✅ No page refresh required

**Status**: [ ] PASS [ ] FAIL

---

### TEST 4: Edit Discount
**Steps**:
1. Open edit modal
2. Change Discount ($) field to `500`
3. Click "Save Changes"

**Expected Result**:
- ✅ Discount saved successfully
- ✅ Total amount recalculated automatically
- ✅ Modal closes

**Status**: [ ] PASS [ ] FAIL

---

### TEST 5: Edit Tax
**Steps**:
1. Open edit modal
2. Change Tax (%) field to `18`
3. Click "Save Changes"

**Expected Result**:
- ✅ Tax saved successfully
- ✅ Total amount recalculated with new tax
- ✅ Modal closes

**Status**: [ ] PASS [ ] FAIL

---

### TEST 6: Edit Important Notes
**Steps**:
1. Open edit modal
2. Add text in "Important Notes" field: "Customer requested early check-in"
3. Click "Save Changes"

**Expected Result**:
- ✅ Notes saved successfully
- ✅ Character counter updates (shows X / 4000)
- ✅ Modal closes

**Status**: [ ] PASS [ ] FAIL

---

### TEST 7: Validation - Negative Margin
**Steps**:
1. Open edit modal
2. Enter `-10` in Margin (%) field
3. Click "Save Changes"

**Expected Result**:
- ✅ Error message: "Margin must be between 0 and 100"
- ✅ Modal stays open
- ✅ No API call made

**Status**: [ ] PASS [ ] FAIL

---

### TEST 8: Validation - Margin > 100
**Steps**:
1. Open edit modal
2. Enter `150` in Margin (%) field
3. Click "Save Changes"

**Expected Result**:
- ✅ Error message: "Margin must be between 0 and 100"
- ✅ Modal stays open

**Status**: [ ] PASS [ ] FAIL

---

### TEST 9: Validation - Negative Discount
**Steps**:
1. Open edit modal
2. Enter `-100` in Discount ($) field
3. Click "Save Changes"

**Expected Result**:
- ✅ Error message: "Discount cannot be negative"
- ✅ Modal stays open

**Status**: [ ] PASS [ ] FAIL

---

### TEST 10: Validation - Invalid Tax
**Steps**:
1. Open edit modal
2. Enter `150` in Tax (%) field
3. Click "Save Changes"

**Expected Result**:
- ✅ Error message: "Tax percent must be between 0 and 100"
- ✅ Modal stays open

**Status**: [ ] PASS [ ] FAIL

---

### TEST 11: Cancel Button
**Steps**:
1. Open edit modal
2. Change some fields
3. Click "Cancel" button

**Expected Result**:
- ✅ Modal closes immediately
- ✅ No changes saved
- ✅ Quotation list unchanged

**Status**: [ ] PASS [ ] FAIL

---

### TEST 12: Close Button (X)
**Steps**:
1. Open edit modal
2. Change some fields
3. Click X button in top-right corner

**Expected Result**:
- ✅ Modal closes immediately
- ✅ No changes saved

**Status**: [ ] PASS [ ] FAIL

---

### TEST 13: Edit Non-DRAFT Quotation
**Steps**:
1. Try to find Edit button on SENT/APPROVED/REJECTED quotation

**Expected Result**:
- ✅ Edit button NOT visible
- ✅ Only View, WhatsApp, and Reject buttons visible

**Status**: [ ] PASS [ ] FAIL

---

### TEST 14: Data Persistence
**Steps**:
1. Edit a quotation and save
2. Refresh the page (F5)
3. Check the quotation details

**Expected Result**:
- ✅ Changes are persisted
- ✅ Updated margin/discount/tax visible
- ✅ Updated total amount visible

**Status**: [ ] PASS [ ] FAIL

---

### TEST 15: Mobile View
**Steps**:
1. Open page on mobile device or resize browser to mobile width
2. Find a DRAFT quotation
3. Click Edit button

**Expected Result**:
- ✅ Edit button visible in mobile card view
- ✅ Modal opens and is fully responsive
- ✅ All fields accessible and usable
- ✅ Buttons properly sized for touch

**Status**: [ ] PASS [ ] FAIL

---

### TEST 16: Dark Mode
**Steps**:
1. Enable dark mode in CRM
2. Open edit modal

**Expected Result**:
- ✅ Modal background is dark
- ✅ Text is readable (light color)
- ✅ Input fields have dark background
- ✅ Borders visible in dark mode

**Status**: [ ] PASS [ ] FAIL

---

### TEST 17: Loading State
**Steps**:
1. Open edit modal
2. Make changes
3. Click "Save Changes"
4. Observe button during API call

**Expected Result**:
- ✅ Button text changes to "Saving..."
- ✅ Spinner icon visible
- ✅ Button disabled during save
- ✅ Cannot click Cancel during save

**Status**: [ ] PASS [ ] FAIL

---

### TEST 18: Network Error Handling
**Steps**:
1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Try to save changes

**Expected Result**:
- ✅ Error message displayed: "Failed to update quotation"
- ✅ Modal stays open
- ✅ User can retry after going online

**Status**: [ ] PASS [ ] FAIL

---

### TEST 19: Backend Validation
**Steps**:
1. Open edit modal
2. Enter valid data
3. Save successfully
4. Try to edit the same quotation after it's been SENT

**Expected Result**:
- ✅ Edit button disappears after status changes to SENT
- ✅ Cannot edit non-DRAFT quotations

**Status**: [ ] PASS [ ] FAIL

---

### TEST 20: Multiple Edits
**Steps**:
1. Edit a quotation and save
2. Immediately edit the same quotation again
3. Make different changes
4. Save again

**Expected Result**:
- ✅ Both edits save successfully
- ✅ Latest changes reflected
- ✅ No conflicts or errors

**Status**: [ ] PASS [ ] FAIL

---

## 🐛 BUG REPORTING TEMPLATE

If you find a bug, report it with:

```
**Bug Title**: [Short description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots**:
[Attach if applicable]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Screen Size: [Desktop/Tablet/Mobile]
- Dark Mode: [Yes/No]

**Console Errors**:
[Copy any errors from browser console]
```

---

## ✅ SIGN-OFF

**Tester Name**: ___________________  
**Date**: ___________________  
**Overall Status**: [ ] PASS [ ] FAIL  
**Comments**: ___________________

---

## 📊 SUMMARY

Total Test Cases: 20  
Passed: ___  
Failed: ___  
Blocked: ___  

**Ready for Production**: [ ] YES [ ] NO
