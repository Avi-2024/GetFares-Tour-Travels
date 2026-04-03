# Supplier Finance Data Fix

## Problem
The finance system was showing dummy/incomplete data for suppliers because the seed data only included basic supplier information (name, email, phone, country) but was missing critical financial fields required by the finance system.

## Missing Fields
The following fields were not populated in the original seed data:
- `pan_number` - PAN number (for Indian suppliers)
- `gst_number` - GST number (for Indian suppliers)
- `address` / `address_line` - Physical address
- `invoice_beneficiary_name` - Name for invoicing
- `invoice_bank_name` - Bank name for invoices
- `invoice_account_number` - Account number
- `invoice_ifsc_swift` - IFSC/SWIFT code
- `invoice_upi_id` - UPI ID (for Indian suppliers)
- `bank_name` - Primary bank name
- `bank_account_number` - Primary account number
- `ifsc_code` - IFSC code
- `supplier_currency` - Currency used by supplier
- `contract_url` - Contract document URL
- `rate_valid_until` - Rate validity date
- `payment_deadline_date` - Payment deadline
- `production_commitment` - Service commitment details

## Solution
Updated the seed data to include complete financial information for all suppliers:

### 1. Updated Seed File
- **File**: `backend/database/seed-dummy-data.sql`
- **Changes**: Added all financial fields for 5 test suppliers
- **Suppliers**: Bali Tours, Maldives Resorts, Dubai Tourism, Singapore Tours, Goa Beach Resorts

### 2. Added Supplier Payables
Created realistic supplier payable scenarios:
- **Paid**: Bali Tours - ₹150,000 (fully paid)
- **Partial**: Maldives Resorts - ₹350,000 (₹175,000 paid, ₹175,000 pending)
- **Pending**: Dubai Tourism - ₹120,000 (unpaid, due in 7 days)

### 3. Created Reseed Script
- **File**: `backend/scripts/reseed-suppliers.js`
- **Purpose**: Quick script to update existing database with complete supplier data
- **Safe**: Uses transactions and handles conflicts

## How to Fix Your Database

### Option 1: Reseed Entire Database (Recommended for fresh start)
```bash
cd backend
npm run db:migrate
npm run db:seed:rbac
npm run db:seed
```

### Option 2: Update Only Suppliers (Preserves other data)
```bash
cd backend
node scripts/reseed-suppliers.js
```

### Option 3: Manual SQL Update
Run the updated sections from `seed-dummy-data.sql`:
- Section 11: INSERT SUPPLIERS
- Section 12: INSERT SUPPLIER PAYABLES

## Verification
After running the fix, verify the data:

```sql
-- Check supplier financial data
SELECT 
  name, 
  supplier_currency, 
  invoice_bank_name, 
  invoice_account_number,
  pan_number,
  gst_number
FROM suppliers;

-- Check supplier payables
SELECT 
  sp.id,
  s.name as supplier_name,
  sp.payable_amount,
  sp.paid_amount,
  sp.status,
  sp.due_date
FROM supplier_payables sp
JOIN suppliers s ON s.id = sp.supplier_id;
```

## Expected Results
After the fix:
- ✅ All suppliers have complete bank account details
- ✅ Indian suppliers have PAN and GST numbers
- ✅ All suppliers have invoice information
- ✅ Contract URLs and validity dates are set
- ✅ Supplier payables show realistic financial scenarios
- ✅ Finance system displays actual data instead of dummy placeholders

## Files Modified
1. `backend/database/seed-dummy-data.sql` - Updated supplier seed data
2. `backend/scripts/reseed-suppliers.js` - New reseed script (created)
3. `backend/docs/SUPPLIER_FINANCE_FIX.md` - This documentation (created)

## Notes
- The fix maintains backward compatibility
- Existing suppliers will be updated with ON CONFLICT DO UPDATE
- Foreign key constraints are respected (payables deleted before suppliers)
- All changes are wrapped in transactions for safety
