# CRM Package Schema Compatibility Analysis

## Current Status

The existing CRM system uses the `packages` table for quotation generation and package management. The CMS system needs to use the same table for website display, creating a shared dependency.

---

## Analysis of CRM Package Usage

### Current CRM Package Fields (from packages.service.js)
```javascript
{
  id, name, destination, duration,
  baseCost, markupPercent, startingPrice,
  packageKind, customServices,
  visaDetails, paymentTerms,
  inclusions, exclusions, itinerary,
  hotelDetails, validFrom, validTo,
  cancellationPolicy, packageCategory,
  status, bannerImageUrl, galleryImageUrls,
  metaTitle, metaDescription, keywords,
  publishToWebsite, websiteSlug,
  websiteLastSyncedAt, isSoldOut,
  createdBy, updatedBy, createdAt, updatedAt
}
```

### CRM Package Operations
1. **Create**: Creates new packages with pricing calculations
2. **Update**: Updates package details and pricing
3. **Publish**: Marks packages for website display (`publish_to_website = true`)
4. **List**: Filters packages by status, category, etc.
5. **Enquiry**: Links package enquiries to leads

---

## CMS Requirements vs CRM Schema

### ✅ Already Compatible Fields
- `name`, `destination`, `duration`
- `starting_price` (displayed on website)
- `inclusions`, `exclusions`, `itinerary`
- `banner_image_url`, `gallery_image_urls`
- `meta_title`, `meta_description`
- `publish_to_website` (CMS filter flag)
- `website_slug` (for URL routing)
- `is_sold_out` (display status)

### ⚠️ Missing Fields for CMS
The current schema is **MISSING** these fields that CRM uses:
- `base_cost` - Used for pricing calculations
- `markup_percent` - Used for profit margins
- `package_kind` - Differentiates READY vs CUSTOMIZED
- `custom_services` - JSONB field for customized packages
- `visa_details` - Visa information
- `payment_terms` - Payment conditions
- `package_category` - Categorization
- `status` - Package status (DRAFT, ACTIVE, etc.)
- `keywords` - SEO keywords

---

## Required Schema Updates

### Option 1: Update cms-schema.sql (Recommended)
**Remove the incomplete `packages` table definition from cms-schema.sql**

The `packages` table should ONLY be defined in `main-db.sql` since it's the source of truth for both CRM and CMS.

### Option 2: Ensure main-db.sql has all fields
Verify that `main-db.sql` includes all fields that CRM currently uses.

---

## Recommended Actions

### 1. ✅ DO NOT modify packages table in CMS schema
The cms-schema.sql should NOT redefine the `packages` table. It should only create:
- `main_packages` (CMS hierarchy layer)
- `destination_package_map` (CMS relationships)
- `sub_packages` (CMS variants)

### 2. ✅ CRM Backend Updates Required
**YES, you need to update the CRM backend** to ensure compatibility:

#### Update Required in `main-db.sql`:
```sql
-- Ensure packages table has all CRM fields
ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_kind VARCHAR(20) DEFAULT 'READY';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS custom_services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS visa_details TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_category VARCHAR(30);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS keywords TEXT;
```

### 3. ✅ CRM Service Layer - No Changes Needed
The CRM `packages.service.js` already handles:
- Pricing calculations (baseCost, markupPercent, startingPrice)
- Package types (packageKind)
- Publishing to website (publishToWebsite flag)
- Soft deletes (is_deleted)

**No code changes required** if schema is updated correctly.

### 4. ✅ CMS Backend - New Service Layer
Create a separate CMS package service that:
- Reads from `packages` WHERE `publish_to_website = true`
- Creates entries in `main_packages`
- Maps packages to destinations via `destination_package_map`
- Manages sub-packages via `sub_packages`

---

## Package Workflow After Updates

### CRM Workflow (Unchanged)
```
1. CRM creates package with full details
2. Sets pricing (baseCost, markupPercent, startingPrice)
3. Sets status (DRAFT, ACTIVE, etc.)
4. Optionally marks publish_to_website = true
5. Package available for quotations
```

### CMS Workflow (New)
```
1. CMS queries packages WHERE publish_to_website = true
2. CMS admin creates main_package entry
3. CMS admin maps to destination(s)
4. CMS admin adds sub-packages if needed
5. Package visible on Get2Vacation website
```

### Website Display Flow
```
User visits destination page
    ↓
API queries destination_package_map
    ↓
Fetches main_packages for destination
    ↓
Joins with packages table
    ↓
Filters WHERE publish_to_website = true AND is_deleted = false
    ↓
Returns package details to frontend
```

---

## Migration Steps

### Step 1: Update main-db.sql
Add missing columns to `packages` table (see SQL above)

### Step 2: Run Migration
```bash
psql -U your_user -d your_database -f main-db.sql
```

### Step 3: Verify CRM Still Works
Test CRM package operations:
- Create package
- Update package
- Generate quotation
- Publish to website

### Step 4: Deploy CMS Schema
```bash
psql -U your_user -d your_database -f cms-schema.sql
```

### Step 5: Build CMS Backend
Implement CMS package service and routes

### Step 6: Build CMS Frontend
Create package management screens

---

## Testing Checklist

### CRM Tests
- [ ] Create new package in CRM
- [ ] Update existing package
- [ ] Generate quotation from package
- [ ] Mark package as sold out
- [ ] Publish package to website
- [ ] Verify package enquiries work

### CMS Tests
- [ ] View published packages in CMS
- [ ] Create main package entry
- [ ] Map package to destination
- [ ] Add sub-packages
- [ ] Verify website displays correctly

### Integration Tests
- [ ] CRM publishes package → CMS sees it
- [ ] CMS maps package → Website displays it
- [ ] CRM updates package → Website reflects changes
- [ ] CRM unpublishes → Website hides it

---

## Conclusion

**YES, you need to update the CRM backend schema**, but:
- ✅ Schema changes only (add missing columns)
- ✅ No code changes in CRM service layer
- ✅ CRM functionality remains intact
- ✅ CMS builds on top without breaking CRM

The architecture is designed to be **additive**, not destructive. The CMS layer sits on top of the existing CRM package system without modifying core CRM behavior.
