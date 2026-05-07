# Quick Implementation Guide - Finance Fields in Quotation Builder

## Step 1: Add Finance State (Add after line ~50 in QuotationBuilderPage.tsx)

```typescript
// Add this state after the existing form state
const [finance, setFinance] = useState({
  supplierCost: 0,
  supplierTaxPercent: 5,
  supplierTaxAmount: 0,
  markupPercent: 20,
  markupAmount: 0,
  serviceFeeAmount: 0,
  gstPercent: 18,
  gstAmount: 0,
  tcsPercent: 5,
  tcsAmount: 0,
  discount: 0,
  totalSaleValue: 0
});

// Add currency state
const [currencies, setCurrencies] = useState({
  clientCurrency: 'INR',
  costCurrency: 'INR',
  supplierCurrency: 'INR'
});
```

## Step 2: Add Auto-Calculation Effect

```typescript
// Add this useEffect to auto-calculate finance values
useEffect(() => {
  // Calculate supplier cost from service rows
  const totalSupplierCost = serviceRows.reduce((sum, row) => 
    sum + (Number(row.baseCost) || 0), 0
  );
  
  // Calculate each component
  const supplierTaxAmount = (totalSupplierCost * finance.supplierTaxPercent) / 100;
  const markupAmount = (totalSupplierCost * finance.markupPercent) / 100;
  const subtotal = totalSupplierCost + supplierTaxAmount + markupAmount + finance.serviceFeeAmount;
  const gstAmount = (subtotal * finance.gstPercent) / 100;
  const tcsAmount = (subtotal * finance.tcsPercent) / 100;
  const totalSaleValue = subtotal + gstAmount + tcsAmount - finance.discount;
  
  setFinance(prev => ({
    ...prev,
    supplierCost: totalSupplierCost,
    supplierTaxAmount: Number(supplierTaxAmount.toFixed(2)),
    markupAmount: Number(markupAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    tcsAmount: Number(tcsAmount.toFixed(2)),
    totalSaleValue: Number(totalSaleValue.toFixed(2))
  }));
}, [
  serviceRows, 
  finance.supplierTaxPercent, 
  finance.markupPercent, 
  finance.serviceFeeAmount, 
  finance.gstPercent, 
  finance.tcsPercent, 
  finance.discount
]);
```

## Step 3: Add Finance UI Section (Replace commented section around line 105)

