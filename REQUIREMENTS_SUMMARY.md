# Requirements Summary

## 1. Approve Button in Bookings List ✅ COMPLETED

**Requirement**: When a booking is already approved (status = "confirmed"), the approve button should:
- Change to green background color
- Show "Booking is already approved" tooltip
- Be disabled and not clickable

**Implementation**: Updated both mobile and desktop views in BookingsPage.tsx to show green styling when approved.

---

## 2. Currency Symbol Display Across Pages

**Requirement**: When creating a lead with a specific currency (e.g., AED), that currency symbol should be used consistently across:
- Lead details page
- Quotation pages
- Booking pages  
- Payment pages

**Implementation**: 
- Created `getCurrencySymbol()` and `formatCurrency()` utility functions in `crm-frontend/src/utils/currency.ts`
- Added currency symbol mapping for major currencies (INR ₹, USD $, EUR €, GBP £, AED د.إ, etc.)

**Usage Example**:
```typescript
import { getCurrencySymbol, formatCurrency } from '../../utils/currency'

// Get symbol only
const symbol = getCurrencySymbol('AED') // returns 'د.إ'

// Format amount with currency
const formatted = formatCurrency(150000, 'AED') // returns 'د.إ 1,50,000'
```

**Next Steps**: Apply these functions in:
- Quotation detail/list pages
- Booking detail/list pages
- Payment pages
- Replace hardcoded currency symbols with dynamic ones based on `clientCurrency` field

---

## 3. Save From/To Date Filters in Database

**Requirement**: In bookings list page, save the from_date and to_date filter values to database so they persist across sessions.

**Current Status**: ⚠️ NEEDS BACKEND SUPPORT

**Required Changes**:
1. **Backend**: Create user preferences table or add columns to users table:
   ```sql
   ALTER TABLE users ADD COLUMN booking_filters_from_date DATE;
   ALTER TABLE users ADD COLUMN booking_filters_to_date DATE;
   ```

2. **Backend API**: Add endpoints:
   - `GET /api/users/preferences` - Get user filter preferences
   - `PUT /api/users/preferences` - Save user filter preferences

3. **Frontend**: Update BookingsPage.tsx to:
   - Load saved filters on component mount
   - Save filters when they change (with debounce)

---

## 4. Payment Image Upload & Display

**Requirement**: When uploading a payment receipt image, it should be:
- Saved to database
- Displayed when editing the payment
- Prefilled in the edit form

**Current Status**: ⚠️ NEEDS IMPLEMENTATION

**Required Changes**:

### Backend:
1. Add `receipt_image_url` column to payments table:
   ```sql
   ALTER TABLE payments ADD COLUMN receipt_image_url TEXT;
   ```

2. Update payments API to accept file upload:
   - Use multer middleware for file handling
   - Upload to S3 using existing s3Service
   - Store S3 URL in database

### Frontend:
1. Add file input to PaymentModal in FinanceSystem.tsx
2. Show existing image when editing payment
3. Allow image preview before upload
4. Handle image upload in payment creation/update

**Example Implementation**:
```typescript
// In PaymentModal
const [imageFile, setImageFile] = useState<File | null>(null)
const [existingImageUrl, setExistingImageUrl] = useState<string>('')

// File input
<input 
  type="file" 
  accept="image/*"
  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
/>

// Show existing image
{existingImageUrl && (
  <img src={existingImageUrl} alt="Receipt" />
)}
```

---

## 5. Lead Creation Fields

**Requirement**: Ensure all required fields from lead creation are also available in lead view/edit.

**Status**: ✅ Already implemented in LeadDetails.tsx with qualification capture form including:
- PAN Number
- Client Currency
- Address
- Destination
- Travel Date
- Adults/Children count
- Budget
- Visa requirement
- Hotel category
- Travel purpose

---

## Priority Order:
1. ✅ Approve button styling - DONE
2. ✅ Currency utility functions - DONE  
3. ⚠️ Apply currency formatting across pages - IN PROGRESS
4. ⚠️ Payment image upload - NEEDS IMPLEMENTATION
5. ⚠️ Save date filters - NEEDS BACKEND SUPPORT