```typescript
<SurfaceCard>
  <div className='mb-3 flex items-center justify-between'>
    <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
      Cost & Profit Breakdown
    </h2>
    <span className='text-xs text-gray-500 dark:text-gray-400'>
      Auto-calculated from services
    </span>
  </div>

  {/* Currency Selection */}
  <div className='mb-4 grid grid-cols-1 md:grid-cols-3 gap-3'>
    <div>
      <label className='field-label'>Client Currency</label>
      <select 
        className='field-input'
        value={currencies.clientCurrency}
        onChange={e => setCurrencies(p => ({ ...p, clientCurrency: e.target.value }))}
      >
        <option value="INR">INR - Indian Rupee</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="AED">AED - UAE Dirham</option>
        <option value="CAD">CAD - Canadian Dollar</option>
        <option value="AUD">AUD - Australian Dollar</option>
      </select>
    </div>
    <div>
      <label className='field-label'>Cost Currency</label>
      <select 
        className='field-input'
        value={currencies.costCurrency}
        onChange={e => setCurrencies(p => ({ ...p, costCurrency: e.target.value }))}
      >
        <option value="INR">INR - Indian Rupee</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="AED">AED - UAE Dirham</option>
      </select>
    </div>
    <div>
      <label className='field-label'>Supplier Currency</label>
      <select 
        className='field-input'
        value={currencies.supplierCurrency}
        onChange={e => setCurrencies(p => ({ ...p, supplierCurrency: e.target.value }))}
      >
        <option value="INR">INR - Indian Rupee</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="AED">AED - UAE Dirham</option>
      </select>
    </div>
  </div>

  {/* Cost Inputs */}
  <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
    <div>
      <label className='field-label'>Supplier Cost</label>
      <input
        type='number'
        className='field-input bg-gray-100'
        value={finance.supplierCost}
        readOnly
        title='Auto-calculated from service rows'
      />
      <p className='mt-1 text-xs text-gray-500'>Auto-calculated</p>
    </div>
    
    <div>
      <label className='field-label'>Supplier Tax %</label>
      <input
        type='number'
        min='0'
        max='100'
        step='0.1'
        className='field-input'
        value={finance.supplierTaxPercent}
        onChange={e => setFinance(p => ({ ...p, supplierTaxPercent: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>
        Amount: {currencies.costCurrency} {finance.supplierTaxAmount.toFixed(2)}
      </p>
    </div>
    
    <div>
      <label className='field-label'>Markup % (Profit)</label>
      <input
        type='number'
        min='0'
        max='100'
        step='0.1'
        className='field-input'
        value={finance.markupPercent}
        onChange={e => setFinance(p => ({ ...p, markupPercent: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>
        Amount: {currencies.costCurrency} {finance.markupAmount.toFixed(2)}
      </p>
    </div>
    
    <div>
      <label className='field-label'>Service Fee</label>
      <input
        type='number'
        min='0'
        step='0.01'
        className='field-input'
        value={finance.serviceFeeAmount}
        onChange={e => setFinance(p => ({ ...p, serviceFeeAmount: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>Fixed amount</p>
    </div>
  </div>

  {/* Tax Inputs */}
  <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
    <div>
      <label className='field-label'>GST %</label>
      <input
        type='number'
        min='0'
        max='100'
        step='0.1'
        className='field-input'
        value={finance.gstPercent}
        onChange={e => setFinance(p => ({ ...p, gstPercent: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>
        Amount: {currencies.costCurrency} {finance.gstAmount.toFixed(2)}
      </p>
    </div>
    
    <div>
      <label className='field-label'>TCS %</label>
      <input
        type='number'
        min='0'
        max='100'
        step='0.1'
        className='field-input'
        value={finance.tcsPercent}
        onChange={e => setFinance(p => ({ ...p, tcsPercent: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>
        Amount: {currencies.costCurrency} {finance.tcsAmount.toFixed(2)}
      </p>
    </div>
    
    <div>
      <label className='field-label'>Discount</label>
      <input
        type='number'
        min='0'
        step='0.01'
        className='field-input'
        value={finance.discount}
        onChange={e => setFinance(p => ({ ...p, discount: Number(e.target.value) }))}
      />
      <p className='mt-1 text-xs text-gray-500'>Flat discount</p>
    </div>
    
    <div>
      <label className='field-label'>Total Sale Value</label>
      <input
        type='number'
        className='field-input bg-blue-50 font-semibold'
        value={finance.totalSaleValue}
        readOnly
      />
      <p className='mt-1 text-xs text-blue-600'>Final customer price</p>
    </div>
  </div>

  {/* Summary Cards */}
  <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
    <div className='rounded-lg border border-blue-200 bg-blue-50 p-3'>
      <div className='text-xs text-gray-600'>Supplier Cost</div>
      <div className='text-lg font-semibold text-blue-700'>
        {currencies.costCurrency} {finance.supplierCost.toFixed(2)}
      </div>
    </div>
    
    <div className='rounded-lg border border-green-200 bg-green-50 p-3'>
      <div className='text-xs text-gray-600'>Profit (Markup)</div>
      <div className='text-lg font-semibold text-green-700'>
        {currencies.costCurrency} {finance.markupAmount.toFixed(2)}
      </div>
      <div className='text-xs text-gray-500'>
        {finance.supplierCost > 0 
          ? `${((finance.markupAmount / finance.supplierCost) * 100).toFixed(1)}% margin`
          : '0% margin'
        }
      </div>
    </div>
    
    <div className='rounded-lg border border-amber-200 bg-amber-50 p-3'>
      <div className='text-xs text-gray-600'>Total Tax</div>
      <div className='text-lg font-semibold text-amber-700'>
        {currencies.costCurrency} {(finance.supplierTaxAmount + finance.gstAmount + finance.tcsAmount).toFixed(2)}
      </div>
      <div className='text-xs text-gray-500'>
        GST + TCS + Supplier Tax
      </div>
    </div>
    
    <div className='rounded-lg border border-purple-200 bg-purple-50 p-3'>
      <div className='text-xs text-gray-600'>Final Price</div>
      <div className='text-lg font-semibold text-purple-700'>
        {currencies.costCurrency} {finance.totalSaleValue.toFixed(2)}
      </div>
      <div className='text-xs text-gray-500'>
        To customer
      </div>
    </div>
  </div>

  {/* Warning for low margin */}
  {finance.markupPercent < 10 && finance.supplierCost > 0 && (
    <div className='mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
      ⚠️ Warning: Markup is below 10%. This may require approval.
    </div>
  )}
</SurfaceCard>
```

## Step 4: Update API Payload (In handleSave or handleSubmit function)

```typescript
const handleSave = async () => {
  try {
    const payload = {
      leadId: leadId,
      quotationTitle: form.quotationTitle,
      destination: form.destination,
      durationNights: form.nights,
      durationDays: form.durationDays,
      durationLabel: previewDurationLabel,
      travelStartDate: form.travelStartDate,
      
      // Add finance fields
      supplierCost: finance.supplierCost,
      supplierTaxAmount: finance.supplierTaxAmount,
      markupAmount: finance.markupAmount,
      marginPercent: finance.markupPercent, // Backend expects this
      serviceFeeAmount: finance.serviceFeeAmount,
      gstAmount: finance.gstAmount,
      tcsAmount: finance.tcsAmount,
      totalSaleValue: finance.totalSaleValue,
      discount: finance.discount,
      
      // Add currency fields
      costCurrency: currencies.costCurrency,
      clientCurrency: currencies.clientCurrency,
      supplierCurrency: currencies.supplierCurrency,
      
      // Existing fields
      components: serviceRows.map(row => ({
        itemType: row.type,
        description: row.description,
        cost: row.baseCost
      })),
      
      builderSnapshot: {
        content: {
          inclusions: form.inclusions,
          exclusions: form.exclusions,
          hotelDetails: form.hotelDetails,
          visaDetails: form.visaDetails,
          paymentTerms: form.paymentTerms,
          cancellationPolicy: form.cancellationPolicy
        },
        itineraryItems: itineraryItems,
        lead: leadData,
        currency: currencies.clientCurrency,
        pricing: {
          supplierCost: finance.supplierCost,
          markupPercent: finance.markupPercent,
          totalSaleValue: finance.totalSaleValue
        }
      }
    };
    
    const response = await api.post('/api/quotations', payload);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## Step 5: Fetch Suppliers (Add near other data fetching)

```typescript
// Add state for suppliers
const [suppliers, setSuppliers] = useState([]);

// Fetch suppliers on mount
useEffect(() => {
  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/api/suppliers?limit=300');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };
  
  fetchSuppliers();
}, []);
```

## Step 6: Add Supplier Selection to Service Rows (Optional Enhancement)

```typescript
// Update serviceRows structure to include supplier
const [serviceRows, setServiceRows] = useState([
  {
    id: 'acc-1',
    type: 'ACCOMMODATION',
    description: '',
    baseCost: 0,
    markup: 0,
    sellValue: 0,
    supplierId: null,
    supplierName: ''
  }
]);

// In the service row rendering, add supplier dropdown
<div>
  <label className='field-label'>Supplier</label>
  <select
    className='field-input'
    value={row.supplierId || ''}
    onChange={e => {
      const supplier = suppliers.find(s => s.id === e.target.value);
      updateServiceRow(index, {
        supplierId: e.target.value,
        supplierName: supplier?.name || ''
      });
    }}
  >
    <option value="">Select Supplier</option>
    {suppliers
      .filter(s => s.isActive !== false)
      .map(s => (
        <option key={s.id} value={s.id}>
          {s.name} ({s.supplierCurrency || 'INR'})
        </option>
      ))
    }
  </select>
</div>
```

## Step 7: Testing Checklist

### Manual Testing
1. [ ] Open quotation builder
2. [ ] Add service rows with costs
3. [ ] Verify supplier cost auto-calculates
4. [ ] Change markup % and verify profit updates
5. [ ] Change GST/TCS % and verify tax updates
6. [ ] Add discount and verify total updates
7. [ ] Save quotation
8. [ ] Check database that finance fields are saved
9. [ ] Open Finance System → Cost Breakup tab
10. [ ] Verify quotation appears with correct values

### API Testing
```bash
# Test quotation creation with finance fields
curl -X POST http://localhost:3000/api/quotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "leadId": "LEAD_UUID",
    "supplierCost": 10000,
    "supplierTaxAmount": 500,
    "markupAmount": 2000,
    "marginPercent": 20,
    "serviceFeeAmount": 500,
    "gstAmount": 2340,
    "tcsAmount": 650,
    "totalSaleValue": 15990,
    "costCurrency": "INR",
    "clientCurrency": "INR",
    "supplierCurrency": "INR",
    "components": [
      {
        "itemType": "ACCOMMODATION",
        "description": "Hotel booking",
        "cost": 5000
      }
    ]
  }'
```

## Step 8: Validation Rules

Add these validations before saving:

```typescript
const validateFinance = () => {
  const errors = [];
  
  if (finance.supplierCost <= 0) {
    errors.push('Supplier cost must be greater than 0');
  }
  
  if (finance.markupPercent < 0 || finance.markupPercent > 100) {
    errors.push('Markup percent must be between 0 and 100');
  }
  
  if (finance.gstPercent < 0 || finance.gstPercent > 100) {
    errors.push('GST percent must be between 0 and 100');
  }
  
  if (finance.discount > finance.totalSaleValue) {
    errors.push('Discount cannot exceed total sale value');
  }
  
  if (finance.markupPercent < 10) {
    // Warning, not error
    console.warn('Low margin - may require approval');
  }
  
  return errors;
};

// In handleSave
const errors = validateFinance();
if (errors.length > 0) {
  alert('Validation errors:\n' + errors.join('\n'));
  return;
}
```

## Step 9: Default Values from Lead/Customer

```typescript
// When lead data loads, set default currency
useEffect(() => {
  if (leadData) {
    setCurrencies(prev => ({
      ...prev,
      clientCurrency: leadData.clientCurrency || leadData.currency || 'INR'
    }));
  }
}, [leadData]);
```

## Step 10: Profit Margin Warning Component

```typescript
const ProfitMarginWarning = ({ marginPercent, minMargin = 10 }) => {
  if (marginPercent >= minMargin) return null;
  
  return (
    <div className='mt-3 rounded-lg border-2 border-red-300 bg-red-50 p-4'>
      <div className='flex items-start gap-3'>
        <div className='text-2xl'>⚠️</div>
        <div>
          <div className='font-semibold text-red-800'>
            Low Profit Margin Alert
          </div>
          <div className='text-sm text-red-700 mt-1'>
            Current margin: {marginPercent.toFixed(1)}% (Minimum: {minMargin}%)
          </div>
          <div className='text-sm text-red-600 mt-1'>
            This quotation may require manager approval before sending.
          </div>
        </div>
      </div>
    </div>
  );
};

// Use in the finance section
<ProfitMarginWarning marginPercent={finance.markupPercent} minMargin={10} />
```

---

## Quick Start Commands

```bash
# 1. Backup current file
cp crm-frontend/src/pages/Quotation/QuotationBuilderPage.tsx crm-frontend/src/pages/Quotation/QuotationBuilderPage.tsx.backup

# 2. Make changes following steps above

# 3. Test locally
cd crm-frontend
npm run dev

# 4. Test API integration
# Open browser to http://localhost:5173/quotations/new
# Create a test quotation with finance fields

# 5. Verify in database
# Check quotations table for the new record
# Verify finance fields are populated

# 6. Check finance report
# Open http://localhost:5173/finance-system
# Go to Cost Breakup tab
# Verify the quotation appears with correct values
```

---

## Troubleshooting

### Issue: Finance fields not saving
**Solution**: Check browser console for API errors. Verify payload structure matches backend expectations.

### Issue: Auto-calculation not working
**Solution**: Check useEffect dependencies. Ensure all finance state changes trigger recalculation.

### Issue: Currency not displaying correctly
**Solution**: Verify currency state is passed to all components. Check that backend returns currency fields.

### Issue: Supplier dropdown empty
**Solution**: Check suppliers API endpoint. Verify suppliers are active (isActive = true).

---

## Next Steps After Implementation

1. **Test with Finance Team**: Get feedback on calculations and UI
2. **Add Exchange Rates**: Implement currency conversion if needed
3. **Add Approval Workflow**: Implement manager approval for low margins
4. **Add Audit Trail**: Track who changed finance fields and when
5. **Add Bulk Import**: Allow importing quotations with finance data from Excel

---

**Implementation Time**: 4-6 hours for experienced developer  
**Testing Time**: 2-3 hours  
**Total**: 1 working day

**Priority**: CRITICAL - Blocks finance reporting
